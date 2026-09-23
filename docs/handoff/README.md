# Handoff: Peek Media — Sitio + Plataforma para agencia (CM + portal de clientes)

## Overview
Peek Media es una agencia de marketing digital en Santo Domingo, RD, liderada por Dagoberto Nuñez. El producto tiene tres superficies:

1. **Sitio público** (landing) con cotizador de servicios que envía por WhatsApp.
2. **Admin interno**: CMS del sitio (textos, planes, posts, FAQ, precios del cotizador) + CRM básico.
3. **Plataforma de clientes** ("Dashboard"): un espacio aislado por cliente donde el equipo de Peek (community managers) y cada cliente trabajan:
   - métricas multi-red, calendario, creación y programación de publicaciones, bandeja unificada, aprobaciones y reportes;
   - conexión de cuentas vía OAuth;
   - plan contratado con contrato y **firma electrónica**, solicitudes de mejora de plan y pagos.

Hoy todo es un **demo para muestreo** con datos generados (seed). El objetivo de este handoff es construirlo de verdad.

## About the Design Files
Los archivos en `prototipos/` son **referencias de diseño hechas en HTML**: prototipos que muestran el aspecto y el comportamiento esperados. **No es código de producción para copiar.**

La tarea es **recrear estos diseños en un proyecto nuevo** con el stack recomendado más abajo, usando patrones propios de ese stack: componentes, tokens, rutas, base de datos real y autenticación real.

Los prototipos guardan todo en `localStorage`/`sessionStorage` y simulan login, conexiones y firma. Todo eso debe pasar a backend.

Para abrirlos: sirve la carpeta `prototipos/` con cualquier servidor estático (por ejemplo `npx serve prototipos`) y abre cada `.dc.html`. `support.js` es el runtime de los prototipos; no forma parte del producto. Los estilos están inline a propósito: extráelos a tokens y componentes.

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografía, espaciados, radios, copys e interacciones son finales, salvo los ajustes de la sección "Correcciones obligatorias". Recréalo fiel, pero con un sistema de componentes, no con estilos inline.

## Stack recomendado (no hay codebase previo)
- **Next.js (App Router) + TypeScript + Tailwind**, con los tokens de abajo en `tailwind.config`.
- **Supabase**: Postgres, Auth (email + contraseña para el equipo; magic link o código para clientes), Storage (medios, firmas y PDFs) y **RLS por `client_id`**, que es obligatorio.
- **Jobs**: Supabase Cron o Trigger.dev, para publicar a la hora programada, sincronizar métricas cada día y generar el reporte mensual.
- **Webhooks de Meta** para comentarios y DMs en tiempo real.
- **Resend** para correos: invitaciones, contrato por firmar y reporte.
- **Vercel** para hosting. Todavía no hay dominio: dejar `NEXT_PUBLIC_SITE_URL` configurable.
- **Publicación en redes**:
  - Fase 1: Graph API directa de Meta (Instagram, Facebook, Threads).
  - Fase 2: TikTok, YouTube, Google Business, LinkedIn, Pinterest y X, vía sus APIs o con un agregador ya auditado (Ayrshare, Outstand). Ver `docs/que-permite-cada-api.md`.

## Rutas propuestas
```
/                       Sitio público
/login                  Login (pestañas: Equipo Peek / Soy cliente)
/app                    Inicio del equipo (todos los clientes: pendientes, aprobaciones, alertas)
/app/clientes           Gestión de clientes (crear, datos, redes, accesos)
/app/c/[clientId]/...   Espacio del cliente: resumen · plan · calendario · crear · bandeja · aprobaciones · reportes · novedades · conectar · conexiones
/app/sitio              CMS del sitio + cotizador (lo que hoy es Admin › Contenido / Cotizador)
/app/prospectos         Cotizaciones que llegan del sitio (pipeline)
/app/ajustes            Equipo, apps OAuth, marca
/oauth/callback/[provider]  Recibe el code, intercambia tokens y los guarda cifrados
```
Un usuario cliente solo puede entrar a `/app/c/[suClientId]` y a nada más; el servidor lo impone, no solo la interfaz.

---

## Screens / Views

### 1. Sitio público — `prototipos/Peek Media Landing v2.dc.html`
Layout: contenido con `max-width: 1320px`, padding lateral `clamp(20px,4vw,32px)` y secciones con padding vertical `clamp(56px,9vw,88px)`. Todo es fluido; las grillas usan `repeat(auto-fit, minmax(min(100%, Npx), 1fr))`.

| Sección | Detalle |
|---|---|
| **Nav** | Sticky, blanco al 92% con blur 12px, borde inferior `rgba(11,31,51,.08)`. Logo horizontal a 64px de alto dentro de una caja de 131×48 con overflow hidden. Links (15px/500): Nosotros, Servicios, Cotiza, Feed, Caso real; se ocultan por debajo de 820px. CTA "Escríbenos": pill coral. **Atajo oculto**: un área de 16×16 sobre el punto coral de la "P" del logo (left 16, top 15) enlaza a `/login`. |
| **Hero** | Grid de 2 columnas (min 460px). Eyebrow "ESTRATEGIA · CONTENIDO · RESULTADOS" en 13px/600, tracking .14em, con un punto coral de 10px. H1 "Haz que te vean. Haz que te recuerden." en Space Grotesk 700, `clamp(52px,8.4vw,132px)`, line-height .9, tracking −.045em. "vean." lleva un subrayado cian (barra de .2em de alto a bottom .06em, detrás del texto). Párrafo de 19px/1.5 con max 380px. CTAs: "Hablemos por WhatsApp" (coral) y "Cotiza a tu medida" (borde ink que se llena de ink en hover). Columna derecha: **mockup de post de Instagram** (card blanca radius 20, rotada 2°; en hover rota a 0° y sube 6px). Tiene header con avatar de anillo degradado cian→coral, usuario y ubicación; imagen cuadrada `#123553` con arco cian decorativo, punto coral que pulsa y el texto "Ideas que encuentran a su gente."; iconos de like (coral relleno), comentario, compartir y guardar; "[Seguidores] seguidores" y caption. Burbuja flotante tipo chat "¿Y si esta fuera tu marca?" (**moverla para que no tape el mockup**). |
| **Marquee** | Banda coral rotada −1.2°, padding 22px 0. Texto blanco en Space Grotesk 700 `clamp(28px,3.6vw,48px)`: "Haz que te vean ● Haz que te recuerden ● Ideas que encuentran a su gente ● Estrategia · Contenido · Resultados", en loop infinito. La velocidad es configurable; la actual es **60 s por ciclo**. |
| **Sobre nosotros** | Fondo gris con textura. Un "5" gigante (`clamp(120px,18vw,260px)`) con un "+" cian, y "años haciendo marketing digital y campañas publicitarias en RD." H2 y párrafo editables desde el CMS. Card del fundador con foto circular de 72px. |
| **Servicios** | H2 "Elige tu plan." (`clamp(48px,7vw,112px)`). 3 cards con radius 36, padding 32 y min-height 460. La card "Más elegido" va en ink con badge coral. Cada card tiene número, nombre (40px), descripción, lista "Qué incluye" con bullets cian, precio "Desde RD$ X / mes" y botón "Lo quiero", que abre WhatsApp con mensaje prellenado. En hover sube 10px con sombra `0 30px 50px -24px rgba(11,31,51,.35)`. |
| **Cotiza a tu medida** | Fondo gris con textura. Izquierda: grid de servicios marcables (cards radius 20; la marcada pasa a ink con check cian). Derecha: resumen sticky (top 96, radius 36) con nombre, negocio y notas; lista de lo elegido; totales "Mensual, desde" y "Pago único, desde"; nota "Precios de referencia…"; botón "Enviar cotización por WhatsApp". **En producción, además, debe guardar el prospecto en BD.** |
| **Cómo trabajamos** | 4 pasos (Diagnóstico, Estrategia, Contenido, Medición), cada uno con borde superior de 3px ink, número cian de 64px y título de 28px. |
| **Feed** | Header de perfil (avatar de 96px, @usuario, publicaciones y seguidores) + botón "Seguir en Instagram". Grid de 6 tiles cuadrados con títulos reales de posts; las tiles rotan colores de la paleta. En producción vendrá de la API de Instagram. |
| **Caso real** | Bloque de foto `#123553` (radius 36, min-height 520) + texto + 3 métricas con borde punteado; por ahora "[Resultado / métrica verificada]". |
| **Logos de clientes** | Franja de 5 slots. |
| **Testimonios** | 3 cards blancas con comilla cian de 72px. **Ocultar la sección si no hay testimonios reales.** |
| **FAQ** | Acordeón con 5 preguntas. El ícono +/− va en un círculo de 40px que pasa a cian cuando está abierto. |
| **CTA final** | "¿Hablamos?" gigante (`clamp(64px,10vw,168px)`) + botón de WhatsApp + mockup de chat: burbujas del cliente en blanco y de la marca en ink, con indicador "escribiendo" de 3 puntos. |
| **Footer** | Logo, tagline, Instagram, WhatsApp, sitio, © 2026. |
| **Botón flotante** | Abajo a la derecha: pill ink con círculo coral + "¿Hablamos?" (solo ícono en móvil). Ocultarlo cuando el CTA final esté en pantalla. |

Contenido por defecto y esquema CMS: `prototipos/pm-store.js` → `defaults`.

### 2. Admin (CMS + CRM) — `prototipos/Admin.dc.html`
- Pantalla de PIN (en producción se reemplaza por el login real).
- Sidebar blanca con textura + área principal gris.
- **Contenido del sitio**: chips por grupo (General, Planes, Feed, Cómo trabajamos, Caso real, Logos, Testimonios, FAQ). Hay un editor genérico de campos y listas: añadir, reordenar ↑↓ y eliminar. Barra de "Guardar cambios / Descartar"; el botón se pone coral cuando hay cambios sin guardar.
- **Cotizador**: servicios con nombre, precio desde (RD$), descripción y cobro (mensual o único).
- **Clientes (CRM)**: stats, búsqueda, filtros por estado, ficha y tareas. Botón "Sincronizar con Meta" con llamadas reales a la Graph API: perfil, insights de 30 días, media y ads insights. Ver `syncClient` en `pm-store.js`.
- **Ajustes**: PIN, token, respaldo JSON y exportación CSV.
- **En producción, el CRM de aquí y el de la Plataforma se unifican en una sola tabla `clients`.**

### 3. Plataforma de clientes — `prototipos/Dashboard Clientes.dc.html`
Layout: sidebar (flex `1 1 240px`, blanca con textura) y main (flex `999 1 680px`, padding `28px clamp(16px,3vw,40px) 88px`, gap 24). Cards blancas con radius 20 y padding 24. H1 del cliente en Space Grotesk `clamp(36px,4.4vw,60px)`.

- **Login**: card de 440px con radius 36 y pestañas "Equipo Peek" (email + contraseña) y "Soy cliente" (email + código `XXXX-XXXX`). Incluye accesos demo clicables.
- **Sidebar**:
  - selector de cliente (solo el equipo);
  - navegación con badges coral para pendientes;
  - tarjeta de sesión con botón "Salir";
  - "Ver como: Community manager / Cliente" (solo el equipo, para previsualizar la vista del cliente).
- **Resumen**:
  - banner de contrato pendiente de firma (solo el cliente);
  - 4–6 KPIs: seguidores, alcance, interacción y publicaciones, más Google o YouTube si aplica, cada uno con una pill de variación (cian si sube, rosa si baja);
  - gráfica de línea de seguidores a 90 días (SVG, área cian al 16% y línea de 3px) con pestañas por red, y mini-cards por red con sparkline;
  - mejores publicaciones del mes, próximas publicaciones y novedades (card ink).
- **Mi plan y contrato**: detallado en la sección "Contrato y firma" más abajo.
- **Calendario**: mes en grid de 7 columnas (mínimo 720px, con scroll horizontal) y celdas de 118px de alto. Chips de publicación coloreados por estado; "+" en días futuros para crear; navegación ‹ ›; leyenda de estados.
- **Crear publicación**:
  - elección de redes (chips) y formato (Post, Carrusel, Reel, Historia, Short o Video, según el cliente);
  - subida de medio; texto con contador de caracteres por red (en rojo si pasa el límite);
  - fecha y hora, con sugerencia del mejor horario;
  - avisos por red (TikTok sin auditoría, X de pago, etc.);
  - vista previa estilo Instagram cuya relación de aspecto depende del formato;
  - acciones: Guardar borrador, Enviar a aprobación, Programar.
- **Bandeja**: filtros (Todos, Sin responder, Comentarios, Mensajes, Reseñas), lista y detalle con respuestas rápidas. Aviso de la ventana de 24 h de Meta para DMs. Reseñas con estrellas.
- **Aprobaciones**: cards de piezas "Por aprobar" o "Cambios pedidos" con botones Aprobar y Pedir cambios. **Reemplazar el `prompt()` por un panel con comentario e historial de versiones.** El rol "Solo lectura" no ve los botones.
- **Reportes**:
  - tabla por red: seguidores, crecimiento, alcance, interacciones y posts;
  - barras de edad y ciudades;
  - heatmap de mejores horas (7×9 bloques de 2 h, ink con opacidad variable);
  - "Descargar reporte (PDF)".
- **Novedades**: feed generado a partir de los datos (hitos, mejor post, pendientes, reseñas, redes por conectar) + notas del CM al cliente.
- **Conectar cuentas** (cliente Administrador y equipo):
  - banner ink con progreso "X / N redes conectadas";
  - card por red con estado (Sin conectar → Esperando que termines → En verificación → Conectado), permisos en lenguaje simple y botón "Conectar con [red] ↗", que abre la página oficial;
  - guía de pasos, "Ya lo hice" y "Quitar acceso"; el equipo usa "Confirmar conexión".
  - Tarjeta **"Apps de Peek Media"** (solo el equipo): IDs de apps OAuth, cada campo con un desplegable "¿Cómo lo consigo?" que trae los pasos y la URL oficial. Si hay ID configurado, el botón arma la URL OAuth real (ver `oauthUrl()` y `SCOPES` en el archivo); si no, abre la pantalla de acceso como socio (`MANUAL`).
- **Conexiones y API** (equipo): matriz de qué se puede y qué no por red.
- **Gestión de clientes** (equipo):
  - lista de espacios y formulario del cliente: nombre, rubro, usuario de redes, contacto, color de avatar (4 opciones) y redes que se manejan (9);
  - **Accesos**: invitar personas (nombre, email, rol Administrador, Aprobador o Solo lectura). Cada una recibe un código propio, con opciones de copiar invitación, generar código nuevo, desactivar y quitar. **Un email pertenece a un solo cliente.**
  - Aviso de aislamiento de datos.

#### Contrato y firma (vista "Mi plan y contrato")
- **Hero ink** con el plan contratado, el estado (Borrador, Pendiente de firma, Firmado · Vigente), la inversión mensual, el inicio, la fecha "vigente hasta" (o "Renovación mes a mes") y el próximo pago. Muestra en chips los extras y los servicios adicionales.
- **Uso del mes**: barras de publicaciones, reels, historias y redes contra lo contratado; la barra se pone coral al llegar al 100%.
- **Documento del contrato**: aspecto de papel (radius 6, sombra), con logo, número `PM-XXXX`, versión y fecha, más **10 cláusulas generadas a partir de los datos del contrato**. Tiene dos bloques de firma: Peek, escrita en Caveat, y cliente, en imagen o escrita. Al pie va un sello de verificación con nombre, rol, fecha y hora, método y código.
- **Firma electrónica**: nombre completo, modo "Escribir" (vista previa en Caveat 44px) o "Dibujar" (canvas 600×220 con pointer events y botón para borrar), casilla de aceptación y botón "Firmar contrato". Solo firman los clientes con rol Administrador.
- **Imprimir o guardar PDF**: imprime solo el documento. En producción, generar el PDF en el servidor y guardarlo en Storage.
- **Edición (equipo)**: elección de plan, precio acordado, inicio, meses, día de pago, forma de pago, cantidades por entregable y servicios adicionales. Botones: Guardar borrador y Enviar al cliente para firma. Si el contrato ya estaba firmado, se crea una versión N+1, la anterior pasa al historial y el cliente vuelve a firmar.
- **Mejora tu plan**: planes superiores y servicios adicionales. El cliente crea una solicitud; el equipo la aprueba (lo que prepara el contrato nuevo) o la rechaza.
- **Pagos**: historial por mes (Pagado, Pendiente, Próximo).
- **Versiones anteriores**.

Catálogo de planes (precios de referencia, "desde"):

| Plan | Desde (RD$/mes) | Publicaciones | Reels | Historias | Redes | Reportes | Reuniones |
|---|---|---|---|---|---|---|---|
| Básico | 12,000 | 12 | 2 | 8 | 2 | 1 | 1 |
| Estratégico ("Más elegido") | 25,000 | 16 | 6 | 16 | 4 | 1 | 2 |
| Premium | 45,000 | 24 | 10 | 30 | 6 | 2 | 4 |
| Auditoría de redes | 6,500 (pago único) | — | — | — | — | — | — |

Servicios adicionales: Sesión de fotos o video · Identidad visual · Campañas en Google · Pack de 4 reels extra · Auditoría de redes · Página web.

---

## Interactions & Behavior
- **Reveal al hacer scroll** (sitio): los elementos entran con opacity 0→1 y translateY 40px→0 en 0.8 s, curva `cubic-bezier(.2,.8,.2,1)`, threshold 0.1. Los que ya están en pantalla al cargar no se animan.
- **Hover lift**: las tarjetas suben 4–10px con sombra `0 24–30px 40–60px -20–30px rgba(11,31,51,.3–.4)`, en `.25–.35s`. Los botones suben 2–3px.
- **Pulso**: el punto coral del hero escala 1→1.18 en ciclos de 2.4 s. Los puntos de "escribiendo" hacen lo mismo en 1.2 s, desfasados 0.2 s.
- **Flotación**: la burbuja del hero sube y baja 8px en ciclos de 4 s.
- **`prefers-reduced-motion`**: apagar marquee, reveal, pulso y flotación. **Pendiente, obligatorio.**
- **WhatsApp**: `https://wa.me/<número>?text=<mensaje codificado>`. Cada CTA manda un mensaje distinto (ver `wa` en la lógica del sitio). El número se edita desde el CMS.
- **Cotizador**: al marcar o desmarcar, el total se recalcula (mensual y único por separado). El mensaje de WhatsApp lista nombre, negocio, servicios y notas.
- **Estados de publicación**: Borrador → Por aprobar → Cambios pedidos → (Aprobado) → Programado → Publicado / Falló. En producción, el estado va **por red** en `post_targets`.
- **Estados de conexión**: none → esperando → verificando → conectado. En producción el callback de OAuth pasa directo a `conectado` y el paso manual de "verificando" solo aplica al acceso como socio.
- **Validaciones**:
  - Crear publicación: al menos una red, texto o medio, y respetar el límite de caracteres por red (IG 2200, FB 63206, TT 2200, YT 5000, GBP 1500, LI 3000, Threads 500, X 280, Pinterest 500).
  - Invitar acceso: nombre y email válido, y que el email no exista en otro cliente.
  - Firma: nombre de al menos 5 caracteres, firma dibujada si se eligió "Dibujar", y casilla de aceptación.
- **Responsive**: el nav del sitio colapsa por debajo de 820px. En la plataforma, sidebar y main hacen wrap; en móvil la sidebar debe pasar a barra inferior (pendiente).

## State / Data model (Supabase)
```
organizations(id, name)                                    -- Peek Media (multi-agencia a futuro)
profiles(id=auth.uid, name, email)
memberships(user_id, org_id, role: 'owner'|'cm')           -- equipo
clients(id, org_id, name, industry, handle, avatar_color, platforms text[], contact_name, contact_email, contact_phone, status, fee)
client_users(id, client_id, user_id, role: 'admin'|'approver'|'viewer', active, invited_at)   -- 1 email → 1 cliente
social_accounts(id, client_id, platform, external_id, account_name, status, scopes, access_token_enc, refresh_token_enc, expires_at, connected_at)
posts(id, client_id, type, caption, scheduled_at, status, created_by, version)
post_targets(id, post_id, platform, status, external_id, error, published_at)
media(id, client_id, storage_path, mime, width, height, duration)
approvals(id, post_id, version, action: 'approve'|'changes', comment, by, at)
inbox_items(id, client_id, platform, kind: 'comment'|'dm'|'review', external_id, author, text, stars, post_ref, received_at, reply, replied_by, replied_at)
metrics_daily(client_id, platform, date, metric, value)    -- followers, reach, interactions, profile_views, etc.
notes(id, client_id, text, by, at)
tasks(id, client_id, text, done)
contracts(id, client_id, number, version, plan_id, price, start_date, months, billing_day, payment_method, deliverables jsonb, addons text[], status: 'draft'|'sent'|'signed'|'superseded', sent_at, pdf_path)
signatures(id, contract_id, signer_user_id, signer_name, method: 'typed'|'drawn', image_path, signed_at, ip, user_agent, doc_sha256, verification_code)   -- inmutable
plan_requests(id, client_id, type: 'plan'|'addon', target, status, by, at)
invoices(id, client_id, period, amount, status, paid_at)
leads(id, name, business, services jsonb, notes, source, created_at, status)   -- del cotizador
site_content(key, value jsonb)                              -- CMS
plans / quote_services                                     -- catálogo editable
```
**RLS:**
- El equipo ve los clientes de su organización.
- Un `client_user` solo ve las filas cuyo `client_id` es el suyo.
- Los tokens nunca se envían al navegador.
- `signatures` es de solo escritura: sin update ni delete.

Para que la firma tenga respaldo legal, guardar el hash SHA-256 del PDF firmado, la IP, el user agent y la fecha y hora del servidor. La cláusula 10 del contrato cita la Ley 126-02 de RD (validar con un abogado).

## Design Tokens
**Color** (modo claro únicamente):
| Token | Hex | Uso |
|---|---|---|
| surface-100 | `#FFFFFF` | Cards, nav, inputs |
| surface-sand (gris) | `#BEBEBE` | Fondo principal de secciones y apps, chips y pistas de barras |
| ink | `#0B1F33` | Texto, botones primarios oscuros, estado "Publicado" |
| brand-coral | `#FF5A5F` | CTA/señal (máximo 15% de cada pieza). **El texto sobre coral va en ink `#0B1F33`**, nunca en blanco (contraste). El marquee usa blanco porque su texto es ≥28px bold. |
| brand-cyan | `#21C4D6` | Subrayados, gráficas, check, "Programado", foco |
| deep-ocean | `#123553` | Bloques de foto y avatares, nunca texto |
| coral-tint | `#FFE1E2` | "Por aprobar", avisos |
| cyan-tint | `rgba(33,196,214,.2–.25)` | Pill de variación positiva, "Conectado" |
| hairline | `rgba(11,31,51,.08)` / bordes de input `rgba(11,31,51,.15)` | |
| Colores de red (solo puntos y chips) | IG `#FF5A5F` · FB `#123553` · TT `#0B1F33` · YT `#21C4D6` · Google `#5B7A99` · LinkedIn `#8FA3B5` · Threads `#3E5C76` · X `#6B7F94` · Pinterest `#E8898C` | |

**Tipografía:**
- Display: **Space Grotesk** 500/600/700. Titulares con tracking −.02 a −.055em y line-height .86–1.
- Body: **DM Sans** 400/500/600/700.
- Firma: **Caveat** 600.
- Escala usada: 12 · 13 · 14 · 15 · 16 · 17 · 19 · 20 · 22 · 24 · 28 · 32 · 36 · 40. Display fluido: `clamp(36px,4.4vw,60px)`, `clamp(48px,7vw,112px)`, `clamp(52px,8.4vw,132px)`.
- Eyebrows: 12–13px/600–700, uppercase, tracking .12–.14em.

**Espaciado**: xs 8 · sm 12 · md 20 · lg 32 · xl 56 · xxl 88 (también se usan 4, 6, 10, 14, 16, 18, 24).

**Radios**: sm 10 · 12–14 (items de lista) · md 20 · 28 (modal) · lg 36 · pill 999.

**Sombras** (reducir a 2 en el sistema):
- elevada: `0 30px 60px -30px rgba(11,31,51,.3)`
- hover: `0 24px 40px -24px rgba(11,31,51,.35)`

**Texturas**: `assets/textura-gris.svg` (partículas + íconos sociales translúcidos, tile de 420px) sobre las secciones grises y el fondo de las apps; `assets/textura-blanco.svg` solo en la sidebar. **Nunca detrás de tablas ni de formularios.**

**Movimiento**: 0.2–0.35 s para UI; 0.8 s con `cubic-bezier(.2,.8,.2,1)` para el reveal.

## Correcciones obligatorias antes o durante la construcción
Resumen de `docs/auditoria-y-plan.md`:
1. Texto ink sobre coral en todos los CTA (ya aplicado en los prototipos).
2. Login real; el punto de la "P" es solo un atajo a `/login`.
3. Ocultar las secciones del sitio con placeholders (`[...]`) hasta tener datos reales.
4. Cada cotización del sitio crea un `lead`.
5. Publicar política de privacidad, términos y URL de eliminación de datos (requisito de Meta, TikTok y Google).
6. `prefers-reduced-motion`, foco visible (anillo cian de 2px), `role="checkbox"` en las cards del cotizador y `aria-expanded` en el FAQ.
7. Reemplazar `prompt()` y `confirm()` por modales y toasts con "Deshacer".
8. Estados vacíos, de carga y de error en cada vista.
9. Barra inferior de navegación en móvil para el cliente.
10. Pasar el logo a SVG o WebP (el PNG pesa 323 KB), y añadir meta y OG, `lang="es-DO"` y datos estructurados `LocalBusiness`.

## Fases sugeridas
0. Decisiones pendientes: dominio, precios finales, texto legal del contrato.
1. Sistema de diseño (tokens + componentes con todos sus estados).
2. Sitio + CMS + leads.
3. Auth, roles, clientes, accesos (invitaciones por email) y **contratos con firma**.
4. OAuth de Meta y métricas diarias. Pedir el App Review de Meta al terminar esta fase.
5. Editor, calendario, aprobaciones y publicación programada (jobs).
6. Bandeja con webhooks y notificaciones por email.
7. Resto de redes (auditorías de TikTok y YouTube, acceso a Google Business, partner de LinkedIn, X de pago, Pinterest).

## Assets
- `prototipos/assets/peek-media-logo-horizontal.png`: lockup con wordmark (1600×780, fondo transparente). Pedir la versión SVG.
- `prototipos/assets/peek-media-simbolo.png`: ícono solo (avatar y favicon).
- `prototipos/assets/textura-gris.svg`, `textura-blanco.svg`: texturas generadas para este proyecto.
- Los íconos de la interfaz (like, comentario, enviar, guardar, WhatsApp) son SVG inline simples; reemplazarlos por un set consistente (por ejemplo Lucide).
- Marca: `marca/tokens.json` y `marca/README-marca.md`, con voz y tono: cercano, directo, humor dominicano suave, tuteo.

## Files
- `prototipos/Peek Media Landing v2.dc.html`: sitio público.
- `prototipos/Admin.dc.html`: CMS + CRM (se entra desde el punto de la P; en el demo pide crear un PIN).
- `prototipos/Dashboard Clientes.dc.html`: plataforma. Accesos demo:
  - Equipo: `equipo@peekmedia.rd` / `demo2026`
  - Clientes: `cafe@demo.do` / `CAFE-2026` · `clinica@demo.do` / `SONR-2026` (contrato por firmar) · `torre@demo.do` / `TORR-2026` (tiene una solicitud de Premium)
- `prototipos/pm-store.js`: contenido por defecto del sitio, helpers de WhatsApp y precios, y **llamadas reales a la Graph API de Meta** (`syncClient`) como referencia.
- `docs/auditoria-y-plan.md`: auditoría UX/UI, arquitectura y fases.
- `docs/que-permite-cada-api.md`: qué se puede y qué no por red, límites y requisitos.
- `docs/guia-y-pendientes.md`: contenido que falta y cómo conectar Meta.
- `marca/`: tokens y guía de marca.
