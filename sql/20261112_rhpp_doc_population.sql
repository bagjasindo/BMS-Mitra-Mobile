-- Owner approved 2026-11-12: DOA is a note, DOC received is the RHPP population.
-- No historical snapshot or operational transaction is updated.
CREATE OR REPLACE FUNCTION public.finance_rhpp_summary_v3()
 RETURNS TABLE(contract_assignment_id uuid, barn_id uuid, barn_code text, barn_name text, contract_number text, active boolean, chick_in_birds numeric, total_harvest_birds numeric, total_harvest_kg numeric, avg_bw_kg numeric, weighted_age numeric, implied_depletion_birds numeric, recorded_depletion_birds numeric, depletion_variance_birds numeric, mortality_pct numeric, main_feed_kg numeric, external_feed_kg numeric, net_feed_kg numeric, fcr_actual numeric, fcr_standard numeric, diff_fcr numeric, ip numeric, harvest_value numeric, main_doc_cost numeric, main_feed_cost numeric, main_ovk_cost numeric, main_other_cost numeric, main_return_cost numeric, external_sapronak_cost numeric, sapronak_cost numeric, external_meat_cost numeric, total_rhpp_cost numeric, base_profit numeric, bonus_ip_rate numeric, bonus_ip numeric, bonus_fc_rate numeric, bonus_fc numeric, bonus_mortality_rate numeric, bonus_mortality numeric, farmer_profit numeric, profit_per_chick_in numeric, profit_per_harvested_bird numeric, population_balanced boolean, ready_financial boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid()
      and p.active
      and p.role in ('ADMIN','LOGISTIK','PPL','MARKETING','KEUANGAN','OWNER')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  return query
  with harvest_source as (
    select h.contract_assignment_id,
           h.birds::numeric birds,
           h.net_weight_kg::numeric kg,
           h.total_amount::numeric value,
           (h.birds*((h.harvested_on-ci.arrived_on)+1))::numeric age_weight
    from public.marketing_contract_harvests h
    join public.chick_ins ci on ci.contract_assignment_id=h.contract_assignment_id
    union all
    select m.contract_assignment_id,
           coalesce(m.birds,0)::numeric birds,
           m.weight_kg::numeric kg,
           (m.weight_kg*cp.price_per_kg)::numeric value,
           (coalesce(m.birds,0)*((m.purchase_date-ci.arrived_on)+1))::numeric age_weight
    from public.marketing_external_meat_purchases m
    join public.chick_ins ci on ci.contract_assignment_id=m.contract_assignment_id
    join public.logistics_contract_assignments a on a.id=m.contract_assignment_id
    join lateral (
      select p.price_per_kg
      from public.contract_live_prices p
      where p.contract_id=a.master_contract_id
        and (m.weight_kg/nullif(m.birds,0)) >= p.min_weight_kg
        and (p.max_weight_kg is null or (m.weight_kg/nullif(m.birds,0)) < p.max_weight_kg)
      order by p.min_weight_kg desc
      limit 1
    ) cp on true
  ),
  harvest as (
    select h.contract_assignment_id,
           sum(h.birds)::numeric birds,
           sum(h.kg)::numeric kg,
           sum(h.value)::numeric value,
           sum(h.age_weight)::numeric/nullif(sum(h.birds),0) weighted_age
    from harvest_source h
    group by h.contract_assignment_id
  ),
  main_ship as (
    select s.contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then si.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(case when i.category='DOC' then si.quantity*si.unit_price else 0 end),0)::numeric doc_cost,
           coalesce(sum(case when i.category='PAKAN' then si.quantity*si.unit_price else 0 end),0)::numeric feed_cost,
           coalesce(sum(case when i.category='OVK' then si.quantity*si.unit_price else 0 end),0)::numeric ovk_cost,
           coalesce(sum(case when i.category not in ('DOC','PAKAN','OVK') then si.quantity*si.unit_price else 0 end),0)::numeric other_cost,
           coalesce(sum(si.quantity*si.unit_price),0)::numeric total_cost
    from public.logistics_shipments s
    join public.logistics_shipment_items si on si.shipment_id=s.id
    join public.items i on i.id=si.item_id
    group by s.contract_assignment_id
  ),
  main_ret as (
    select r.contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then ri.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(ri.quantity*ri.unit_price),0)::numeric total_cost
    from public.logistics_returns r
    join public.logistics_return_items ri on ri.return_id=r.id
    join public.items i on i.id=ri.item_id
    group by r.contract_assignment_id
  ),
  retained_feed as (
    select l.source_assignment_id contract_assignment_id,
           sum(l.quantity*coalesce(i.kg_per_unit,0))::numeric feed_kg
    from public.logistics_mitra_retained_feed l
    join public.items i on i.id=l.item_id
    group by l.source_assignment_id
  ),
  ext_ship as (
    select e.contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then ei.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(ei.quantity*ei.purchase_unit_price),0)::numeric total_cost
    from public.logistics_external_shipments e
    join public.logistics_external_shipment_items ei on ei.external_shipment_id=e.id
    join public.items i on i.id=ei.item_id
    group by e.contract_assignment_id
  ),
  ext_ret as (
    select er.contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then eri.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(eri.quantity*eri.purchase_unit_price),0)::numeric total_cost
    from public.logistics_external_returns er
    join public.logistics_external_return_items eri on eri.external_return_id=er.id
    join public.items i on i.id=eri.item_id
    group by er.contract_assignment_id
  ),
  transfer_in as (
    select t.target_contract_assignment_id contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then t.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(t.quantity*t.unit_price),0)::numeric total_cost
    from public.logistics_external_return_transfers t
    join public.items i on i.id=t.item_id
    group by t.target_contract_assignment_id
  ),
  company_in as (
    select m.contract_assignment_id,sum(m.quantity*i.kg_per_unit)::numeric feed_kg,
           sum(m.quantity*l.unit_price)::numeric total_cost
    from public.logistics_company_feed_movements m
    join public.logistics_mitra_retained_feed l on l.id=m.retained_feed_id
    join public.items i on i.id=l.item_id where m.direction='IN'
    group by m.contract_assignment_id
  ),
  company_out as (
    select m.contract_assignment_id,sum(m.quantity*i.kg_per_unit)::numeric feed_kg,
           sum(m.quantity*l.unit_price)::numeric total_cost
    from public.logistics_company_feed_movements m
    join public.logistics_mitra_retained_feed l on l.id=m.retained_feed_id
    join public.items i on i.id=l.item_id where m.direction='OUT'
    group by m.contract_assignment_id
  ),
  meat as (
    select m.contract_assignment_id,
           coalesce(sum(m.weight_kg*m.purchase_price_per_kg),0)::numeric total_cost
    from public.marketing_external_meat_purchases m
    group by m.contract_assignment_id
  ),
  raw as (
    select
      a.id assignment_id,a.barn_id,b.code barn_code,b.name barn_name,c.number contract_number,a.active,
      basis.birds::numeric chick_in_birds,
      coalesce(h.birds,0)::numeric total_harvest_birds,
      coalesce(h.kg,0)::numeric total_harvest_kg,
      case when coalesce(h.birds,0)>0 then h.kg/h.birds else 0 end::numeric avg_bw_kg,
      coalesce(h.weighted_age,0)::numeric weighted_age,
      (basis.birds-coalesce(h.birds,0))::numeric implied_depletion_birds,
      (basis.birds-coalesce(h.birds,0))::numeric recorded_depletion_birds,
      0::numeric depletion_variance_birds,
      case when basis.birds>0 then ((basis.birds-coalesce(h.birds,0))/basis.birds)*100 else 0 end::numeric mortality_pct,
      greatest(0,coalesce(ms.feed_kg,0)-coalesce(mr.feed_kg,0)-coalesce(rf.feed_kg,0))::numeric main_feed_kg,
      greatest(0,coalesce(es.feed_kg,0)-coalesce(er.feed_kg,0)+coalesce(ti.feed_kg,0)+coalesce(cin.feed_kg,0)-coalesce(cout.feed_kg,0))::numeric external_feed_kg,
      greatest(0,coalesce(ms.feed_kg,0)-coalesce(mr.feed_kg,0)-coalesce(rf.feed_kg,0))::numeric net_feed_kg,
      coalesce(h.value,0)::numeric harvest_value,
      greatest(0,coalesce(ms.doc_cost,0))::numeric main_doc_cost,
      greatest(0,coalesce(ms.feed_cost,0))::numeric main_feed_cost,
      greatest(0,coalesce(ms.ovk_cost,0))::numeric main_ovk_cost,
      greatest(0,coalesce(ms.other_cost,0))::numeric main_other_cost,
      greatest(0,coalesce(mr.total_cost,0))::numeric main_return_cost,
      greatest(0,coalesce(es.total_cost,0)-coalesce(er.total_cost,0)+coalesce(ti.total_cost,0)+coalesce(cin.total_cost,0)-coalesce(cout.total_cost,0))::numeric external_sapronak_cost,
      greatest(0,coalesce(ms.total_cost,0)-coalesce(mr.total_cost,0))::numeric sapronak_cost,
      greatest(0,coalesce(me.total_cost,0))::numeric external_meat_cost,
      a.master_contract_id,a.performance_template_name
    from public.logistics_contract_assignments a
    join public.barns b on b.id=a.barn_id
    join public.contracts c on c.id=a.master_contract_id
    join public.chick_ins ci on ci.contract_assignment_id=a.id
    -- DOA is a note for new RHPP. Preserve the population of historical frozen RHPP.
    cross join lateral (
      select case when a.active then ci.received::numeric else coalesce(
        (select f.chick_in_birds from public.rhpp_system_final f
         where f.contract_assignment_id=a.id order by f.created_at desc limit 1),
        ci.received::numeric) end as birds
    ) basis
    left join harvest h on h.contract_assignment_id=a.id
    left join main_ship ms on ms.contract_assignment_id=a.id
    left join main_ret mr on mr.contract_assignment_id=a.id
    left join retained_feed rf on rf.contract_assignment_id=a.id
    left join ext_ship es on es.contract_assignment_id=a.id
    left join ext_ret er on er.contract_assignment_id=a.id
    left join transfer_in ti on ti.contract_assignment_id=a.id
    left join company_in cin on cin.contract_assignment_id=a.id
    left join company_out cout on cout.contract_assignment_id=a.id
    left join meat me on me.contract_assignment_id=a.id
  ),
  metrics as (
    select r.*,
      case when r.total_harvest_kg>0 then r.net_feed_kg/r.total_harvest_kg else 0 end::numeric fcr_actual,
      lo.age_days lo_age,lo.std_fcr lo_fcr,hi.age_days hi_age,hi.std_fcr hi_fcr
    from raw r
    left join lateral (
      select ps.age_days,ps.std_fcr from public.performance_standards ps
      where ps.contract_id=r.master_contract_id and ps.template_name=r.performance_template_name and ps.age_days<=r.weighted_age
      order by ps.age_days desc limit 1
    ) lo on true
    left join lateral (
      select ps.age_days,ps.std_fcr from public.performance_standards ps
      where ps.contract_id=r.master_contract_id and ps.template_name=r.performance_template_name and ps.age_days>=r.weighted_age
      order by ps.age_days asc limit 1
    ) hi on true
  ),
  scored as (
    select m.*,
      case
        when m.lo_fcr is null then m.hi_fcr when m.hi_fcr is null then m.lo_fcr
        when m.hi_age=m.lo_age then m.lo_fcr
        else m.lo_fcr+((m.weighted_age-m.lo_age)/(m.hi_age-m.lo_age))*(m.hi_fcr-m.lo_fcr)
      end::numeric fcr_standard,
      case when m.weighted_age>0 and m.fcr_actual>0 then ((100-m.mortality_pct)*m.avg_bw_kg*100)/(m.weighted_age*m.fcr_actual) else 0 end::numeric ip
    from metrics m
  ),
  bonus_rates as (
    select s.*,
      coalesce(ipb.rupiah_per_kg,0)::numeric bonus_ip_rate,
      coalesce(fcb.rupiah_per_kg,0)::numeric bonus_fc_rate,
      coalesce(db.rupiah_per_kg,0)::numeric bonus_mortality_rate
    from scored s
    left join lateral (
      select cb.rupiah_per_kg from public.contract_bonuses cb
      where cb.contract_id=s.master_contract_id and cb.metric='IP'
        and (cb.min_value is null or s.ip>=cb.min_value)
        and (cb.max_value is null or s.ip<cb.max_value)
      order by cb.min_value desc nulls last limit 1
    ) ipb on true
    left join lateral (
      select cb.rupiah_per_kg from public.contract_bonuses cb
      where cb.contract_id=s.master_contract_id and cb.metric='FCR_DIFFERENCE'
        and (cb.min_value is null or (coalesce(s.fcr_standard,0)-s.fcr_actual)>=cb.min_value)
        and (cb.max_value is null or (coalesce(s.fcr_standard,0)-s.fcr_actual)<cb.max_value)
      order by cb.min_value desc nulls last limit 1
    ) fcb on true
    left join lateral (
      select cb.rupiah_per_kg from public.contract_bonuses cb
      where cb.contract_id=s.master_contract_id and cb.metric='DEPLETION'
        and (cb.min_value is null or s.mortality_pct>=cb.min_value)
        and (cb.max_value is null or s.mortality_pct<cb.max_value)
      order by cb.min_value desc nulls last limit 1
    ) db on true
  )
  select
    br.assignment_id,br.barn_id,br.barn_code,br.barn_name,br.contract_number,br.active,
    br.chick_in_birds,br.total_harvest_birds,br.total_harvest_kg,br.avg_bw_kg,br.weighted_age,
    br.implied_depletion_birds,br.recorded_depletion_birds,br.depletion_variance_birds,br.mortality_pct,
    br.main_feed_kg,br.external_feed_kg,br.net_feed_kg,
    br.fcr_actual,br.fcr_standard,(coalesce(br.fcr_standard,0)-br.fcr_actual)::numeric diff_fcr,br.ip,
    br.harvest_value,br.main_doc_cost,br.main_feed_cost,br.main_ovk_cost,br.main_other_cost,br.main_return_cost,
    br.external_sapronak_cost,br.sapronak_cost,br.external_meat_cost,
    br.sapronak_cost::numeric total_rhpp_cost,
    (br.harvest_value-br.sapronak_cost)::numeric base_profit,
    br.bonus_ip_rate,(br.total_harvest_kg*br.bonus_ip_rate)::numeric bonus_ip,
    br.bonus_fc_rate,(br.total_harvest_kg*br.bonus_fc_rate)::numeric bonus_fc,
    br.bonus_mortality_rate,(br.total_harvest_kg*br.bonus_mortality_rate)::numeric bonus_mortality,
    (br.harvest_value-br.sapronak_cost
      +br.total_harvest_kg*br.bonus_ip_rate
      +br.total_harvest_kg*br.bonus_fc_rate
      +br.total_harvest_kg*br.bonus_mortality_rate)::numeric farmer_profit,
    case when br.chick_in_birds>0 then
      (br.harvest_value-br.sapronak_cost
       +br.total_harvest_kg*br.bonus_ip_rate
       +br.total_harvest_kg*br.bonus_fc_rate
       +br.total_harvest_kg*br.bonus_mortality_rate)/br.chick_in_birds else 0 end::numeric profit_per_chick_in,
    case when br.total_harvest_birds>0 then
      (br.harvest_value-br.sapronak_cost
       +br.total_harvest_kg*br.bonus_ip_rate
       +br.total_harvest_kg*br.bonus_fc_rate
       +br.total_harvest_kg*br.bonus_mortality_rate)/br.total_harvest_birds else 0 end::numeric profit_per_harvested_bird,
    (abs(br.depletion_variance_birds)<0.5)::boolean population_balanced,
    (not br.active and abs(br.depletion_variance_birds)<0.5 and br.chick_in_birds>0 and br.total_harvest_birds>0 and br.total_harvest_kg>0 and br.net_feed_kg>0 and br.sapronak_cost>0)::boolean ready_financial
  from bonus_rates br
  order by br.active desc,br.barn_code;
end
$function$

;
