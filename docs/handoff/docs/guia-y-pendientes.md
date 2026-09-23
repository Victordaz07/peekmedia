# Peek Media — Guía y pendientes

## 1. Qué se aplicó en la versión 2

Archivo: `Peek Media Landing v2.dc.html` (la versión 1 queda intacta).

- **WhatsApp con mensaje prellenado.** Cada botón abre WhatsApp con un texto distinto (nav, hero, cada plan, cotizador, CTA final, burbuja flotante). Así sabes desde qué parte de la página te escriben.
- **Cotiza a tu medida.** Nueva sección donde el visitante marca servicios, escribe su nombre, negocio y notas, y envía todo armado por WhatsApp. Si pones precios en el admin, calcula el total mensual y el pago único; sin precio muestra "A cotizar".
- **Cómo trabajamos.** 4 pasos: Diagnóstico → Estrategia → Contenido → Medición.
- **Preguntas frecuentes.** 5 preguntas en acordeón. Las respuestas están en `[Respuesta]`.
- **Franja de logos de clientes.** 5 espacios con `[Logo cliente]`.
- **Planes con "Qué incluye" editable** desde el admin.
- **Fotos y portadas desde el admin.** Pegas la URL de la imagen y reemplaza el bloque de color.
- **Móvil.** El menú se simplifica en pantallas pequeñas, la burbuja flotante se reduce a solo el ícono y los márgenes se ajustan.
- **Acceso oculto al admin.** Está en el **punto coral dentro de la P** del logo del menú superior.

## 2. Cómo entrar al admin

1. En el sitio, haz clic en el **punto coral** dentro de la P del logo (arriba a la izquierda).
2. La primera vez te pide **crear un PIN** (mínimo 4 caracteres). Después, cada vez que entres, te pide ese PIN.
3. Secciones del admin:
   - **Contenido del sitio:** General (WhatsApp, web, Instagram, seguidores, textos, foto), Planes, Feed, Cómo trabajamos, Caso real, Logos, Testimonios, Preguntas frecuentes.
   - **Cotizador:** servicios, precios (RD$) y si el cobro es mensual o único.
   - **Clientes:** CRM con estado (Prospecto, Activo, Pausado, Finalizado), plan, tarifa, notas, tareas, botón de WhatsApp y métricas de Meta.
   - **Ajustes:** PIN, token de Meta, respaldo (.json), exportación de clientes (.csv) y restablecer contenido.
4. En Contenido y Cotizador, presiona **Guardar cambios**. En Clientes todo se guarda solo.

## 3. Lo que tienes que hacer tú (desde el admin)

Todo esto se llena en **Admin → Contenido** o **Admin → Cotizador**.

- [ ] **Número de WhatsApp.** Es lo primero: sin él, los botones abren WhatsApp sin destinatario. Formato: `1809XXXXXXX`.
- [ ] **Sitio web** (reemplaza `[Sitio web]`).
- [ ] **Seguidores y publicaciones** de @peekmedia.rd.
- [ ] **Foto de Dagoberto** (URL). Si no tienes dónde subirla, súbela a tu hosting o a Cloudinary, que es gratis.
- [ ] **Foto del proyecto inmobiliario** para el caso real.
- [ ] **Métricas verificadas del caso real.** Aunque sea una cifra (leads, ventas atribuidas, alcance). Si no hay cifra confirmada, deja el placeholder.
- [ ] **Planes:** precio y 3–5 puntos de "Qué incluye" por plan.
- [ ] **Precios del cotizador.** Si un servicio siempre varía, deja el precio vacío y saldrá "A cotizar".
- [ ] **Portadas reales de los 6 posts** (URL de imagen + enlace al post).
- [ ] **Respuestas de las preguntas frecuentes.**
- [ ] **Logos de clientes**, solo con su permiso.
- [ ] **Testimonios reales.** Pide 2–3 a clientes satisfechos por WhatsApp: nombre, negocio y 1–2 frases.

## 4. Lo que tienes que hacer tú (fuera del sitio)

- [ ] **Unificar dominio y handle.** Elige uno entre peekmedia.rd, dagomarketing.com y peekemediard.com, y úsalo igual en la web, Instagram, WhatsApp Business y las firmas de correo.
- [ ] **Comprar dominio y hosting.** El sitio es estático, así que sirven Netlify, Vercel o Cloudflare Pages (gratis) con tu dominio.
- [ ] **Versión reversa del logo y SVG** (pendiente en el README de marca). La necesitas para fondos oscuros e impresos grandes.
- [ ] **Perfil de WhatsApp Business** con catálogo, horario y mensaje de bienvenida.

## 5. Conectar la API de Meta (métricas de clientes)

El CRM consulta la Graph API de Meta por cada cliente. Trae seguidores, publicaciones, alcance de 30 días, cuentas que interactuaron, interacciones, visitas al perfil, engagement por post, los posts con más interacción y los datos de anuncios (gasto, impresiones, alcance, clics, CTR, CPC).

### Requisitos por cliente

- Cuenta de Instagram **Business o Creador** vinculada a una **Página de Facebook**.
- Que el cliente te dé acceso a esa página (y a su cuenta publicitaria, si vas a medir anuncios) desde su **Meta Business Suite**.

### Pasos (una sola vez)

1. Entra a **developers.facebook.com** → *Mis apps* → **Crear app** (tipo *Empresa*).
2. Agrega los productos **Instagram Graph API** y **Marketing API**.
3. Abre el **Explorador de la Graph API** y genera un token de usuario con estos permisos:
   `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`, `business_management`, `ads_read`.
4. Convierte el token en uno **de larga duración (60 días)** con el endpoint `oauth/access_token?grant_type=fb_exchange_token`. También puedes crear un **usuario del sistema** en Business Manager, que da tokens sin vencimiento.
5. Busca el **ID de Instagram Business** de cada cliente: en el Explorador, consulta `me/accounts?fields=name,instagram_business_account`.
6. Busca la **cuenta publicitaria** en Business Manager → *Cuentas publicitarias* (formato `act_123…`).

### En el admin

- **Ajustes →** pega el token en "Access token por defecto".
- **Clientes → cliente →** pega el ID de Instagram y la cuenta publicitaria, y presiona **Sincronizar**.
- Cada sincronización se guarda en el historial (hasta 24) para comparar el crecimiento de seguidores.
- Si Meta responde con error, el mensaje aparece en pantalla: permiso faltante, token vencido o ID incorrecto.

> Para gestionar muchos clientes, Meta pide que la app pase por la **Revisión de la app** (App Review) con los permisos de arriba. Mientras está en modo desarrollo, solo funciona con cuentas donde tú tienes rol de administrador.

## 6. Importante: limitaciones actuales

El admin funciona hoy, pero es un **prototipo**:

- **Los datos se guardan en el navegador** donde los editas (localStorage). Si editas en tu laptop, el sitio publicado no ve esos cambios en el celular de otra persona. Para que el contenido editado se vea en internet, hace falta una base de datos.
- **El PIN no es seguridad real.** Es un candado visual; cualquiera con conocimientos técnicos puede saltarlo.
- **Los tokens de Meta quedan en el navegador.** En producción deben vivir en un servidor, nunca en el navegador del visitante.
- **Descarga un respaldo** (Admin → Ajustes) con frecuencia hasta que exista el backend.

### Paso siguiente recomendado (para producción)

Conectar un backend, por ejemplo **Supabase** o **Firebase**, que tienen plan gratuito, para:

1. Guardar contenido y clientes en una base de datos real.
2. Login real (email + contraseña) en vez del PIN.
3. Una función en el servidor que guarde los tokens de Meta y haga las consultas a la API.
4. Sincronización automática diaria de métricas y reportes mensuales por cliente en PDF.

## 7. Archivos del proyecto

- `Peek Media Landing v2.dc.html` — sitio público (versión nueva).
- `Peek Media Landing.dc.html` — versión 1, sin cambios.
- `Admin.dc.html` — panel de administración (se entra por el punto de la P).
- `pm-store.js` — contenido por defecto, guardado y conexión con Meta.
- `assets/` — logos.
