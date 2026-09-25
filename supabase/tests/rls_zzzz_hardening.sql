-- Endurecimiento: dueño vs CM, aprobaciones no falsificables, cotizador atómico y auditoría.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values ('f0000000-0000-0000-0000-000000000002', 'cm@hard.test');
insert into public.memberships (user_id, org_id, role)
  select 'f0000000-0000-0000-0000-000000000002', id, 'cm' from public.organizations limit 1;
insert into public.clients (id, name) values
  ('f1000000-0000-0000-0000-000000000001', 'Cliente A'),
  ('f1000000-0000-0000-0000-000000000002', 'Cliente B');
insert into public.posts (id, client_id, type, caption, platforms, status, created_by, created_by_name)
  select 'f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'post', 'Hola', '{instagram}', 'pending',
         '11111111-1111-1111-1111-111111111111', 'Dago';

-- ── Un CM no borra clientes ni falsifica aprobaciones ──
set role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000002', false);
do $$ begin
  assert public.is_team() and not public.is_owner(), 'la sesión es de un CM';
  delete from public.clients where id = 'f1000000-0000-0000-0000-000000000001';
  assert exists (select 1 from public.clients where id = 'f1000000-0000-0000-0000-000000000001'), 'un CM no borra clientes';
  insert into public.approvals (post_id, version, action) values ('f2000000-0000-0000-0000-000000000001', 1, 'submit');
  begin
    insert into public.approvals (post_id, version, action) values ('f2000000-0000-0000-0000-000000000001', 1, 'approve');
    raise exception 'el equipo no debería registrar un aprobado';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.audit_log;
    assert (select count(*) from public.audit_log) = 0, 'un CM no ve la auditoría';
  end;
  begin
    perform public.take_quote_attempt('x');
    raise exception 'el equipo no debería llamar take_quote_attempt';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── El dueño sí borra, y la auditoría lo registra con su nombre ──
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin
  assert public.is_owner(), 'la sesión es del dueño';
  delete from public.clients where id = 'f1000000-0000-0000-0000-000000000002';
  assert not exists (select 1 from public.clients where id = 'f1000000-0000-0000-0000-000000000002'), 'el dueño borra clientes';
  assert exists (
    select 1 from public.audit_log
    where table_name = 'clients' and action = 'DELETE' and row_id = 'f1000000-0000-0000-0000-000000000002'
      and actor = '11111111-1111-1111-1111-111111111111' and old_data ->> 'name' = 'Cliente B'
  ), 'la auditoría guarda quién borró y qué había';
  begin
    delete from public.audit_log;
    raise exception 'nadie debería borrar la auditoría';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── Cotizador: el límite se cumple exacto ──
do $$
declare ok int := 0;
begin
  for i in 1..5 loop
    if public.take_quote_attempt('visitante-1') then ok := ok + 1; end if;
  end loop;
  assert ok = 3, format('pasan 3 cotizaciones cada 10 minutos, pasaron %s', ok);
  assert public.take_quote_attempt('visitante-2'), 'otro visitante no se afecta';
end $$;

select 'RLS endurecimiento OK' as resultado;
