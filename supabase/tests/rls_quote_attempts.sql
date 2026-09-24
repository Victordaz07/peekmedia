-- Límite del cotizador: nadie fuera del servidor ve ni escribe los intentos.
\set ON_ERROR_STOP on

insert into public.quote_attempts (ip_hash) values ('hash-de-prueba');

set role anon;
do $$ begin
  begin
    perform count(*) from public.quote_attempts;
    raise exception 'anon no debería leer los intentos';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.quote_attempts (ip_hash) values ('otro');
    raise exception 'anon no debería registrar intentos';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- El equipo tampoco: son datos del servidor.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin
  assert public.is_team(), 'la sesión es del equipo';
  begin
    perform count(*) from public.quote_attempts;
    raise exception 'el equipo no debería leer los intentos';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

do $$ begin
  assert (select count(*) from public.quote_attempts) = 1, 'el servidor ve los intentos';
end $$;
