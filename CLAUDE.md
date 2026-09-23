@AGENTS.md

# Peek Media

- Spec: `docs/handoff/README.md` (prototipos en `docs/handoff/prototipos/`, solo referencia; no copiar estilos inline).
- UI en español dominicano, tuteando. `lang="es-DO"`.
- Usa los componentes de `@/components/ui` y los tokens de `src/app/globals.css`; no inventes colores ni sombras nuevos.
- Coral siempre con texto ink (nunca blanco, salvo texto display grande). Errores con `coral-strong`.
- Estados de contenido, clientes, contratos, conexión y pagos: `src/lib/design/tokens.ts`.
- Texturas solo en superficies decorativas, nunca detrás de tablas ni formularios.
- Antes de hacer push: `npm run lint && npm run build`.
