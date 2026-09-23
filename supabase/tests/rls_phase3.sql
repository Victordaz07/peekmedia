-- Pruebas de RLS de la Fase 3: aislamiento entre clientes, contratos y firmas.
\set ON_ERROR_STOP on

-- Usuarios: 1 equipo (ya existe en rls.sql), 3 = admin de Café, 4 = lectura de Café, 5 = admin de Torre.
insert into auth.users (id, email) values
  ('33333333-3333-3333-3333-333333333333', 'ana@cafe.do'),
  ('44444444-4444-4444-4444-444444444444', 'luis@cafe.do'),
  ('55555555-5555-5555-5555-555555555555', 'eva@torre.do');

insert into public.clients (id, name, platforms) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Café Aroma', '{instagram,facebook}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Torre Mar', '{instagram}');

-- Como el servidor (clave secreta): crea los accesos.
set role service_role;
insert into public.client_users (client_id, user_id, name, email, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Ana', 'ana@cafe.do', 'admin'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'Luis', 'luis@cafe.do', 'viewer'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'Eva', 'eva@torre.do', 'admin');
reset role;

-- ── Equipo: crea contratos ──
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into public.contracts (id, client_id, version, plan_id, plan_name, price, start_date, months, billing_day, payment_method, deliverables)
values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1, 'basico', 'Plan Básico', 12000, '2026-10-01', 6, 5, 'Transferencia bancaria', '{}'),
  ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 1, 'estrategico', 'Plan Estratégico', 25000, '2026-10-01', 12, 5, 'Transferencia bancaria', '{}');
do $$ begin
  assert (select count(*) from public.clients) = 2, 'el equipo ve todos los clientes';
  assert (select number from public.contracts where id = 'cccccccc-0000-0000-0000-000000000001') like 'PM-10%', 'número PM-XXXX automático';
  begin
    insert into public.client_users (client_id, user_id, name, email, role)
    values ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'X', 'x@x.do', 'admin');
    raise exception 'el equipo no inserta accesos directo (lo hace el servidor)';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── Admin de Café: no ve borradores ──
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
do $$ begin
  assert (select count(*) from public.clients) = 1, 'un cliente solo ve su espacio';
  assert (select name from public.clients) = 'Café Aroma', 'y es el suyo';
  assert (select count(*) from public.contracts) = 0, 'el cliente no ve contratos en borrador';
  assert (select count(*) from public.client_users) = 1, 'el cliente solo ve su propio acceso';
  assert (select count(*) from public.notes) = 0, 'el cliente no ve notas internas';
end $$;
reset role;

-- ── Equipo envía los dos contratos ──
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
update public.contracts set status = 'sent', sent_at = now();
insert into public.notes (client_id, text, by_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Nota interna', 'Dago');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
do $$ begin
  assert (select count(*) from public.contracts) = 1, 'ya enviado, el cliente ve solo su contrato';
  assert (select plan_name from public.contracts) = 'Plan Básico', 'el de su espacio';
  update public.contracts set price = 1;
  assert (select price from public.contracts) = 12000, 'el cliente no edita el contrato';
  begin
    insert into public.signatures (contract_id, signer_user_id, signer_name, signer_role, method, doc_sha256, verification_code, document)
    values ('cccccccc-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Ana Pérez', 'admin', 'typed', repeat('a', 64), 'X1', 'doc');
    raise exception 'el cliente no inserta firmas directo';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.sign_contract('cccccccc-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Ana Pérez', 'admin', 'typed', null, '', '', encode(sha256(convert_to('doc', 'UTF8')), 'hex'), 'X2', 'doc');
    raise exception 'el cliente no llama sign_contract (solo el servidor)';
  exception when insufficient_privilege then null;
  end;
  -- Solicitud de cambio de plan: solo Administrador y para su cliente.
  insert into public.plan_requests (client_id, type, target, by_user, by_name)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'plan', 'premium', '33333333-3333-3333-3333-333333333333', 'Ana');
  begin
    insert into public.plan_requests (client_id, type, target, by_user, by_name)
      values ('bbbbbbbb-0000-0000-0000-000000000002', 'plan', 'premium', '33333333-3333-3333-3333-333333333333', 'Ana');
    raise exception 'no puede pedir cambios para otro cliente';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── Solo lectura de Café: no puede solicitar ──
set role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
do $$ begin
  begin
    insert into public.plan_requests (client_id, type, target, by_user, by_name)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'addon', 'Página web', '44444444-4444-4444-4444-444444444444', 'Luis');
    raise exception 'solo lectura no puede solicitar';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── Servidor firma (sign_contract) ──
set role service_role;
do $$ begin
  begin
    perform public.sign_contract('cccccccc-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Ana Pérez', 'admin', 'typed', null, '', '', repeat('f', 64), 'X9', 'doc');
    raise exception 'un hash que no corresponde al documento debería fallar';
  exception when raise_exception then
    if sqlerrm not like '%hash mismatch%' then raise; end if;
  end;
  begin
    perform public.sign_contract('cccccccc-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'Luis Gómez', 'viewer', 'typed', null, '', '', encode(sha256(convert_to('doc', 'UTF8')), 'hex'), 'X3', 'doc');
    raise exception 'solo lectura no debería poder firmar';
  exception when raise_exception then
    if sqlerrm not like '%signer not allowed%' then raise; end if;
  end;
  begin
    perform public.sign_contract('cccccccc-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'Eva Martínez', 'admin', 'typed', null, '', '', encode(sha256(convert_to('doc', 'UTF8')), 'hex'), 'X4', 'doc');
    raise exception 'un admin de otro cliente no debería poder firmar';
  exception when raise_exception then
    if sqlerrm not like '%signer not allowed%' then raise; end if;
  end;
end $$;
select public.sign_contract('cccccccc-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Ana Pérez', 'admin', 'drawn',
  'data:image/png;base64,AAAA', '203.0.113.9', 'Playwright', encode(sha256(convert_to('doc', 'UTF8')), 'hex'), 'SIG-OK', 'doc') is not null as firmado;
do $$ begin
  assert (select status from public.contracts where id = 'cccccccc-0000-0000-0000-000000000001') = 'signed', 'queda firmado';
  begin
    perform public.sign_contract('cccccccc-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Ana Pérez', 'admin', 'typed', null, '', '', encode(sha256(convert_to('doc', 'UTF8')), 'hex'), 'SIG-2', 'doc');
    raise exception 'no se firma dos veces';
  exception when raise_exception then
    if sqlerrm not like '%not pending%' then raise; end if;
  end;
  begin
    update public.signatures set signer_name = 'Otra persona';
    raise exception 'las firmas son inmutables';
  exception when raise_exception then
    if sqlerrm not like '%no se pueden modificar%' then raise; end if;
  end;
  begin
    delete from public.signatures;
    raise exception 'las firmas no se borran';
  exception when raise_exception then
    if sqlerrm not like '%no se pueden modificar%' then raise; end if;
  end;
end $$;
reset role;

-- ── Nueva versión: al firmarla, la anterior pasa al historial ──
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin
  update public.contracts set price = 1 where id = 'cccccccc-0000-0000-0000-000000000001';
  assert (select price from public.contracts where id = 'cccccccc-0000-0000-0000-000000000001') = 12000, 'un contrato firmado no se edita';
end $$;
insert into public.contracts (id, client_id, number, version, plan_id, plan_name, price, start_date, months, billing_day, payment_method, deliverables, status)
  select 'cccccccc-0000-0000-0000-000000000003', client_id, number, 2, 'premium', 'Plan Premium', 45000, '2026-11-01', 12, 5, 'Transferencia bancaria', '{}', 'draft'
  from public.contracts where id = 'cccccccc-0000-0000-0000-000000000001';
update public.contracts set status = 'sent', sent_at = now() where id = 'cccccccc-0000-0000-0000-000000000003';
update public.plan_requests set status = 'approved', resolved_at = now();
reset role;

set role service_role;
select public.sign_contract('cccccccc-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Ana Pérez', 'admin', 'typed', null, '', '', encode(sha256(convert_to('doc', 'UTF8')), 'hex'), 'SIG-V2', 'doc') is not null as firmado_v2;
reset role;

do $$ begin
  assert (select status from public.contracts where id = 'cccccccc-0000-0000-0000-000000000001') = 'superseded', 'v1 pasa al historial';
  assert (select status from public.contracts where id = 'cccccccc-0000-0000-0000-000000000003') = 'signed', 'v2 queda vigente';
  assert (select number from public.contracts where id = 'cccccccc-0000-0000-0000-000000000003')
       = (select number from public.contracts where id = 'cccccccc-0000-0000-0000-000000000001'), 'misma numeración';
end $$;

-- ── Eva (Torre) no ve nada de Café ──
set role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', false);
do $$ begin
  assert (select count(*) from public.signatures) = 0, 'no ve firmas de otro cliente';
  assert (select count(*) from public.plan_requests) = 0, 'no ve solicitudes de otro cliente';
  assert (select count(*) from public.contracts) = 1, 'solo ve su contrato';
end $$;
reset role;

-- ── Acceso desactivado: pierde todo ──
update public.client_users set active = false where user_id = '33333333-3333-3333-3333-333333333333';
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
do $$ begin
  assert (select count(*) from public.clients) = 0, 'un acceso desactivado no ve el cliente';
  assert (select count(*) from public.contracts) = 0, 'ni los contratos';
end $$;
reset role;

-- Borrar el usuario de quien firmó no rompe la firma.
delete from auth.users where id = '33333333-3333-3333-3333-333333333333';
do $$ begin
  assert (select count(*) from public.signatures) = 2, 'las firmas sobreviven';
end $$;

select 'RLS fase 3 OK' as resultado;
