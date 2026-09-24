-- Datos de demostración: solo el servidor marca clientes como demo, y solo sus firmas se pueden borrar.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('d0000000-0000-0000-0000-000000000001', 'real-admin@demo.test'),
  ('d0000000-0000-0000-0000-000000000002', 'demo-admin@demo.test');
insert into public.clients (id, name) values ('d1000000-0000-0000-0000-000000000001', 'Cliente real');
insert into public.clients (id, name, is_demo) values ('d1000000-0000-0000-0000-000000000002', 'Cliente demo', true);
insert into public.client_users (client_id, user_id, name, email, role) values
  ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Admin real', 'real-admin@demo.test', 'admin'),
  ('d1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'Admin demo', 'demo-admin@demo.test', 'admin');
insert into public.contracts (id, client_id, version, plan_id, plan_name, price, start_date, months, billing_day, payment_method, deliverables, status) values
  ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 1, 'basico', 'Plan Básico', 12000, '2026-01-01', 6, 5, 'Transferencia bancaria', '{}', 'sent'),
  ('d2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 1, 'basico', 'Plan Básico', 12000, '2026-01-01', 6, 5, 'Transferencia bancaria', '{}', 'sent');
select public.sign_contract('d2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Admin real', 'admin', 'typed', null, '', '', encode(sha256(convert_to('doc real', 'UTF8')), 'hex'), 'SIG-REAL', 'doc real');
select public.sign_contract('d2000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'Admin demo', 'admin', 'typed', null, '', '', encode(sha256(convert_to('doc demo', 'UTF8')), 'hex'), 'SIG-DEMO', 'doc demo');

-- ── El equipo no puede crear ni marcar clientes como demo ──
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin
  assert public.is_team(), 'la sesión es del equipo';
  begin
    insert into public.clients (name, is_demo) values ('Colado', true);
    raise exception 'el equipo no debería crear clientes demo';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.clients set is_demo = true where id = 'd1000000-0000-0000-0000-000000000001';
    raise exception 'el equipo no debería marcar un cliente como demo';
  exception when insufficient_privilege then null;
  end;
  update public.clients set industry = 'Cafetería' where id = 'd1000000-0000-0000-0000-000000000001';
  assert (select industry from public.clients where id = 'd1000000-0000-0000-0000-000000000001') = 'Cafetería', 'el equipo sigue editando clientes';
  delete from public.signatures;
  assert (select count(*) from public.signatures where contract_id::text like 'd2%') = 2, 'el equipo no borra firmas';
end $$;
reset role;

-- ── Servidor: la firma real sigue siendo imborrable; la demo se borra con su cliente ──
do $$ begin
  begin
    delete from public.signatures where contract_id = 'd2000000-0000-0000-0000-000000000001';
    raise exception 'la firma de un cliente real no debería borrarse';
  exception when raise_exception then
    if sqlerrm not like 'Las firmas no se pueden%' then raise; end if;
  end;
  begin
    update public.signatures set signer_name = 'Otro nombre' where contract_id = 'd2000000-0000-0000-0000-000000000002';
    raise exception 'la firma demo tampoco se edita';
  exception when raise_exception then
    if sqlerrm not like 'Las firmas no se pueden%' then raise; end if;
  end;
  delete from public.signatures where contract_id = 'd2000000-0000-0000-0000-000000000002';
  delete from public.clients where id = 'd1000000-0000-0000-0000-000000000002';
  assert not exists (select 1 from public.clients where id = 'd1000000-0000-0000-0000-000000000002'), 'se borra el cliente demo';
  assert exists (select 1 from public.signatures where contract_id = 'd2000000-0000-0000-0000-000000000001'), 'la firma real sigue ahí';
end $$;

select 'RLS demo OK' as resultado;
