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
- Toda página o acción del equipo empieza con `requireTeam()`; las del espacio de un cliente con `requireClientAccess(clientId)`. RLS es la segunda barrera (`supabase/migrations`).
- Nunca muestres contratos en borrador, notas ni tareas a un cliente (filtra también en el servidor, no solo con RLS).
- Las firmas son inmutables: el documento firmado se muestra desde `signature.document`, no se regenera.
- Pruebas: `npm test` (unitarias) y `scripts/test-db.sh` (RLS contra un Postgres vacío).
- Fechas y números que se renderizan en servidor y cliente: sin `Intl`/`toLocale*` con es-DO (desajuste de hidratación); usa `src/lib/format.ts` y `money()`.
- Tokens de redes: solo en el servidor, cifrados con `encryptSecret` (`src/lib/crypto.ts`). Nunca los devuelvas a un componente ni a una acción (`listAccounts` ya los excluye).
- Redes: Instagram/Facebook por Meta (`src/lib/integrations/meta.ts`); el resto por Ayrshare. Reglas por red en `src/lib/social/platforms.ts` y `validate.ts` (se usan en el editor y en el servidor).
- Horas de publicación en hora de RD (UTC−4): usa `toRDInput`/`fromRDInput`/`ymdRD` de `src/lib/format.ts`.
- Tareas programadas en `src/app/api/cron/*` con `cronAllowed()`; webhooks verifican la firma antes de leer el cuerpo.
