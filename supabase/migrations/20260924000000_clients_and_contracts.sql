-- Fase 3 · Clientes, accesos por cliente, CRM (notas y tareas) y contratos con firma electrónica.

-- ─────────────── Clientes ───────────────

-- Por ahora hay una sola agencia: los clientes nuevos quedan en la primera organización.
create function public.default_org() returns uuid
language sql stable set search_path = '' as $$
  select id from public.organizations order by created_at limit 1;
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.default_org() references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  industry text not null default '',
  handle text not null default '',
  avatar_color text not null default 'ocean' check (avatar_color in ('coral', 'cyan', 'ink', 'ocean')),
  platforms text[] not null default '{}',
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  tax_id text not null default '',
  status text not null default 'active' check (status in ('prospect', 'active', 'paused', 'ended')),
  fee numeric(12, 2) check (fee >= 0),
  created_at timestamptz not null default now()
);

-- Personas del cliente con acceso a su espacio. Un email (y un usuario) pertenece a un solo cliente.
create table public.client_users (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'approver', 'viewer')),
  active boolean not null default true,
  invited_at timestamptz not null default now(),
  code_updated_at timestamptz not null default now()
);

create index client_users_client_idx on public.client_users (client_id);

-- ¿A qué cliente pertenece el usuario actual? (null si es del equipo o no tiene acceso activo)
create function public.my_client_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select cu.client_id from public.client_users cu where cu.user_id = (select auth.uid()) and cu.active;
$$;

create function public.my_client_role() returns text
language sql stable security definer set search_path = '' as $$
  select cu.role from public.client_users cu where cu.user_id = (select auth.uid()) and cu.active;
$$;

alter table public.clients enable row level security;
alter table public.client_users enable row level security;

create policy "equipo ve clientes; cada cliente ve el suyo" on public.clients
  for select to authenticated using ((select public.is_team()) or id = (select public.my_client_id()));
create policy "equipo crea clientes" on public.clients
  for insert to authenticated with check ((select public.is_team()));
create policy "equipo edita clientes" on public.clients
  for update to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "equipo borra clientes" on public.clients
  for delete to authenticated using ((select public.is_team()));

-- Los accesos se crean desde el servidor con la clave secreta (junto con el usuario de Auth).
create policy "equipo ve accesos; cada persona ve el suyo" on public.client_users
  for select to authenticated using ((select public.is_team()) or user_id = (select auth.uid()));
create policy "equipo edita accesos" on public.client_users
  for update to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "equipo quita accesos" on public.client_users
  for delete to authenticated using ((select public.is_team()));

-- El equipo solo cambia rol, estado y fecha del código.
revoke update on public.client_users from authenticated;
grant update (role, active, code_updated_at) on public.client_users to authenticated;

-- ─────────────── CRM interno: notas y tareas (solo equipo) ───────────────

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  by_user uuid references auth.users (id) on delete set null,
  by_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 300),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index notes_client_idx on public.notes (client_id, created_at desc);
create index tasks_client_idx on public.tasks (client_id, created_at);

alter table public.notes enable row level security;
alter table public.tasks enable row level security;

create policy "solo equipo" on public.notes for all to authenticated
  using ((select public.is_team())) with check ((select public.is_team()));
create policy "solo equipo" on public.tasks for all to authenticated
  using ((select public.is_team())) with check ((select public.is_team()));

-- ─────────────── Contratos ───────────────

create sequence public.contract_number_seq start 1001;

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  number text not null default 'PM-' || nextval('public.contract_number_seq'),
  version int not null check (version >= 1),
  plan_id text not null,
  plan_name text not null,
  extras text[] not null default '{}',
  price numeric(12, 2) not null check (price > 0),
  start_date date not null,
  months int not null check (months between 1 and 60),
  billing_day int not null check (billing_day between 1 and 28),
  payment_method text not null,
  deliverables jsonb not null,
  addons text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'sent', 'signed', 'superseded')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  signed_at timestamptz,
  unique (client_id, version)
);

create index contracts_client_idx on public.contracts (client_id, version desc);

alter table public.contracts enable row level security;

-- El cliente ve su contrato una vez enviado; los borradores son solo del equipo.
create policy "equipo ve contratos; cliente ve los suyos enviados" on public.contracts
  for select to authenticated using (
    (select public.is_team()) or (client_id = (select public.my_client_id()) and status <> 'draft')
  );
create policy "equipo crea contratos" on public.contracts
  for insert to authenticated with check ((select public.is_team()) and status = 'draft');
-- El equipo edita borradores y enviados (no firmados). La firma la registra sign_contract.
create policy "equipo edita contratos sin firmar" on public.contracts
  for update to authenticated
  using ((select public.is_team()) and status in ('draft', 'sent'))
  with check ((select public.is_team()) and status in ('draft', 'sent'));

-- ─────────────── Firmas (inmutables) ───────────────

create table public.signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references public.contracts (id) on delete restrict,
  -- Sin FK: la firma debe sobrevivir aunque luego se borre el acceso de quien firmó.
  signer_user_id uuid not null,
  signer_name text not null check (char_length(signer_name) between 5 and 120),
  signer_role text not null,
  method text not null check (method in ('typed', 'drawn')),
  image text check (image is null or char_length(image) <= 400000),
  signed_at timestamptz not null default now(),
  ip text not null default '',
  user_agent text not null default '',
  doc_sha256 text not null check (doc_sha256 ~ '^[0-9a-f]{64}$'),
  -- El texto exacto que se firmó (JSON canónico). Su SHA-256 es doc_sha256.
  document text not null check (char_length(document) <= 100000),
  verification_code text not null unique
);

alter table public.signatures enable row level security;

create policy "equipo ve firmas; cliente ve las suyas" on public.signatures
  for select to authenticated using (
    (select public.is_team())
    or exists (select 1 from public.contracts c where c.id = contract_id and c.client_id = (select public.my_client_id()))
  );

-- Nadie las cambia ni las borra, ni siquiera con la clave secreta.
create function public.forbid_signature_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Las firmas no se pueden modificar ni borrar';
end;
$$;

create trigger signatures_immutable before update or delete on public.signatures
  for each row execute function public.forbid_signature_change();

-- Firma atómica: valida que el contrato esté pendiente y que quien firma sea Administrador activo de ese cliente.
create function public.sign_contract(
  p_contract_id uuid,
  p_signer_user_id uuid,
  p_signer_name text,
  p_signer_role text,
  p_method text,
  p_image text,
  p_ip text,
  p_user_agent text,
  p_doc_sha256 text,
  p_verification_code text,
  p_document text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_client uuid;
  v_sig uuid;
begin
  select client_id into v_client from public.contracts where id = p_contract_id and status = 'sent' for update;
  if v_client is null then
    raise exception 'contract not pending';
  end if;
  if encode(sha256(convert_to(p_document, 'UTF8')), 'hex') <> p_doc_sha256 then
    raise exception 'hash mismatch';
  end if;
  if not exists (
    select 1 from public.client_users
    where user_id = p_signer_user_id and client_id = v_client and role = 'admin' and active
  ) then
    raise exception 'signer not allowed';
  end if;

  insert into public.signatures (contract_id, signer_user_id, signer_name, signer_role, method, image, ip, user_agent, doc_sha256, verification_code, document)
  values (p_contract_id, p_signer_user_id, p_signer_name, p_signer_role, p_method, p_image, p_ip, p_user_agent, p_doc_sha256, p_verification_code, p_document)
  returning id into v_sig;

  update public.contracts set status = 'superseded' where client_id = v_client and status = 'signed';
  update public.contracts set status = 'signed', signed_at = now() where id = p_contract_id;
  return v_sig;
end;
$$;

revoke execute on function public.sign_contract from public, anon, authenticated;
grant execute on function public.sign_contract to service_role;

-- ─────────────── Solicitudes de cambio de plan ───────────────

create table public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  type text not null check (type in ('plan', 'addon')),
  target text not null check (char_length(target) between 1 and 80),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  by_user uuid references auth.users (id) on delete set null,
  by_name text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index plan_requests_client_idx on public.plan_requests (client_id, created_at desc);
-- Una sola solicitud pendiente por cliente y destino.
create unique index plan_requests_one_pending on public.plan_requests (client_id, type, target) where status = 'pending';

alter table public.plan_requests enable row level security;

create policy "equipo ve solicitudes; cliente ve las suyas" on public.plan_requests
  for select to authenticated using ((select public.is_team()) or client_id = (select public.my_client_id()));
create policy "administrador del cliente solicita" on public.plan_requests
  for insert to authenticated with check (
    client_id = (select public.my_client_id())
    and (select public.my_client_role()) = 'admin'
    and by_user = (select auth.uid())
    and status = 'pending'
  );
create policy "equipo resuelve solicitudes" on public.plan_requests
  for update to authenticated using ((select public.is_team())) with check ((select public.is_team()));

revoke update on public.plan_requests from authenticated;
grant update (status, resolved_at) on public.plan_requests to authenticated;

-- ─────────────── Pagos ───────────────

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  period text not null check (period ~ '^\d{4}-\d{2}$'),
  amount numeric(12, 2) not null check (amount >= 0),
  paid_at timestamptz not null default now(),
  unique (client_id, period)
);

alter table public.payments enable row level security;

create policy "equipo ve pagos; cliente ve los suyos" on public.payments
  for select to authenticated using ((select public.is_team()) or client_id = (select public.my_client_id()));
create policy "equipo registra pagos" on public.payments
  for insert to authenticated with check ((select public.is_team()));
create policy "equipo corrige pagos" on public.payments
  for update to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "equipo borra pagos" on public.payments
  for delete to authenticated using ((select public.is_team()));
