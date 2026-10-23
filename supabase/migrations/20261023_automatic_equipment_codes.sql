-- Auto code assigned within database, safe across concurrent inserts.
create sequence if not exists public.barn_equipment_code_seq;
grant usage on sequence public.barn_equipment_code_seq to authenticated;
create or replace function public.assign_barn_equipment_code()
returns trigger language plpgsql set search_path = '' as $$
declare candidate text;
begin
 if TG_OP = 'UPDATE' then
   new.code := old.code;
   return new;
 end if;
 loop
   candidate := 'PRL-' || lpad(nextval('public.barn_equipment_code_seq'::regclass)::text, 6, '0');
   exit when not exists (select 1 from public.barn_equipment_types where code=candidate);
 end loop;
 new.code := candidate;
 return new;
end; $$;
drop trigger if exists trg_assign_barn_equipment_code on public.barn_equipment_types;
create trigger trg_assign_barn_equipment_code before insert or update on public.barn_equipment_types for each row execute function public.assign_barn_equipment_code();
