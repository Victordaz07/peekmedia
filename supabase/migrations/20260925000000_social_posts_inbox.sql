-- Fases 4–7 · Cuentas sociales, métricas, publicaciones (con estado por red), aprobaciones, bandeja y novedades.

-- ─────────────── Cuentas conectadas ───────────────

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  platform text not null check (platform in ('instagram','facebook','tiktok','youtube','google','linkedin','threads','x','pinterest')),
  mode text not null check (mode in ('meta', 'ayrshare', 'manual', 'demo')),
  status text not null default 'none' check (status in ('none', 'waiting', 'verifying', 'connected')),
  external_id text not null default '',
  account_name text not null default '',
  -- Tokens cifrados (AES-256-GCM) en el servidor. Nunca se leen desde el navegador.
  access_token_enc text,
  refresh_token_enc text,
  expires_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  error text,
  connected_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (client_id, platform)
);

alter table public.social_accounts enable row level security;
create policy "equipo ve cuentas; cliente ve las suyas" on public.social_accounts
  for select to authenticated using ((select public.is_team()) or client_id = (select public.my_client_id()));
-- Solo columnas sin secretos; las escrituras las hace el servidor con la clave secreta.
revoke all on public.social_accounts from anon, authenticated;
grant select (id, client_id, platform, mode, status, external_id, account_name, error, connected_at, updated_at)
  on public.social_accounts to authenticated;

-- Perfil del cliente en el agregador (Ayrshare) y conexiones OAuth a medio terminar: solo servidor.
create table public.integration_profiles (
  client_id uuid not null references public.clients (id) on delete cascade,
  provider text not null,
  profile_key_enc text not null,
  created_at timestamptz not null default now(),
  primary key (client_id, provider)
);

create table public.oauth_pending (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  provider text not null,
  payload_enc text not null,
  expires_at timestamptz not null
);

alter table public.integration_profiles enable row level security;
alter table public.oauth_pending enable row level security;
revoke all on public.integration_profiles, public.oauth_pending from anon, authenticated;

-- ─────────────── Métricas ───────────────

create table public.metrics_daily (
  client_id uuid not null references public.clients (id) on delete cascade,
  platform text not null,
  date date not null,
  metric text not null check (metric in ('followers', 'reach', 'interactions', 'profile_views')),
  value numeric not null,
  primary key (client_id, platform, date, metric)
);

create table public.audience (
  client_id uuid not null references public.clients (id) on delete cascade,
  platform text not null,
  ages jsonb not null default '[]'::jsonb,
  cities jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (client_id, platform)
);

alter table public.metrics_daily enable row level security;
alter table public.audience enable row level security;
create policy "equipo y el propio cliente leen métricas" on public.metrics_daily
  for select to authenticated using ((select public.is_team()) or client_id = (select public.my_client_id()));
create policy "equipo y el propio cliente leen audiencia" on public.audience
  for select to authenticated using ((select public.is_team()) or client_id = (select public.my_client_id()));
revoke insert, update, delete on public.metrics_daily, public.audience from anon, authenticated;

-- ─────────────── Publicaciones ───────────────

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  type text not null check (type in ('post', 'carousel', 'reel', 'story', 'video')),
  caption text not null default '',
  first_comment text not null default '',
  alt_text text not null default '',
  media jsonb not null default '[]'::jsonb,
  platforms text[] not null,
  scheduled_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'changes', 'approved', 'scheduled', 'published', 'failed')),
  version int not null default 1,
  feedback text,
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_client_idx on public.posts (client_id, scheduled_at);
create index posts_due_idx on public.posts (scheduled_at) where status = 'scheduled';

create table public.post_targets (
  post_id uuid not null references public.posts (id) on delete cascade,
  platform text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'published', 'failed', 'manual')),
  external_id text,
  url text,
  error text,
  published_at timestamptz,
  metrics jsonb,
  primary key (post_id, platform)
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  version int not null,
  action text not null check (action in ('approve', 'changes', 'submit')),
  comment text not null default '',
  by_user uuid references auth.users (id) on delete set null,
  by_name text not null default '',
  at timestamptz not null default now()
);

create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

alter table public.posts enable row level security;
alter table public.post_targets enable row level security;
alter table public.approvals enable row level security;

-- El equipo maneja todo. El cliente ve sus publicaciones, menos los borradores.
create policy "equipo gestiona publicaciones" on public.posts for all to authenticated
  using ((select public.is_team())) with check ((select public.is_team()));
create policy "cliente ve sus publicaciones" on public.posts for select to authenticated
  using (client_id = (select public.my_client_id()) and status <> 'draft');

create policy "equipo gestiona destinos" on public.post_targets for all to authenticated
  using ((select public.is_team())) with check ((select public.is_team()));
create policy "cliente ve destinos de sus publicaciones" on public.post_targets for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.client_id = (select public.my_client_id()) and p.status <> 'draft'));

create policy "equipo ve y registra aprobaciones" on public.approvals for all to authenticated
  using ((select public.is_team())) with check ((select public.is_team()));
create policy "cliente ve las aprobaciones de sus publicaciones" on public.approvals for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.client_id = (select public.my_client_id())));

-- Aprobar o pedir cambios: solo Administrador o Aprobador del cliente, y solo piezas por aprobar.
create function public.review_post(p_post_id uuid, p_action text, p_comment text, p_by_name text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_post public.posts;
  v_role text := public.my_client_role();
  v_next text;
begin
  if p_action not in ('approve', 'changes') then
    raise exception 'invalid action';
  end if;
  select * into v_post from public.posts where id = p_post_id for update;
  if v_post.id is null or v_post.client_id is distinct from public.my_client_id() or v_role not in ('admin', 'approver') then
    raise exception 'not allowed';
  end if;
  if v_post.status not in ('pending', 'changes') then
    raise exception 'not pending';
  end if;
  if p_action = 'changes' and char_length(trim(coalesce(p_comment, ''))) = 0 then
    raise exception 'comment required';
  end if;

  v_next := case when p_action = 'changes' then 'changes' when v_post.scheduled_at is not null then 'scheduled' else 'approved' end;
  update public.posts
    set status = v_next, feedback = case when p_action = 'changes' then p_comment else null end
    where id = p_post_id;
  if v_next = 'scheduled' then
    update public.post_targets set status = 'scheduled', error = null where post_id = p_post_id and status <> 'published';
  end if;
  insert into public.approvals (post_id, version, action, comment, by_user, by_name)
    values (p_post_id, v_post.version, p_action, coalesce(p_comment, ''), (select auth.uid()), coalesce(p_by_name, ''));
  return v_next;
end;
$$;

revoke execute on function public.review_post from public, anon;
grant execute on function public.review_post to authenticated;

-- ─────────────── Bandeja ───────────────

create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  platform text not null,
  kind text not null check (kind in ('comment', 'dm', 'review')),
  external_id text not null,
  reply_to text not null default '',
  author text not null default '',
  text text not null default '',
  stars int check (stars between 1 and 5),
  post_ref text,
  received_at timestamptz not null default now(),
  reply text,
  replied_by text,
  replied_at timestamptz,
  unique (platform, external_id)
);

create index inbox_client_idx on public.inbox_items (client_id, received_at desc);

alter table public.inbox_items enable row level security;
create policy "solo equipo" on public.inbox_items for all to authenticated
  using ((select public.is_team())) with check ((select public.is_team()));
create policy "cliente ve sus reseñas" on public.inbox_items for select to authenticated
  using (client_id = (select public.my_client_id()) and kind = 'review');

-- ─────────────── Notas del CM al cliente (Novedades) ───────────────

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  by_user uuid references auth.users (id) on delete set null,
  by_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.client_notes enable row level security;
create policy "equipo escribe notas al cliente" on public.client_notes for all to authenticated
  using ((select public.is_team())) with check ((select public.is_team()));
create policy "cliente lee sus notas" on public.client_notes for select to authenticated
  using (client_id = (select public.my_client_id()));
