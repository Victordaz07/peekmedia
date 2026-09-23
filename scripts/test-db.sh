#!/usr/bin/env bash
# Prueba la migración y las políticas RLS contra un Postgres VACÍO (se crean tablas y roles).
# Uso: DATABASE_URL=postgres://postgres@localhost:5432/peek_test scripts/test-db.sh
set -euo pipefail
: "${DATABASE_URL:?Define DATABASE_URL apuntando a una base de datos vacía de pruebas}"
cd "$(dirname "$0")/.."
run() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$1"; }
run supabase/tests/stub-auth.sql
for f in supabase/migrations/*.sql; do run "$f"; done
for f in supabase/tests/rls*.sql; do run "$f"; done
