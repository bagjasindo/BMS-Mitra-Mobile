-- Inventori fisik peralatan; migration applied to BMS production on 2026-10-23.
-- Independent of barn_assets, financial reports, RHPP, warehouse stock and cycle state.
create table if not exists public.barn_equipment_types (
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 name text not null,
 category text not null default 'PERALATAN',
 unit text not null default 'UNIT',
 notes text,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.barn_equipment_inventory (
 id uuid primary key default gen_random_uuid(),
 barn_id uuid not null references public.barns(id),
 equipment_type_id uuid not null references public.barn_equipment_types(id),
 quantity numeric(14,2) not null default 0 check (quantity >= 0),
 condition text not null default 'BAIK' check (condition in ('BAIK','PERLU_PERBAIKAN','RUSAK')),
 checked_on date,
 location_notes text,
 notes text,
 updated_at timestamptz not null default now(),
 unique(barn_id,equipment_type_id,condition)
);
alter table public.barn_equipment_types enable row level security;
alter table public.barn_equipment_inventory enable row level security;
grant select,insert,update on public.barn_equipment_types,public.barn_equipment_inventory to authenticated;
create policy equipment_types_read on public.barn_equipment_types for select to authenticated
 using(exists(select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('ADMIN','OWNER','KEUANGAN','LOGISTIK','PPL')));
create policy equipment_types_insert on public.barn_equipment_types for insert to authenticated
 with check(exists(select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role='ADMIN'));
create policy equipment_types_update on public.barn_equipment_types for update to authenticated
 using(exists(select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role='ADMIN'))
 with check(exists(select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role='ADMIN'));
create policy equipment_inventory_read on public.barn_equipment_inventory for select to authenticated
 using(exists(select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('ADMIN','OWNER','KEUANGAN','LOGISTIK','PPL')));
create policy equipment_inventory_insert on public.barn_equipment_inventory for insert to authenticated
 with check(exists(select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('ADMIN','LOGISTIK')));
create policy equipment_inventory_update on public.barn_equipment_inventory for update to authenticated
 using(exists(select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('ADMIN','LOGISTIK')))
 with check(exists(select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('ADMIN','LOGISTIK')));
create index if not exists barn_equipment_inventory_barn_idx on public.barn_equipment_inventory(barn_id);
