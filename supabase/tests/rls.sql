-- Pruebas de RLS de la Fase 2. Cada bloque falla con una excepción si algo no se cumple.
\set ON_ERROR_STOP on

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'equipo@peekmedia.do', '{"name":"Dago"}'),
  ('22222222-2222-2222-2222-222222222222', 'cliente@demo.do', '{}');
insert into public.memberships (user_id, org_id, role)
  select '11111111-1111-1111-1111-111111111111', id, 'owner' from public.organizations limit 1;
insert into public.site_content (key, value) values ('faq', '[]');
insert into public.leads (name, business) values ('María Pérez', 'Café Aroma');

do $$ begin
  assert (select count(*) from public.profiles) = 2, 'el trigger crea perfiles';
  assert (select name from public.profiles where email = 'equipo@peekmedia.do') = 'Dago', 'el perfil toma el nombre';
end $$;

-- ── Visitante anónimo ──
set role anon;
do $$ begin
  assert (select count(*) from public.site_content) = 1, 'anon lee el contenido';
  assert (select count(*) from public.leads) = 0, 'anon no ve prospectos';
  begin
    insert into public.leads (name) values ('Spam bot');
    raise exception 'anon no debería poder insertar prospectos';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.site_content (key, value) values ('general', '{}');
    raise exception 'anon no debería escribir contenido';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── Usuario autenticado que NO es del equipo ──
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  assert not public.is_team(), 'un cliente no es del equipo';
  assert (select count(*) from public.leads) = 0, 'un cliente no ve prospectos';
  assert (select count(*) from public.memberships) = 0, 'un cliente no ve membresías ajenas';
  update public.site_content set value = '["hack"]' where key = 'faq';
  assert (select value from public.site_content where key = 'faq') = '[]'::jsonb, 'un cliente no edita contenido';
end $$;
reset role;

-- ── Equipo ──
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin
  assert public.is_team(), 'el owner es del equipo';
  assert (select count(*) from public.leads) = 1, 'el equipo ve prospectos';
  update public.leads set status = 'contacted' where name = 'María Pérez';
  assert (select status from public.leads where name = 'María Pérez') = 'contacted', 'el equipo cambia el estado';
  begin
    update public.leads set status = 'ganado' where name = 'María Pérez';
    raise exception 'un estado inválido debería fallar';
  exception when check_violation then null;
  end;
  begin
    update public.leads set total_monthly = 1 where name = 'María Pérez';
    raise exception 'el equipo solo edita el estado';
  exception when insufficient_privilege then null;
  end;
  insert into public.site_content (key, value) values ('general', '{"whatsapp":"18095551234"}')
    on conflict (key) do update set value = excluded.value;
  update public.site_content set value = '[{"q":"¿Hola?","a":"Sí"}]' where key = 'faq';
  assert (select count(*) from public.site_content) = 2, 'el equipo crea y edita contenido (upsert)';
  begin
    insert into public.site_content (key, value) values ('otra-cosa', '{}');
    raise exception 'una clave desconocida debería fallar';
  exception when check_violation then null;
  end;
end $$;
reset role;

-- ── Servidor con clave secreta (service_role) ──
set role service_role;
insert into public.leads (name, services, total_monthly) values ('Desde el sitio', '[{"id":"redes"}]', 10000);
reset role;
do $$ begin
  assert (select count(*) from public.leads) = 2, 'el servidor inserta prospectos';
  assert (select updated_at > created_at from public.leads where name = 'María Pérez'), 'updated_at se actualiza solo';
end $$;

select 'RLS OK' as resultado;
