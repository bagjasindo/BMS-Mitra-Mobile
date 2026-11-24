-- Keep the recording total aligned with all mixed-feed detail rows.
-- The old production guard always set feed_kg from feed_item_id/feed_quantity_units,
-- which represent only the first feed line and overwrote the total saved by the RPC.
create or replace function private.guard_production_recording()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  a public.logistics_contract_assignments%rowtype;
  ci public.chick_ins%rowtype;
  kg_per numeric;
  mixed_total numeric;
  used_dead integer;
  sent_units numeric;
  external_units numeric;
  returned_units numeric;
  used_units numeric;
  available_units numeric;
begin
  if tg_op='DELETE' then
    select * into a from public.logistics_contract_assignments where id=old.contract_assignment_id;
    if old.contract_assignment_id is not null and coalesce(a.active,false)=false then raise exception 'Kontrak sudah CLOSED. Recording terkunci.'; end if;
    return old;
  end if;
  if new.contract_assignment_id is null or new.barn_id is null then raise exception 'Kandang / Kontrak Aktif wajib dipilih.'; end if;
  select * into a from public.logistics_contract_assignments where id=new.contract_assignment_id;
  if a.id is null or not a.active then raise exception 'Kontrak tidak aktif.'; end if;
  if a.barn_id<>new.barn_id then raise exception 'Kandang tidak sesuai kontrak.'; end if;
  select * into ci from public.chick_ins where contract_assignment_id=a.id order by arrived_on desc limit 1;
  if ci.id is null then raise exception 'Chick-In harus diisi sebelum Recording PPL.'; end if;
  if new.age_days is null or new.age_days < 1 then raise exception 'Hari recording harus dimulai dari Hari ke-1.'; end if;
  -- Standar PPL: tanggal DOC datang = Hari 0, recording pertama H+1 = umur 1.
  new.recorded_on := ci.arrived_on + new.age_days;
  if exists (select 1 from public.recordings r where r.contract_assignment_id=new.contract_assignment_id and r.age_days=new.age_days and r.id is distinct from new.id) then raise exception 'Hari ke-% sudah pernah diisi.', new.age_days; end if;
  if new.feed_item_id is null or new.feed_quantity_units is null or new.feed_quantity_units<=0 then raise exception 'Pakan dan jumlah pemakaian wajib diisi.'; end if;
  select i.kg_per_unit into kg_per from public.items i where i.id=new.feed_item_id and i.category='PAKAN' and i.active=true;
  if kg_per is null or kg_per<=0 then raise exception 'Konversi Kg/Satuan pakan belum tersedia.'; end if;
  select coalesce(sum(li.quantity),0) into sent_units from public.logistics_shipments s join public.logistics_shipment_items li on li.shipment_id=s.id where s.contract_assignment_id=new.contract_assignment_id and li.item_id=new.feed_item_id;
  select coalesce(sum(li.quantity),0) into external_units from public.logistics_external_shipments s join public.logistics_external_shipment_items li on li.external_shipment_id=s.id where s.contract_assignment_id=new.contract_assignment_id and li.item_id=new.feed_item_id;
  select coalesce(sum(li.quantity),0) into returned_units from public.logistics_returns r join public.logistics_return_items li on li.return_id=r.id where r.contract_assignment_id=new.contract_assignment_id and li.item_id=new.feed_item_id;
  select coalesce(sum(r.feed_quantity_units),0) into used_units from public.recordings r where r.contract_assignment_id=new.contract_assignment_id and r.feed_item_id=new.feed_item_id and r.id is distinct from new.id;
  available_units := sent_units + external_units - returned_units - used_units;
  if available_units<=0 then raise exception 'Stok pakan ini sudah habis.'; end if;
  if new.feed_quantity_units>available_units then raise exception 'Pemakaian pakan melebihi sisa stok. Sisa: % satuan.', available_units; end if;
  if exists (select 1 from public.recording_feed_items fi where fi.recording_id=new.id) then
    select round(coalesce(sum(fi.quantity_units*fi.kg_per_unit),0),2)
      into mixed_total
    from public.recording_feed_items fi
    where fi.recording_id=new.id;
    new.feed_kg := mixed_total;
  else
    new.feed_kg := round(new.feed_quantity_units*kg_per,2);
  end if;
  select coalesce(sum(r.mortality+r.culling),0) into used_dead from public.recordings r where r.contract_assignment_id=new.contract_assignment_id and r.id is distinct from new.id;
  if used_dead + coalesce(new.mortality,0) + coalesce(new.culling,0) >= (ci.received-ci.doa) then raise exception 'Kematian dan afkir tidak boleh menghabiskan seluruh populasi.'; end if;
  new.cycle_id:=null;
  return new;
end;
$function$;
