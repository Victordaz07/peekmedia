-- Datos de demostración: los clientes de ejemplo quedan marcados para poder borrarlos completos,
-- incluidas sus firmas de prueba. Las firmas de clientes reales siguen siendo inmutables.

alter table public.clients add column is_demo boolean not null default false;

create index clients_demo_idx on public.clients (is_demo) where is_demo;

-- Solo el servidor (clave secreta) marca un cliente como demo: el equipo no puede crear ni cambiar la marca,
-- así nadie puede volver "demo" a un cliente real para borrar sus firmas.
drop policy "equipo crea clientes" on public.clients;
create policy "equipo crea clientes" on public.clients
  for insert to authenticated with check ((select public.is_team()) and not is_demo);

revoke update on public.clients from authenticated;
grant update (name, industry, handle, avatar_color, platforms, contact_name, contact_email, contact_phone, tax_id, status, fee)
  on public.clients to authenticated;

-- Las firmas siguen sin poder cambiarse ni borrarse, salvo las de un cliente de demostración
-- (y aun así solo la clave secreta puede borrarlas: no hay política de borrado para el panel).
create or replace function public.forbid_signature_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and exists (
    select 1 from public.contracts c join public.clients cl on cl.id = c.client_id
    where c.id = old.contract_id and cl.is_demo
  ) then
    return old;
  end if;
  raise exception 'Las firmas no se pueden modificar ni borrar';
end;
$$;
