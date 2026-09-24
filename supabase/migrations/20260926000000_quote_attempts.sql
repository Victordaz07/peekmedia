-- Límite de cotizaciones por visitante (contra spam del cotizador).
-- Solo guarda un HMAC de la IP, nunca la IP. Los intentos de más de 2 días se borran solos.
create table public.quote_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index quote_attempts_ip_created_idx on public.quote_attempts (ip_hash, created_at desc);
create index quote_attempts_created_idx on public.quote_attempts (created_at);

-- Sin políticas: nadie la lee ni la escribe desde el navegador. Solo el servidor con la clave secreta.
alter table public.quote_attempts enable row level security;
revoke all on public.quote_attempts from anon, authenticated;
