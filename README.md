# Peek Media

Sitio público, CMS/CRM y plataforma de clientes para **Peek Media**, agencia de marketing digital en Santo Domingo, RD.

La especificación completa está en [`docs/handoff/README.md`](docs/handoff/README.md): prototipos HTML, marca, auditoría UX y qué permite cada API.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4, con los tokens en `src/app/globals.css` (`@theme`)
- `lucide-react` para íconos
- Más adelante: Supabase (Postgres, Auth, Storage y RLS), Resend y Vercel

## Desarrollo

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_SITE_URL
npm run dev                  # http://localhost:3000
npm run lint
npm run build
```

- `/`: portada provisional
- `/sistema`: catálogo vivo del sistema de diseño (no indexado)

## Estructura

```
src/
  app/
    globals.css          Tokens (color, tipo, radios, sombras, movimiento) + base de accesibilidad
    layout.tsx           Fuentes (Space Grotesk, DM Sans, Caveat), lang="es-DO", metadata, ToastProvider
    sistema/             Página de muestra de los componentes
  components/ui/         Componentes del sistema (importa desde "@/components/ui")
  lib/
    cn.ts                Unión de clases (clsx + tailwind-merge)
    design/tokens.ts     Redes, límites de caracteres y vocabulario único de estados
    site.ts              URL pública configurable
public/brand/            Logo WebP, ícono y texturas
docs/handoff/            Handoff de diseño original (solo referencia)
```

## Sistema de diseño (Fase 1)

**Tokens:** `ink`, `coral`, `coral-strong`, `coral-tint`, `cyan`, `cyan-tint`, `sand`, `surface`, `ocean`, `hairline`, `line`, `muted`, `net-*`. Tamaños de texto de `eyebrow` a `display-lg`; radios `sm`, `item`, `md`, `modal` y `lg`; dos sombras (`elevated`, `hover`); curva `ease-reveal`.

**Componentes:** Button/ButtonLink (primary, dark, secondary, outline, ghost, destructive, más estados de carga y deshabilitado), Badge/StatusBadge/TrendPill, Card, Field + Input/Textarea/Select/Checkbox, Segmented (tabs), SelectableCard (cotizador), NetworkChip, Avatar, Accordion (FAQ), UsageBar, KpiCard, LineChart/Sparkline, Table, Modal/Drawer/ConfirmDialog, Toast (con "Deshacer"), EmptyState/ErrorState/LoadingState, Skeleton/Spinner, Eyebrow, Logo/LogoMark, Reveal.

**Correcciones obligatorias ya aplicadas:**
- Texto ink sobre coral en los CTA (5.4:1). Para errores y el botón destructivo se añadió `coral-strong` #D6353C (4.7:1).
- Foco visible: anillo cian de 2px.
- `prefers-reduced-motion` apaga el marquee, el reveal, el pulso y la flotación.
- Cards del cotizador con `role="checkbox"`; FAQ con `aria-expanded`.
- Modales y toasts propios en lugar de `prompt()` y `confirm()`.
- Estados vacío, de carga y de error.
- Logo en WebP: pasó de 323 KB a 17 KB. `lang="es-DO"` y metadata base.

## Fases

- [x] **1 · Sistema de diseño:** tokens y componentes con todos sus estados
- [ ] 2 · Sitio, CMS y leads
- [ ] 3 · Auth, roles, clientes, accesos y contratos con firma
- [ ] 4 · OAuth de Meta y métricas diarias
- [ ] 5 · Editor, calendario, aprobaciones y publicación programada
- [ ] 6 · Bandeja con webhooks y notificaciones
- [ ] 7 · Resto de redes

**Pendiente de decidir (Fase 0):** dominio, precios finales, texto legal del contrato y el SVG del logo, incluida su versión reversa.
