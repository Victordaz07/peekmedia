-- Anular (enviado sin firmar) o finalizar (firmado) un contrato.
-- Nunca se borra: la firma y el documento firmado se conservan como respaldo legal.
-- Solo el dueño de la agencia, con su contraseña y confirmando desde su correo. El servidor lo aplica con end_contract.

alter table public.contracts drop constraint contracts_status_check;
alter table public.contracts add constraint contracts_status_check
  check (status in ('draft', 'sent', 'signed', 'superseded', 'voided', 'terminated'));

alter table public.contracts
  add column ended_at timestamptz,
  add column end_date date,
  add column end_reason text check (end_reason is null or char_length(end_reason) between 10 and 1000),
  add column ended_by_name text;

-- Solicitudes pendientes de confirmar por correo. Solo el servidor (clave secreta) las lee o escribe.
create table public.contract_end_requests (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  action text not null check (action in ('void', 'terminate')),
  reason text not null check (char_length(reason) between 10 and 1000),
  end_date date not null,
  requested_by uuid not null,
  requested_by_name text not null,
  -- SHA-256 del enlace del correo: el enlace en sí nunca se guarda.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index contract_end_requests_contract_idx on public.contract_end_requests (contract_id);

alter table public.contract_end_requests enable row level security;
revoke all on table public.contract_end_requests from anon, authenticated;

-- Intentos de contraseña del dueño (para frenar a quien pruebe contraseñas desde una sesión robada).
create table public.owner_checks (
  user_id uuid not null,
  ok boolean not null,
  created_at timestamptz not null default now()
);

create index owner_checks_user_idx on public.owner_checks (user_id, created_at desc);

alter table public.owner_checks enable row level security;
revoke all on table public.owner_checks from anon, authenticated;

-- Aplica una solicitud confirmada, todo en una transacción:
-- vigente, sin usar, de la misma persona, que sigue siendo dueña, y el contrato en el estado correcto.
create function public.end_contract(p_request_id uuid, p_user uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  r public.contract_end_requests;
  v_status text;
  v_new text;
begin
  select * into r from public.contract_end_requests
    where id = p_request_id and confirmed_at is null and expires_at > now() and requested_by = p_user
    for update;
  if not found then
    raise exception 'request not valid';
  end if;
  if not exists (select 1 from public.memberships m where m.user_id = p_user and m.role = 'owner') then
    raise exception 'not owner';
  end if;

  select status into v_status from public.contracts where id = r.contract_id for update;
  if r.action = 'void' and v_status <> 'sent' then
    raise exception 'contract not sent';
  end if;
  if r.action = 'terminate' and v_status <> 'signed' then
    raise exception 'contract not signed';
  end if;

  v_new := case r.action when 'void' then 'voided' else 'terminated' end;
  update public.contracts
    set status = v_new, ended_at = now(), end_date = r.end_date, end_reason = r.reason, ended_by_name = r.requested_by_name
    where id = r.contract_id;
  update public.contract_end_requests set confirmed_at = now() where id = r.id;
  -- Cualquier otro enlace pendiente para este contrato deja de servir.
  update public.contract_end_requests set expires_at = now()
    where contract_id = r.contract_id and confirmed_at is null and id <> r.id;
  return v_new;
end;
$$;

revoke execute on function public.end_contract from public, anon, authenticated;
grant execute on function public.end_contract to service_role;
