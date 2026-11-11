-- Read-only Administrator performance aggregates. No payroll, RHPP or transaction writes.
CREATE OR REPLACE FUNCTION public.admin_work_performance_v1(p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if not exists(select 1 from public.profiles where user_id=auth.uid() and active and role='ADMIN') then
    raise exception 'Akses ditolak. Penilaian kinerja khusus Administrator.' using errcode='42501';
  end if;
  if p_from is null or p_to is null or p_to<p_from or p_to-p_from>365 then
    raise exception 'Pilih periode valid, maksimal 366 hari.' using errcode='22023';
  end if;
  with mapping(table_name,category,date_key) as (values
    ('chick_ins','PPL','arrived_on'),('recordings','PPL','recorded_on'),
    ('visits','PPL','visited_on'),('production_estimates','PPL','estimated_on'),
    ('logistics_shipments','LOGISTIK','shipment_date'),('logistics_returns','LOGISTIK','return_date'),
    ('logistics_external_shipments','LOGISTIK','shipment_date'),('logistics_external_returns','LOGISTIK','return_date'),
    ('logistics_mandiri_purchases','LOGISTIK','purchase_date'),('logistics_equipment_purchases','LOGISTIK','purchase_date'),
    ('warehouse_stock_shipments','LOGISTIK','shipment_date'),('finance_expedition_trips','LOGISTIK','trip_date'),
    ('marketing_contract_harvests','MARKETING','harvested_on'),('marketing_external_meat_purchases','MARKETING','purchase_date'),
    ('rhpp_real','KEUANGAN','received_on'),('bop','KEUANGAN','incurred_on'),('bop_outside','KEUANGAN','incurred_on'),
    ('barn_maintenance_costs','KEUANGAN','incurred_on'),('supplier_payments','KEUANGAN','paid_on'),
    ('advances','KEUANGAN','advanced_on'),('advance_payments','KEUANGAN','paid_on'),('abk_cycle_salaries','KEUANGAN','paid_on'),
    ('finance_expedition_invoices','KEUANGAN','invoice_date'),('finance_expedition_payments','KEUANGAN','paid_on'),
    ('finance_expedition_bop','KEUANGAN','incurred_on'),('finance_expedition_maintenance','KEUANGAN','incurred_on'),
    ('finance_mandiri_sales_receipts','KEUANGAN','received_on'),('finance_mandiri_supplier_payments','KEUANGAN','paid_on'),
    ('finance_asset_purchase_invoices','KEUANGAN','purchase_date'),('finance_stock_purchase_invoices','KEUANGAN','purchase_date'),
    ('finance_cash_requests','KEUANGAN','request_date')
  ), raw as (
    select a.id,a.actor,a.table_name,a.record_id,a.occurred_at,m.category,
      replace(a.action,'DB_','') as operation,
      (a.occurred_at at time zone 'Asia/Jakarta')::date as input_date,
      case when (a.new_data->>m.date_key) ~ '^\d{4}-\d{2}-\d{2}$' and pg_catalog.pg_input_is_valid(a.new_data->>m.date_key,'date') then (a.new_data->>m.date_key)::date end as business_date,
      a.old_data,a.new_data
    from public.audit_events a join mapping m on m.table_name=a.table_name
    where a.action in ('DB_INSERT','DB_UPDATE','DB_DELETE','INSERT','UPDATE','DELETE')
      and a.occurred_at >= (p_from::timestamp at time zone 'Asia/Jakarta')
      and a.occurred_at < ((p_to+1)::timestamp at time zone 'Asia/Jakarta')
  ), meaningful as (
    select * from raw r where r.operation<>'UPDATE' or (
      r.old_data is distinct from r.new_data and not exists (
        select 1 from public.audit_events i where i.table_name=r.table_name
          and i.record_id=r.record_id and i.actor is not distinct from r.actor
          and i.occurred_at=r.occurred_at and i.action in ('DB_INSERT','INSERT')
      )
    )
  ), dedup as (
    -- One new record; one changed/deleted record per actor/day. Ignore parallel audit wrappers.
    select distinct on (table_name,coalesce(record_id,id::text),actor,operation,
      case when operation='INSERT' then null::date else input_date end)
      actor,category,operation,input_date,business_date,table_name
    from meaningful
    order by table_name,coalesce(record_id,id::text),actor,operation,
      case when operation='INSERT' then null::date else input_date end,occurred_at,id
  ), stats as (
    select d.actor,d.category,d.input_date,
      count(*) filter(where operation='INSERT') as new_count,
      count(*) filter(where operation='UPDATE') as changed_count,
      count(*) filter(where operation='DELETE') as deleted_count,
      count(*) filter(where operation='INSERT' and business_date=input_date) as on_time,
      count(*) filter(where operation='INSERT' and business_date<input_date) as late,
      count(*) filter(where operation='INSERT' and (business_date is null or business_date>input_date)) as unassessed,
      coalesce(sum(input_date-business_date) filter(where operation='INSERT' and business_date<=input_date),0) as delay_days
    from dedup d join public.profiles p on p.user_id=d.actor
    group by d.actor,d.category,d.input_date
  )
  select jsonb_build_object(
    'from',p_from,'to',p_to,'timezone','Asia/Jakarta','generated_at',now(),
    'users',(select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'name',full_name,'role',role,'active',active) order by full_name),'[]'::jsonb) from public.profiles),
    'stats',(select coalesce(jsonb_agg(to_jsonb(s) order by input_date,actor,category),'[]'::jsonb) from stats s),
    'unattributed',(select count(*) from dedup d where not exists(select 1 from public.profiles p where p.user_id=d.actor)),
    'recording_coverage',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
      select a.id as assignment_id,a.ppl_id as actor,b.name as barn,
        count(day.d) as expected_days,
        count(day.d) filter(where exists(select 1 from public.recordings r where r.contract_assignment_id=a.id and r.recorded_on=day.d::date)) as recorded_days
      from public.logistics_contract_assignments a join public.barns b on b.id=a.barn_id
      join lateral (select min(c.arrived_on) as arrived_on from public.chick_ins c where c.contract_assignment_id=a.id) ci on ci.arrived_on is not null
      left join lateral generate_series(greatest(p_from,ci.arrived_on+1)::timestamp,least(p_to,(now() at time zone 'Asia/Jakarta')::date-1)::timestamp,interval '1 day') day(d) on true
      where a.active
      group by a.id,a.ppl_id,b.name
    ) x),
    'coverage',(select jsonb_agg(jsonb_build_object('category',m.category,'table',m.table_name,
      'first_audit',(select min(occurred_at) from public.audit_events a where a.table_name=m.table_name and a.action in ('DB_INSERT','INSERT')),
      'audited',exists(select 1 from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace join pg_catalog.pg_proc f on f.oid=t.tgfoid where n.nspname='public' and c.relname=m.table_name and not t.tgisinternal and t.tgenabled<>'D' and f.proname ilike '%audit%')
    ) order by m.category,m.table_name) from mapping m)
  ) into v_result;
  return v_result;
end
$function$;
REVOKE ALL ON FUNCTION public.admin_work_performance_v1(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_work_performance_v1(date,date) TO authenticated;
-- Start future audit for standalone administrative cash requests; no historical backfill.
CREATE OR REPLACE TRIGGER z_audit_transaction_change
AFTER INSERT OR UPDATE OR DELETE ON public.finance_cash_requests
FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();
