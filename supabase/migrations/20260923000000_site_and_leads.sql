-- Fase 2 · Sitio, CMS y prospectos
-- Equipo mínimo (organización + membresías) para que RLS sepa quién es del equipo.
-- La Fase 3 amplía esto con clientes, accesos por cliente y contratos.

-- ─────────────── Equipo ───────────────

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

create table public.memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  role text not null check (role in ('owner', 'cm')),
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

-- Perfil automático al crear un usuario en Auth.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), coalesce(new.email, ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ¿El usuario actual es del equipo de Peek? security definer para no depender de las políticas de memberships.
create function public.is_team() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.user_id = (select auth.uid()));
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

create policy "equipo ve su organización" on public.organizations
  for select to authenticated using (
    exists (select 1 from public.memberships m where m.org_id = id and m.user_id = (select auth.uid()))
  );

create policy "cada quien ve su perfil; el equipo ve todos" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_team()));

create policy "cada quien edita su perfil" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "cada quien ve su membresía; el equipo ve todas" on public.memberships
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_team()));

-- Las membresías solo se crean desde el panel de Supabase o con la clave secreta (sin políticas de escritura).

-- ─────────────── Contenido del sitio (CMS) ───────────────

create table public.site_content (
  key text primary key check (
    key in ('general', 'plans', 'posts', 'process', 'case', 'logos', 'testimonials', 'faq', 'quoteServices')
  ),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.site_content enable row level security;

create policy "contenido público" on public.site_content
  for select to anon, authenticated using (true);

create policy "el equipo crea contenido" on public.site_content
  for insert to authenticated with check ((select public.is_team()));

create policy "el equipo edita contenido" on public.site_content
  for update to authenticated using ((select public.is_team())) with check ((select public.is_team()));

-- ─────────────── Prospectos (cotizador) ───────────────

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  business text not null default '' check (char_length(business) <= 120),
  notes text not null default '' check (char_length(notes) <= 1500),
  services jsonb not null default '[]'::jsonb check (jsonb_typeof(services) = 'array'),
  total_monthly numeric(12, 2) not null default 0 check (total_monthly >= 0),
  total_once numeric(12, 2) not null default 0 check (total_once >= 0),
  source text not null default 'cotizador',
  status text not null default 'new' check (status in ('new', 'contacted', 'proposal', 'won', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_created_at_idx on public.leads (created_at desc);
create index leads_status_idx on public.leads (status);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

alter table public.leads enable row level security;

-- Sin política de insert: los visitantes no pueden escribir directo en la tabla.
-- El servidor valida la cotización y la guarda con la clave secreta (salta RLS).
create policy "el equipo ve prospectos" on public.leads
  for select to authenticated using ((select public.is_team()));

create policy "el equipo actualiza prospectos" on public.leads
  for update to authenticated using ((select public.is_team())) with check ((select public.is_team()));

create policy "el equipo borra prospectos" on public.leads
  for delete to authenticated using ((select public.is_team()));

-- Solo el estado (y la fecha de actualización) se editan desde el panel.
revoke update on public.leads from authenticated;
grant update (status) on public.leads to authenticated;

-- Organización inicial.
insert into public.organizations (name) values ('Peek Media');
