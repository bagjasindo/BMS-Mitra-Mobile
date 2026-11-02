-- Read-only feed quantities for the existing global dashboard; existing role gate is preserved.
CREATE OR REPLACE FUNCTION public.get_dashboard_global_data_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  r public.bms_role;
begin
  r := private.my_bms_role();
  if r is null or r <> all(array[
    'ADMIN'::public.bms_role,'PPL'::public.bms_role,'LOGISTIK'::public.bms_role,
    'MARKETING'::public.bms_role,'KEUANGAN'::public.bms_role,'OWNER'::public.bms_role
  ]) then
    raise exception 'Akses ditolak';
  end if;

  return jsonb_build_object(
    'assignments',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from public.logistics_contract_assignments x),
    'barns',(select coalesce(jsonb_agg(to_jsonb(x) order by x.code),'[]'::jsonb) from public.barns x),
    'contracts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.contracts x where x.cycle_id is null),
    'chicks',(select coalesce(jsonb_agg(to_jsonb(x) order by x.arrived_on desc),'[]'::jsonb) from public.chick_ins x),
    'links',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_contract_assignment_abks x),
    'abks',(select coalesce(jsonb_agg(to_jsonb(x) order by x.code),'[]'::jsonb) from public.employees x where x.kind='ABK'),
    'items',(select coalesce(jsonb_agg(to_jsonb(x) order by x.code),'[]'::jsonb) from public.items x where x.active=true),
    'standards',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.performance_standards x),
    'harvests',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.marketing_contract_harvests x),
    'live_prices',(select coalesce(jsonb_agg(to_jsonb(x) order by x.min_weight_kg),'[]'::jsonb) from public.contract_live_prices x),
    'rhpp_costs',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_rhpp_cost_summary x),
    'recordings',(select coalesce(jsonb_agg(to_jsonb(x) order by x.recorded_on),'[]'::jsonb) from public.recordings x),
    'weight_samples',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.recording_weight_samples x),
    'estimates',(select coalesce(jsonb_agg(to_jsonb(x) order by x.estimated_on desc),'[]'::jsonb) from public.production_estimates x),
    'estimate_sizes',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.production_estimate_sizes x),
    'abk_results',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.production_abk_results x),
    'abk_result_sizes',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.production_abk_result_sizes x),
    'bonuses',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.contract_bonuses x),
    'finals',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.production_cycle_final_unified x),
    'shipments',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_shipments x),
    'shipment_items',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_shipment_items x),
    'external_shipments',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_external_shipments x),
    'external_shipment_items',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_external_shipment_items x),
    'returns',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_returns x),
    'return_items',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_return_items x),
    'feed_monitoring_version',1,
    'recording_feed_items',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select recording_id,item_id,quantity_units,kg_per_unit from public.recording_feed_items) x),
    'mandiri_feed_purchases',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select id,item_id from public.logistics_mandiri_purchases) x),
    'mandiri_feed_allocations',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select purchase_id,contract_assignment_id,quantity from public.logistics_mandiri_purchase_allocations) x),
    'retained_feed',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select id,source_assignment_id,item_id,quantity from public.logistics_mitra_retained_feed) x),
    'company_feed_movements',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select retained_feed_id,contract_assignment_id,direction,quantity from public.logistics_company_feed_movements) x),
    'feed_adjustments',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select contract_assignment_id,item_id,adjustment_units from public.production_feed_stock_adjustments) x)
  );
end
$function$
;

REVOKE ALL ON FUNCTION public.get_dashboard_global_data_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_global_data_v1() TO authenticated;
