-- Anular o finalizar contratos: solo el servidor con una solicitud confirmada del dueño; nada se borra.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('e0000000-0000-0000-0000-000000000001', 'admin@fin.test'),
  ('e0000000-0000-0000-0000-000000000002', 'cm@fin.test');
insert into public.memberships (user_id, org_id, role)
  select 'e0000000-0000-0000-0000-000000000002', id, 'cm' from public.organizations limit 1;
insert into public.clients (id, name) values ('e1000000-0000-0000-0000-000000000001', 'Cliente que termina');
insert into public.client_users (client_id, user_id, name, email, role) values
  ('e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Admin fin', 'admin@fin.test', 'admin');
insert into public.contracts (id, client_id, version, plan_id, plan_name, price, start_date, months, billing_day, payment_method, deliverables, status) values
  ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 1, 'basico', 'Plan Básico', 12000, '2026-01-01', 6, 5, 'Transferencia bancaria', '{}', 'sent'),
  ('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 2, 'basico', 'Plan Básico', 12000, '2026-01-01', 6, 5, 'Transferencia bancaria', '{}', 'sent');
select public.sign_contract('e2000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Admin fin', 'admin', 'typed', null, '', '', encode(sha256(convert_to('doc fin', 'UTF8')), 'hex'), 'SIG-FIN', 'doc fin');

-- Solicitudes (las crea el servidor): la del dueño para finalizar la v2, una vencida y una del CM.
insert into public.contract_end_requests (id, contract_id, action, reason, end_date, requested_by, requested_by_name, token_hash, expires_at) values
  ('e3000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000002', 'terminate', 'El cliente cerró el negocio', '2026-09-30', '11111111-1111-1111-1111-111111111111', 'Dago', repeat('a', 64), now() + interval '30 minutes'),
  ('e3000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'terminate', 'Solicitud que ya venció', '2026-09-30', '11111111-1111-1111-1111-111111111111', 'Dago', repeat('b', 64), now() - interval '1 minute'),
  ('e3000000-0000-0000-0000-000000000003', 'e2000000-0000-0000-0000-000000000002', 'terminate', 'El CM intenta finalizar', '2026-09-30', 'e0000000-0000-0000-0000-000000000002', 'CM', repeat('c', 64), now() + interval '30 minutes'),
  ('e3000000-0000-0000-0000-000000000004', 'e2000000-0000-0000-0000-000000000001', 'void', 'Anular la versión 1 enviada', '2026-09-30', '11111111-1111-1111-1111-111111111111', 'Dago', repeat('d', 64), now() + interval '30 minutes');

-- ── El equipo no puede hacerlo por su cuenta ──
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin
  assert public.is_team(), 'la sesión es del equipo (dueño)';
  update public.contracts set status = 'terminated' where id = 'e2000000-0000-0000-0000-000000000002';
  assert (select status from public.contracts where id = 'e2000000-0000-0000-0000-000000000002') = 'signed', 'el equipo no finaliza un firmado por su cuenta';
  begin
    update public.contracts set status = 'voided' where id = 'e2000000-0000-0000-0000-000000000001';
    raise exception 'el equipo no debería anular por su cuenta';
  exception when insufficient_privilege or check_violation then null;
  end;
  begin
    perform 1 from public.contract_end_requests;
    raise exception 'el equipo no debería leer las solicitudes';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.end_contract('e3000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111');
    raise exception 'el equipo no debería llamar end_contract';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.owner_checks;
    raise exception 'el equipo no debería leer los intentos';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── Servidor: solo solicitudes vigentes, del mismo dueño y en el estado correcto ──
do $$
declare v text;
begin
  begin
    perform public.end_contract('e3000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111');
    raise exception 'una solicitud vencida no debería servir';
  exception when raise_exception then if sqlerrm <> 'request not valid' then raise; end if;
  end;
  begin
    perform public.end_contract('e3000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002');
    raise exception 'otra persona no debería usar la solicitud del dueño';
  exception when raise_exception then if sqlerrm <> 'request not valid' then raise; end if;
  end;
  begin
    perform public.end_contract('e3000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002');
    raise exception 'un CM no debería finalizar';
  exception when raise_exception then if sqlerrm <> 'not owner' then raise; end if;
  end;

  v := public.end_contract('e3000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111');
  assert v = 'terminated', 'se finaliza el firmado';
  assert (select end_reason from public.contracts where id = 'e2000000-0000-0000-0000-000000000002') = 'El cliente cerró el negocio', 'guarda el motivo';
  assert exists (select 1 from public.signatures where contract_id = 'e2000000-0000-0000-0000-000000000002'), 'la firma se conserva';
  assert (select expires_at <= now() from public.contract_end_requests where id = 'e3000000-0000-0000-0000-000000000003'), 'los otros enlaces del contrato dejan de servir';
  begin
    perform public.end_contract('e3000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111');
    raise exception 'un enlace no se usa dos veces';
  exception when raise_exception then if sqlerrm <> 'request not valid' then raise; end if;
  end;

  v := public.end_contract('e3000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111');
  assert v = 'voided', 'se anula el enviado';
  begin
    perform public.sign_contract('e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Admin fin', 'admin', 'typed', null, '', '', encode(sha256(convert_to('doc v1', 'UTF8')), 'hex'), 'SIG-V1', 'doc v1');
    raise exception 'un contrato anulado no se puede firmar';
  exception when raise_exception then if sqlerrm like 'un contrato anulado%' then raise; end if;
  end;
end $$;

-- ── El cliente ve el contrato finalizado ──
set role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000001', false);
do $$ begin
  assert (select status from public.contracts where id = 'e2000000-0000-0000-0000-000000000002') = 'terminated', 'el cliente ve que terminó';
  begin
    perform 1 from public.contract_end_requests;
    raise exception 'el cliente no debería leer las solicitudes';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'RLS fin de contrato OK' as resultado;
