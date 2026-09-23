-- Pruebas de RLS de las fases 4–7: tokens, publicaciones, aprobaciones, bandeja y métricas.
-- Reusa los datos de rls_phase3.sql: Café (aaaa…1) con Luis (viewer); Ana (admin) fue borrada; Torre (bbbb…2) con Eva (admin).
\set ON_ERROR_STOP on

-- Nueva aprobadora de Café.
insert into auth.users (id, email) values ('66666666-6666-6666-6666-666666666666', 'rosa@cafe.do');
set role service_role;
insert into public.client_users (client_id, user_id, name, email, role)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666', 'Rosa', 'rosa@cafe.do', 'approver');
update public.client_users set active = true where email = 'luis@cafe.do';
insert into public.social_accounts (client_id, platform, mode, status, account_name, access_token_enc)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'instagram', 'meta', 'connected', 'cafe.aroma', 'v1.secreto');
insert into public.metrics_daily values ('aaaaaaaa-0000-0000-0000-000000000001', 'instagram', '2026-09-01', 'followers', 4200);
insert into public.metrics_daily values ('bbbbbbbb-0000-0000-0000-000000000002', 'instagram', '2026-09-01', 'followers', 9000);
reset role;

-- ── Equipo crea publicaciones ──
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into public.posts (id, client_id, type, caption, platforms, status, scheduled_at) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'post', 'Borrador', '{instagram}', 'draft', null),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'reel', 'Por aprobar', '{instagram}', 'pending', now() + interval '2 days'),
  ('dddddddd-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002', 'post', 'De Torre', '{instagram}', 'pending', null);
insert into public.post_targets (post_id, platform, status) values ('dddddddd-0000-0000-0000-000000000002', 'instagram', 'scheduled');
insert into public.inbox_items (client_id, platform, kind, external_id, author, text) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'instagram', 'comment', 'c1', 'María', '¿Precio?'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'google', 'review', 'r1', 'José', 'Excelente');
do $$ begin
  begin
    perform access_token_enc from public.social_accounts;
    raise exception 'ni el equipo lee tokens desde el navegador';
  exception when insufficient_privilege then null;
  end;
  assert (select account_name from public.social_accounts limit 1) = 'cafe.aroma', 'el equipo ve la cuenta sin el token';
end $$;
reset role;

-- ── Luis (solo lectura de Café) ──
set role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
do $$ begin
  assert (select count(*) from public.posts) = 1, 'el cliente ve solo sus publicaciones y sin borradores';
  assert (select count(*) from public.metrics_daily) = 1, 'solo sus métricas';
  assert (select count(*) from public.inbox_items) = 1, 'de la bandeja solo ve sus reseñas';
  assert (select count(*) from public.post_targets) = 1, 've los destinos de sus publicaciones';
  begin
    perform public.review_post('dddddddd-0000-0000-0000-000000000002', 'approve', '', 'Luis');
    raise exception 'solo lectura no aprueba';
  exception when raise_exception then
    if sqlerrm not like '%not allowed%' then raise; end if;
  end;
  update public.posts set status = 'scheduled';
  assert (select status from public.posts) = 'pending', 'el cliente no cambia estados directo';
end $$;
reset role;

-- ── Rosa (aprobadora de Café) ──
set role authenticated;
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', false);
do $$ begin
  begin
    perform public.review_post('dddddddd-0000-0000-0000-000000000002', 'changes', '  ', 'Rosa');
    raise exception 'pedir cambios exige comentario';
  exception when raise_exception then
    if sqlerrm not like '%comment required%' then raise; end if;
  end;
  begin
    perform public.review_post('dddddddd-0000-0000-0000-000000000003', 'approve', '', 'Rosa');
    raise exception 'no aprueba piezas de otro cliente';
  exception when raise_exception then
    if sqlerrm not like '%not allowed%' then raise; end if;
  end;
  assert public.review_post('dddddddd-0000-0000-0000-000000000002', 'changes', 'Cambia el precio', 'Rosa') = 'changes', 'pide cambios';
  assert (select feedback from public.posts where id = 'dddddddd-0000-0000-0000-000000000002') = 'Cambia el precio', 'queda el comentario';
  assert public.review_post('dddddddd-0000-0000-0000-000000000002', 'approve', '', 'Rosa') = 'scheduled', 'aprobar con fecha lo programa';
  begin
    perform public.review_post('dddddddd-0000-0000-0000-000000000002', 'approve', '', 'Rosa');
    raise exception 'no se aprueba dos veces';
  exception when raise_exception then
    if sqlerrm not like '%not pending%' then raise; end if;
  end;
  assert (select count(*) from public.approvals) = 2, 've el historial de sus aprobaciones';
end $$;
reset role;

-- ── Eva (Torre) no ve nada de Café ──
set role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', false);
do $$ begin
  assert (select count(*) from public.approvals) = 0, 'no ve aprobaciones ajenas';
  assert (select count(*) from public.social_accounts) = 0, 'no ve cuentas ajenas';
  assert (select count(*) from public.metrics_daily) = 1, 've solo sus métricas';
end $$;
reset role;

select 'RLS fases 4–7 OK' as resultado;
