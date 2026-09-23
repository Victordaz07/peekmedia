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

En modo local, "Conectar" crea cuentas **de demostración** con 90 días de métricas, audiencia, bandeja y publicaciones de ejemplo, y "publicar" las marca como publicadas sin tocar ninguna red. Así puedes probar todo sin cuentas reales. Las tareas programadas se prueban con `curl localhost:3000/api/cron/publish`.

Sin variables de Supabase, la app corre en **modo local**: guarda en `.data/` (ignorado por git) y tiene su propio login, con contraseñas en scrypt y cookie firmada. La cuenta del equipo se crea sola (`equipo@peekmedia.local` / `peek-local-2026`, también aparece en `/login`). Sirve para desarrollar y probar; en producción no se permite.

| Ruta | Qué es |
|---|---|
| `/` | Sitio público con el cotizador |
| `/privacidad`, `/terminos`, `/eliminacion-de-datos` | Páginas legales que piden Meta, TikTok y Google |
| `/login` | Login: "Equipo Peek" (correo + contraseña) y "Soy cliente" (correo + código `XXXX-XXXX`). También se llega desde el punto coral de la "P" |
| `/app` | Inicio del equipo: pendientes de todos los clientes (solicitudes, contratos sin enviar o sin firmar) y prospectos nuevos |
| `/app/clientes` | Clientes: métricas, búsqueda, filtros y alta. Ficha con Datos, Accesos y Notas y tareas |
| `/app/c/[id]` | Espacio del cliente. Un cliente solo puede entrar al suyo. Pestañas: Resumen (KPIs, seguidores a 90 días, redes, mejores publicaciones), Calendario, Crear (equipo), Bandeja (equipo), Aprobaciones, Reportes (con PDF), Novedades, Conectar cuentas y Plan y contrato |
| `/app/conexiones` | Qué permite y qué no la API de cada red |
| `/app/ajustes` | Estado de las integraciones y URLs para configurar Meta |
| `/oauth/start/meta`, `/oauth/callback/meta` | Conexión con Instagram y Facebook |
| `/api/webhooks/meta` | Comentarios y mensajes de Meta en tiempo real |
| `/api/cron/publish`, `/api/cron/sync`, `/api/cron/report` | Tareas programadas (Vercel Cron) |
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

## Integraciones (fases 4–7)

| Red | Cómo se conecta | Qué hace |
|---|---|---|
| Instagram y Facebook | OAuth directo con Meta (Facebook Login for Business) | Publicar (post, carrusel, reel, historia), primer comentario, métricas diarias, audiencia, comentarios y DMs |
| TikTok, YouTube, Google Business, LinkedIn, Pinterest, X, Threads | [Ayrshare](https://www.ayrshare.com) (agregador ya auditado), un perfil por cliente | Publicar, métricas, reseñas de Google y respuestas |
| Cualquiera, sin integración configurada | Acceso como socio: el cliente sigue los pasos y el equipo confirma | Quedan como "Publicar a mano" |

- **Los tokens nunca llegan al navegador.** Se guardan cifrados con AES-256-GCM (`TOKEN_ENCRYPTION_KEY`) y la tabla `social_accounts` tiene permisos por columna: ni el equipo desde el navegador puede leer esas columnas; solo el servidor con la clave secreta.
- **OAuth** con `state` firmado (HMAC) y un nonce en cookie. Si la persona administra varias páginas, elige cuál antes de conectar.
- **Publicación:** "Programar" deja la pieza en cola y `/api/cron/publish` (cada 10 min) publica lo vencido. "Enviar a aprobación" avisa al cliente por correo; al aprobar, pasa a programada. Cada red guarda su estado (publicado, falló con el motivo o "publicar a mano") y el equipo puede reintentar.
- **Sincronización diaria** (`/api/cron/sync`, 5:00 a. m. en RD): seguidores, alcance, interacciones, audiencia, métricas por publicación, comentarios y reseñas.
- **Bandeja:** los webhooks de Meta traen comentarios y DMs al instante (firma `X-Hub-Signature-256` obligatoria). Los DMs solo se responden dentro de las 24 h que permite Meta.
- **Correos** (Resend): pedido de aprobación, aprobado o con cambios, publicación fallida y reporte mensual (`/api/cron/report`, día 1).
- **Archivos:** el navegador sube directo a Supabase Storage (bucket público `media`) con una URL firmada. Las redes necesitan una URL pública para descargar la imagen o el video.

### Configurar Meta (Instagram y Facebook)

1. En [developers.facebook.com](https://developers.facebook.com) crea una app de tipo **Empresa** y agrega **Facebook Login for Business**, **Instagram Graph API** y **Webhooks**.
2. En *Facebook Login → Configuración*, agrega como URI de redirección `https://TU-DOMINIO/oauth/callback/meta` (también aparece en `/app/ajustes`).
3. En *Configuración básica* pon las URLs de `/privacidad`, `/terminos` y `/eliminacion-de-datos`, el ícono y la categoría.
4. Webhooks: objeto **Instagram** (campos `comments`, `messages`) y **Page** (campos `feed`, `messages`), con la URL `https://TU-DOMINIO/api/webhooks/meta` y el mismo texto que pongas en `META_WEBHOOK_VERIFY_TOKEN`.
5. Mientras la app esté en modo desarrollo solo funciona con cuentas que tengan un rol en la app. Para clientes reales, pide **App Review** de: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`, `pages_messaging`, `read_insights`, `business_management`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`, `instagram_manage_messages`. También necesitas la **verificación del negocio**.
6. Variables: `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, y opcionalmente `META_BUSINESS_ID` (para el acceso como socio) y `META_GRAPH_VERSION` (por defecto `v23.0`).

### Configurar Ayrshare (resto de redes)

1. Necesitas el plan **Business** (perfiles por cliente). Copia la API key a `AYRSHARE_API_KEY`.
2. Para que cada cliente conecte sus redes solo, configura la integración de enlace (*Max Pack / JWT*) y pon `AYRSHARE_PRIVATE_KEY` (la clave privada completa, con saltos de línea como `\n`) y `AYRSHARE_DOMAIN`. Sin esto, el equipo conecta las redes desde el panel de Ayrshare.
3. El primer "Conectar" de un cliente crea su perfil en Ayrshare y guarda la *profile key* cifrada.

## Desplegar en Vercel

1. **Supabase:** crea el proyecto y aplica todas las migraciones (ver arriba). La del bucket `media` crea el almacenamiento de archivos.
2. **Vercel → Add New → Project →** importa `victordaz07/peekmedia`. Framework: Next.js (se detecta solo).
3. **Variables de entorno** (Production y Preview):

   | Variable | Obligatoria | Cómo obtenerla |
   |---|---|---|
   | `NEXT_PUBLIC_SITE_URL` | Sí | `https://tu-dominio.com` (sin `/` al final) |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Sí | Supabase → Project Settings → API |
   | `TOKEN_ENCRYPTION_KEY` | Sí | `openssl rand -base64 32`. No la cambies después: los tokens guardados dejarían de abrirse |
   | `CRON_SECRET` | Sí | `openssl rand -hex 32`. Vercel la manda sola a las tareas programadas |
   | `RESEND_API_KEY`, `MAIL_FROM` | Recomendada | resend.com, con tu dominio verificado |
   | `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_BUSINESS_ID` | Para Instagram y Facebook | Ver "Configurar Meta" |
   | `AYRSHARE_API_KEY`, `AYRSHARE_PRIVATE_KEY`, `AYRSHARE_DOMAIN` | Para las demás redes | Ver "Configurar Ayrshare" |

   No pongas `PEEK_ALLOW_LOCAL_MODE` en producción.
4. **Deploy.** Después, en *Settings → Domains*, agrega tu dominio y actualiza `NEXT_PUBLIC_SITE_URL` (y vuelve a desplegar: es una variable pública y se fija al compilar).
5. **Tareas programadas:** `vercel.json` publica cada 10 minutos. El plan **Hobby** de Vercel solo permite tareas diarias; para la publicación programada necesitas **Pro**. Alternativa en Hobby: cambia `/api/cron/publish` a una vez al día en `vercel.json` y llama la ruta cada 10 minutos desde un servicio externo (p. ej. cron-job.org) con el encabezado `Authorization: Bearer TU_CRON_SECRET`.
6. Entra a `/app/ajustes` para ver qué integraciones quedaron activas.

## Estructura

```
src/
  app/
    (site)/              Sitio público, páginas legales y server action del cotizador
    app/                 Panel: inicio, clientes, espacio del cliente (c/[id]: resumen, calendario, crear, bandeja, aprobaciones, reportes, novedades, conectar, plan), prospectos, CMS, conexiones y ajustes
    api/                 Tareas programadas, webhooks de Meta y archivos del modo local
    oauth/               Inicio y regreso de la conexión con Meta
    login/               Login y logout
    sistema/             Catálogo del sistema de diseño
    opengraph-image.tsx  Imagen para compartir en redes
    sitemap.ts, robots.ts
  components/
    ui/                  Sistema de diseño (Fase 1)
    site/                Secciones del sitio público
    app/                 Piezas del panel
    posts/               Vista previa, detalle de publicación y bloques de métricas
  lib/
    content/             Esquema del CMS (zod), contenido por defecto y utilidades (WhatsApp, precios, vista pública)
    leads/               Esquema de prospectos
    clients/             Esquema de clientes, roles y textos de invitación
    contracts/           Catálogo de planes, condiciones, cláusulas, pagos y firma
    social/              Formatos por red, validación, analítica, motor de publicación y sincronización
    integrations/        Meta Graph API, Ayrshare y modo demo
    crypto.ts            Cifrado de tokens (AES-256-GCM) y firmas HMAC
    notify.ts            Avisos por correo de aprobaciones, fallos y reporte mensual
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
- [x] **4 · Conexión con Meta y métricas diarias**
  - Conectar cuentas: progreso, permisos en lenguaje simple, OAuth con Meta, elección de página, "Ya lo hice", "Quitar acceso" y confirmación del equipo para el acceso como socio.
  - Métricas diarias, audiencia (edades y ciudades) y métricas por publicación. Resumen con KPIs con fuente y fecha, seguidores a 90 días, redes y mejores publicaciones.
  - Reportes con tabla por red, audiencia, mapa de calor de mejores horas y "Descargar PDF".
- [x] **5 · Editor, calendario, aprobaciones y publicación programada**
  - Crear: redes, formato, archivos (subida directa), contador por red, primer comentario, texto alternativo, fecha en hora de RD, mejor hora sugerida y vista previa. Guardar borrador, enviar a aprobación, programar o publicar ahora, con las reglas de cada red.
  - Calendario mensual (agenda en móvil) con estados, "+" en días futuros y detalle con estado por red, métricas, historial de versiones, reintentar, editar y borrar.
  - Aprobaciones: aprobar o pedir cambios (Administrador o Aprobador), con versión y comentario. Editar una pieza aprobada sube la versión.
  - Uso del mes del plan con barras.
- [x] **6 · Bandeja y notificaciones**
  - Webhooks de Meta, filtros, respuestas rápidas, regla de 24 h en DMs y "Actualizar". Novedades automáticas y notas del community manager.
  - Correos de aprobación, cambios, fallos y reporte mensual. Inicio del equipo con publicaciones fallidas y cambios pedidos.
- [x] **7 · Resto de redes** vía Ayrshare, matriz de capacidades en `/app/conexiones` y estado de integraciones en `/app/ajustes`.

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
- Subida de imágenes en el CMS del sitio (el editor de publicaciones ya sube a Storage).
- Renovar tokens de YouTube, LinkedIn, etc. lo hace Ayrshare; los de Meta de página no vencen, pero si el cliente cambia su contraseña hay que reconectar (el panel lo avisa).
- Probar con cuentas reales en cuanto Meta apruebe la app (hoy está probado con el modo demo y pruebas unitarias).
- Límite de envíos por IP en el cotizador (rate limit).
- Aviso por email de cada prospecto nuevo.
