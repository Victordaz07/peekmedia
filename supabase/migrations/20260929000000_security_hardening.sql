-- Endurecimiento de seguridad (auditoría del 25 de septiembre de 2026). Todo es aditivo o más estricto;
-- nada de lo que la app hace hoy deja de funcionar.

-- ─────────────── Dueño de la agencia en la base de datos ───────────────

create function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.user_id = (select auth.uid()) and m.role = 'owner');
$$;

-- Borrar un cliente (y en cascada sus contratos, publicaciones y pagos) solo lo hace el dueño.
-- La demo se borra con la clave secreta, que no pasa por RLS.
drop policy "equipo borra clientes" on public.clients;
create policy "solo el dueño borra clientes" on public.clients
  for delete to authenticated using ((select public.is_owner()));

-- ─────────────── Aprobaciones que no se pueden falsificar ───────────────
-- Aprobar o pedir cambios solo lo registra review_post (la persona del cliente). El equipo solo
-- registra "enviado a aprobación"; antes podía insertar un "aprobado" en nombre del cliente.

drop policy "equipo ve y registra aprobaciones" on public.approvals;
create policy "equipo ve aprobaciones" on public.approvals
  for select to authenticated using ((select public.is_team()));
create policy "equipo registra envíos a aprobación" on public.approvals
  for insert to authenticated with check ((select public.is_team()) and action = 'submit');

-- ─────────────── Reserva para publicar (evita publicar dos veces) ───────────────
-- Quien va a publicar marca la pieza con un update condicional; si otra ejecución ya la marcó hace
-- menos de 15 minutos, no la toca.

alter table public.posts add column publishing_at timestamptz;

-- ─────────────── Límite del cotizador, atómico ───────────────
-- Cuenta e inserta en la misma transacción, con un candado por visitante: dos envíos a la vez no pasan
-- el límite. Los números son los de src/lib/leads/limit.ts (3 cada 10 minutos, 10 cada 24 horas).

create function public.take_quote_attempt(p_ip_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('quote:' || p_ip_hash));
  if (select count(*) from public.quote_attempts where ip_hash = p_ip_hash and created_at > now() - interval '10 minutes') >= 3
     or (select count(*) from public.quote_attempts where ip_hash = p_ip_hash and created_at > now() - interval '24 hours') >= 10 then
    return false;
  end if;
  insert into public.quote_attempts (ip_hash) values (p_ip_hash);
  delete from public.quote_attempts where created_at < now() - interval '48 hours';
  return true;
end;
$$;

revoke execute on function public.take_quote_attempt from public, anon, authenticated;
grant execute on function public.take_quote_attempt to service_role;

-- ─────────────── Registro de auditoría ───────────────
-- Quién cambió qué en clientes, accesos, contratos, pagos y membresías del equipo.
-- Lo escribe un disparador (nadie lo puede editar ni borrar desde la app); solo el dueño lo lee.

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  -- Persona de la sesión; vacío cuando lo hizo el servidor (cron, firma, cierre de contrato, demo).
  actor uuid,
  table_name text not null,
  action text not null,
  row_id text not null default '',
  old_data jsonb,
  new_data jsonb
);

create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_row_idx on public.audit_log (table_name, row_id);

alter table public.audit_log enable row level security;
revoke all on table public.audit_log from anon, authenticated;
grant select on table public.audit_log to authenticated;
create policy "el dueño lee la auditoría" on public.audit_log
  for select to authenticated using ((select public.is_owner()));

create function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_log (actor, table_name, action, row_id, old_data, new_data)
  values (
    auth.uid(),
    tg_table_name,
    tg_op,
    coalesce(v_row ->> 'id', v_row ->> 'user_id', ''),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end;
$$;

revoke execute on function public.audit_row from public, anon, authenticated;

create trigger audit_clients after insert or update or delete on public.clients
  for each row execute function public.audit_row();
create trigger audit_client_users after insert or update or delete on public.client_users
  for each row execute function public.audit_row();
create trigger audit_contracts after insert or update or delete on public.contracts
  for each row execute function public.audit_row();
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function public.audit_row();
create trigger audit_memberships after insert or update or delete on public.memberships
  for each row execute function public.audit_row();
