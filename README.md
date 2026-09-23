# Peek Media

Sitio público, CMS/CRM y plataforma de clientes para **Peek Media**, agencia de marketing digital en Santo Domingo, RD.

La especificación completa está en [`docs/handoff/README.md`](docs/handoff/README.md): prototipos HTML, marca, auditoría UX y qué permite cada API.

## Stack

- Next.js 16 (App Router, Cache Components) + TypeScript
- Tailwind CSS 4, con los tokens en `src/app/globals.css` (`@theme`)
- Supabase (Postgres, Auth y RLS) mediante `@supabase/ssr`
- zod para validar, vitest para las pruebas y `lucide-react` para los íconos

## Desarrollo

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
npm run lint
npm test           # pruebas unitarias
npm run build
```

Sin variables de Supabase, la app corre en **modo local**: el panel no pide login y guarda en `.data/` (ignorado por git). Sirve para desarrollar y probar, pero en producción no se permite.

| Ruta | Qué es |
|---|---|
| `/` | Sitio público con el cotizador |
| `/privacidad`, `/terminos`, `/eliminacion-de-datos` | Páginas legales que piden Meta, TikTok y Google |
| `/login` | Login del equipo. También se llega desde el punto coral de la "P" del logo |
| `/app/prospectos` | Cotizaciones que llegan del sitio |
| `/app/sitio` | CMS: textos, planes, cotizador y secciones |
| `/sistema` | Catálogo del sistema de diseño (no indexado) |

## Conectar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Aplica la migración `supabase/migrations/20260923000000_site_and_leads.sql`. Tienes dos formas:
   - pegarla en **SQL Editor** y ejecutarla, o
   - con la CLI: `npx supabase link --project-ref <ref>` y después `npx supabase db push`.
3. En **Authentication → Sign In / Providers**, desactiva "Allow new users to sign up". El equipo se crea a mano y los clientes llegarán por invitación en la Fase 3.
4. En **Authentication → Users → Add user**, crea tu usuario con email y contraseña. Después dale acceso de equipo en **SQL Editor**:
   ```sql
   insert into public.memberships (user_id, org_id, role)
   select u.id, o.id, 'owner'
   from auth.users u, public.organizations o
   where u.email = 'tu@email.com' and o.name = 'Peek Media';
   ```
5. En **Project Settings → API** copia la URL, la clave pública (*publishable* o *anon*) y la secreta (*secret* o *service_role*) a `.env.local`. En Vercel, ponlas en **Settings → Environment Variables**.

El contenido empieza con los textos del handoff. La primera vez que guardes en `/app/sitio` se escribe en la base de datos.

### Seguridad

- **RLS en todas las tablas.** Los visitantes solo pueden leer `site_content`. Solo el equipo (`is_team()`) edita el contenido y ve o cambia prospectos.
- **Las cotizaciones no se escriben directo desde el navegador.** Las valida una server action, que recalcula los precios con el catálogo y las guarda con la clave secreta. Además tiene un campo trampa (honeypot) contra bots.
- **El equipo solo puede cambiar el `status` de un prospecto**, por permisos a nivel de columna.
- `scripts/test-db.sh` prueba la migración y las políticas contra un Postgres vacío:
  `DATABASE_URL=postgres://… scripts/test-db.sh`

## Estructura

```
src/
  app/
    (site)/              Sitio público, páginas legales y server action del cotizador
    app/                 Panel del equipo: prospectos y CMS (sitio)
    login/               Login y logout
    sistema/             Catálogo del sistema de diseño
    opengraph-image.tsx  Imagen para compartir en redes
    sitemap.ts, robots.ts
  components/
    ui/                  Sistema de diseño (Fase 1)
    site/                Secciones del sitio público
    app/                 Piezas del panel
  lib/
    content/             Esquema del CMS (zod), contenido por defecto y utilidades (WhatsApp, precios, vista pública)
    leads/               Esquema de prospectos
    data/                Acceso a datos: Supabase o archivos locales
    supabase/            Clientes de sesión, público y admin
    auth.ts              Usuario del equipo y requireTeam()
  proxy.ts               Refresca la sesión de Supabase en /app y /login
supabase/
  migrations/            SQL de la base de datos
  tests/                 Pruebas de RLS
```

### Cómo se publica el contenido

`getSiteContent()` usa `"use cache"` con la etiqueta `site-content`, así que el sitio se sirve estático. Al guardar en el CMS, `updateTag("site-content")` hace que la siguiente visita ya vea el cambio.

Todo lo que esté vacío o sea un placeholder (`[...]`) se oculta solo: preguntas sin respuesta, testimonios, logos y métricas sin cifra. El CMS muestra "No se publica" en cada elemento que quedaría oculto.

## Fases

- [x] **1 · Sistema de diseño:** tokens y componentes con todos sus estados. Ver `/sistema`.
- [x] **2 · Sitio, CMS y prospectos**
  - Sitio público fiel al prototipo. La burbuja del hero ya no tapa el mockup, se añadió la prueba de confianza "5+ años · Santo Domingo" y en móvil el cotizador tiene una barra fija ("3 servicios · Enviar").
  - Cada cotización crea un prospecto. El nombre es obligatorio y WhatsApp se abre en el mismo clic.
  - El botón flotante se oculta en el hero, en el cotizador y en el CTA final.
  - CMS con todos los grupos: añadir, reordenar, quitar con "Deshacer", guardar/descartar y aviso de cambios sin guardar.
  - Prospectos: filtros por estado, búsqueda, detalle y cambio de estado con "Deshacer".
  - Páginas legales, `lang="es-DO"`, metadata, imagen OG, JSON-LD `ProfessionalService` (un tipo de LocalBusiness), sitemap y robots.
  - Login del equipo con Supabase Auth.
- [ ] 3 · Auth de clientes, roles, clientes, accesos y contratos con firma
- [ ] 4 · OAuth de Meta y métricas diarias (el Feed pasará a leerse de la API de Instagram)
- [ ] 5 · Editor, calendario, aprobaciones y publicación programada
- [ ] 6 · Bandeja con webhooks y notificaciones
- [ ] 7 · Resto de redes

## Pendiente

**De ti (Fase 0):**
- Dominio.
- Número de WhatsApp: se carga en el CMS.
- Precios finales.
- Respuestas del FAQ, testimonios, logos y métricas del caso real.
- Logo en SVG y su versión reversa.

**Revisión legal:** los textos de `/privacidad`, `/terminos` y `/eliminacion-de-datos`, y el del contrato (Fase 3), los debe revisar un abogado.

**Técnico:**
- Subida de imágenes a Supabase Storage. Hoy el CMS recibe URLs.
- Límite de envíos por IP en el cotizador (rate limit).
- Aviso por email de cada prospecto nuevo (Resend, Fase 6).
