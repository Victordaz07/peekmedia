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

Sin variables de Supabase, la app corre en **modo local**: guarda en `.data/` (ignorado por git) y tiene su propio login, con contraseñas en scrypt y cookie firmada. La cuenta del equipo se crea sola (`equipo@peekmedia.local` / `peek-local-2026`, también aparece en `/login`). Sirve para desarrollar y probar; en producción no se permite.

| Ruta | Qué es |
|---|---|
| `/` | Sitio público con el cotizador |
| `/privacidad`, `/terminos`, `/eliminacion-de-datos` | Páginas legales que piden Meta, TikTok y Google |
| `/login` | Login: "Equipo Peek" (correo + contraseña) y "Soy cliente" (correo + código `XXXX-XXXX`). También se llega desde el punto coral de la "P" |
| `/app` | Inicio del equipo: pendientes de todos los clientes (solicitudes, contratos sin enviar o sin firmar) y prospectos nuevos |
| `/app/clientes` | Clientes: métricas, búsqueda, filtros y alta. Ficha con Datos, Accesos y Notas y tareas |
| `/app/c/[id]` | Espacio del cliente: Resumen y Plan y contrato. Un cliente solo puede entrar al suyo |
| `/app/prospectos` | Cotizaciones que llegan del sitio (se pueden convertir en cliente) |
| `/app/sitio` | CMS: textos, planes, cotizador y secciones |
| `/sistema` | Catálogo del sistema de diseño (no indexado) |

## Conectar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Aplica las migraciones de `supabase/migrations/`, en orden. Tienes dos formas:
   - pegarlas en **SQL Editor** y ejecutarlas, o
   - con la CLI: `npx supabase link --project-ref <ref>` y después `npx supabase db push`.
3. En **Authentication → Sign In / Providers**, desactiva "Allow new users to sign up". El equipo se crea a mano y los clientes entran por invitación desde la ficha de cada cliente.
4. En **Authentication → Users → Add user**, crea tu usuario con email y contraseña. Después dale acceso de equipo en **SQL Editor**:
   ```sql
   insert into public.memberships (user_id, org_id, role)
   select u.id, o.id, 'owner'
   from auth.users u, public.organizations o
   where u.email = 'tu@email.com' and o.name = 'Peek Media';
   ```
5. En **Project Settings → API** copia la URL, la clave pública (*publishable* o *anon*) y la secreta (*secret* o *service_role*) a `.env.local`. En Vercel, ponlas en **Settings → Environment Variables**.
6. Opcional: `RESEND_API_KEY` y `MAIL_FROM` para mandar por correo las invitaciones y los avisos de contrato. Sin ellas, el panel muestra el texto para copiarlo y mandarlo por WhatsApp.

Los códigos de acceso de los clientes son su contraseña de Supabase Auth (8 caracteres, letras mayúsculas y números). Si activas requisitos de contraseña más estrictos en **Authentication → Policies** (por ejemplo, exigir minúsculas), las invitaciones van a fallar.

El contenido empieza con los textos del handoff. La primera vez que guardes en `/app/sitio` se escribe en la base de datos.

### Seguridad

- **RLS en todas las tablas.** Los visitantes solo pueden leer `site_content`. Solo el equipo (`is_team()`) edita el contenido y ve o cambia prospectos.
- **Las cotizaciones no se escriben directo desde el navegador.** Las valida una server action, que recalcula los precios con el catálogo y las guarda con la clave secreta. Además tiene un campo trampa (honeypot) contra bots.
- **El equipo solo puede cambiar el `status` de un prospecto**, por permisos a nivel de columna.
- **Cada cliente vive aislado.** `my_client_id()` limita toda lectura a su espacio y un acceso desactivado pierde todo. Los clientes nunca ven contratos en borrador, notas ni tareas internas.
- **Accesos.** Los crea el servidor con la clave secreta: cuenta de Auth más fila en `client_users`. Un correo pertenece a un solo cliente. El código se muestra una sola vez; si se pierde, se genera otro. Desactivar un acceso también bloquea la cuenta en Auth.
- **Firma electrónica.** La registra la función `sign_contract` en una sola transacción, y solo puede llamarla la clave secreta. La función:
  - verifica que el contrato esté pendiente y que quien firma sea Administrador activo de ese cliente;
  - comprueba que el SHA-256 corresponda al documento;
  - guarda la firma con el texto exacto firmado, la IP, el user agent y la hora del servidor;
  - pasa la versión anterior al historial.

  Las firmas son inmutables: un trigger impide editarlas o borrarlas, incluso con la clave secreta, y sobreviven aunque se borre la cuenta de quien firmó.
- `scripts/test-db.sh` prueba las migraciones y las políticas (`supabase/tests/rls*.sql`) contra un Postgres vacío:
  `DATABASE_URL=postgres://… scripts/test-db.sh`

## Estructura

```
src/
  app/
    (site)/              Sitio público, páginas legales y server action del cotizador
    app/                 Panel: inicio, clientes (ficha y accesos), espacio del cliente (c/[id]: resumen, plan y contrato), prospectos y CMS
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
    clients/             Esquema de clientes, roles y textos de invitación
    contracts/           Catálogo de planes, condiciones, cláusulas, pagos y firma
    mail.ts              Correo con Resend (opcional)
    data/                Acceso a datos: Supabase o archivos locales (contenido, prospectos, clientes, contratos e identidad)
    supabase/            Clientes de sesión, público y admin
    auth.ts              Quién entra (equipo o cliente), requireTeam() y requireClientAccess()
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
- [x] **3 · Clientes, accesos y contratos con firma**
  - Login con dos pestañas (equipo y cliente). El código se acepta en minúsculas o sin guion.
  - Roles del equipo (owner y CM) y del cliente (Administrador, Aprobador y Solo lectura). El servidor impone a qué espacio entra cada quien y RLS lo repite en la base de datos.
  - Inicio del equipo con pendientes de todos los clientes.
  - Clientes: alta con contrato en borrador; ficha con datos, accesos (invitar, código nuevo, activar o desactivar, cambiar rol y quitar) y notas y tareas internas. Un prospecto se convierte en cliente desde su detalle.
  - Espacio del cliente con pestañas, "Ver como: Community manager / Cliente" y barra inferior en móvil.
  - Plan y contrato:
    - hero con el plan, qué incluye cada mes y el documento con 10 cláusulas generadas;
    - firma escrita o dibujada, con sello de verificación;
    - "Imprimir o guardar PDF", que imprime solo el contrato;
    - editor del equipo: guardar borrador, enviar y nueva versión si ya estaba firmado;
    - "Mejora tu plan", solicitudes (aprobar prepara el contrato nuevo), pagos por mes y versiones anteriores.
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

**Revisión legal:** los textos de `/privacidad`, `/terminos` y `/eliminacion-de-datos`, y el del contrato (`src/lib/contracts/document.ts`), los debe revisar un abogado. El panel se lo recuerda al equipo en cada contrato sin firmar.

**Técnico:**
- PDF del contrato generado en el servidor y guardado en Storage. Hoy se imprime desde el navegador, y la firma guarda el texto exacto firmado con su SHA-256.
- "Uso del mes" del plan: se llena cuando existan publicaciones (Fase 5).
- Subida de imágenes a Supabase Storage. Hoy el CMS recibe URLs.
- Límite de envíos por IP en el cotizador (rate limit).
- Aviso por email de cada prospecto nuevo (Resend, Fase 6).
