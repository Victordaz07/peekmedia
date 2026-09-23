@AGENTS.md

# Peek Media

- Spec: `docs/handoff/README.md` (prototipos en `docs/handoff/prototipos/`, solo referencia; no copiar estilos inline).
- UI en español dominicano, tuteando. `lang="es-DO"`.
- Usa los componentes de `@/components/ui` y los tokens de `src/app/globals.css`; no inventes colores ni sombras nuevos.
- Coral siempre con texto ink (nunca blanco, salvo texto display grande). Errores con `coral-strong`.
- Estados de contenido, clientes, contratos, conexión y pagos: `src/lib/design/tokens.ts`.
- Texturas solo en superficies decorativas, nunca detrás de tablas ni formularios.
- Antes de hacer push: `npm run lint && npm run build`.
- Datos: siempre por `src/lib/data/*` (Supabase o modo local en `.data/`). Nunca leas Supabase directo desde componentes.
- Cache Components está activo: lo que lee cookies va dentro de `<Suspense>`; el contenido público usa `"use cache"` + `updateTag`.
- Toda página o acción del equipo empieza con `requireTeam()`; RLS es la segunda barrera (`supabase/migrations`).
- Pruebas: `npm test` (unitarias) y `scripts/test-db.sh` (RLS contra un Postgres vacío).
- Fechas y números que se renderizan en servidor y cliente: sin `Intl`/`toLocale*` con es-DO (desajuste de hidratación); usa `src/lib/format.ts` y `money()`.
