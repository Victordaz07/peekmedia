# Qué se puede hacer desde el dashboard, según cada API

Referencia para `Dashboard Clientes.dc.html`. Revisado en septiembre de 2026. Las plataformas cambian sus reglas seguido, así que confírmalo en la documentación oficial antes de prometer algo a un cliente.

## Resumen rápido

| Plataforma | Publicar | Programar | Métricas | Comentarios | Mensajes |
|---|---|---|---|---|---|
| Instagram | Sí (post, carrusel, reel, historia) | Con servidor propio | Sí | Sí | Sí, ventana de 24 h |
| Facebook Páginas | Sí | Sí, nativo | Sí | Sí | Sí, ventana de 24 h |
| TikTok | Sí, **privado hasta pasar auditoría** | Con servidor propio | Sí (Business API) | Business API | No |
| YouTube | Sí, **privado hasta pasar auditoría** | Sí, nativo | Sí (Analytics API) | Sí | No aplica |
| Google Business Profile | Novedades, ofertas, eventos | Con servidor propio | Sí | Reseñas: responder | No |
| LinkedIn (empresa) | Solo con aprobación de partner | Con aprobación | Con aprobación | Con aprobación | No |

## Instagram (Meta Graph API)

**Se puede**
- Publicar fotos, carruseles (hasta 10 piezas), reels e historias en cuentas profesionales.
- Límite: 100 publicaciones por API cada 24 h, en ventana móvil. El carrusel cuenta como una sola.
- Métricas de cuenta y de cada post: alcance, interacciones, guardados, visitas al perfil. Demografía para cuentas con 100 o más seguidores.
- Leer, responder, ocultar y borrar comentarios.
- Responder mensajes directos dentro de las 24 h siguientes al último mensaje del usuario.
- Ver seguidores y posts públicos de otras cuentas profesionales, útil para analizar a la competencia.

**No se puede**
- Cuentas personales.
- Música de la biblioteca de Instagram, filtros, ni stickers de encuesta o enlace en historias.
- Editar un post ya publicado, ni ver la lista de seguidores o quién dejó de seguir.
- Programación nativa: la API publica al momento, así que tu servidor tiene que guardar la publicación y enviarla a la hora elegida.

**Requisitos:** App de Meta, Revisión de la app (App Review) con los permisos de publicación, comentarios, mensajes e insights, y verificación del negocio. Mientras la app esté en modo desarrollo, solo funciona con cuentas donde tienes un rol.

## Facebook Páginas + Meta Ads

**Se puede**
- Publicar y **programar de forma nativa** texto, fotos, videos, reels y enlaces en Páginas.
- Métricas de la Página y de cada publicación.
- Responder comentarios y mensajes de Messenger (regla de 24 h).
- Marketing API: crear, pausar y medir campañas de anuncios.

**No se puede:** publicar en perfiles personales ni en grupos.

## TikTok

**Se puede**
- Publicar videos y fotos con la Content Posting API.
- Enviar el contenido como borrador a la bandeja de TikTok del cliente, para que él lo termine y lo publique desde la app. Es una buena salida mientras no tengas la auditoría.
- Métricas con TikTok Business API.

**No se puede (sin auditoría)**
- Mientras la app no pase la auditoría, todo lo que publiques queda en modo privado.
- Sin auditoría, solo 5 usuarios pueden publicar por día.
- Hay un tope de unos 15 posts por día por cuenta.
- No hay sonidos en tendencia, efectos, programación nativa ni mensajes directos.

**Requisitos:** app en TikTok for Developers y auditoría de Direct Post, con un video demo del flujo completo.

## YouTube (Data API + Analytics API)

**Se puede**
- Subir videos y Shorts y **programarlos de forma nativa**: se suben como privados con fecha de publicación.
- La cuota por defecto permite 100 subidas al día.
- Editar título, descripción, miniatura y listas de reproducción.
- Analytics: vistas, horas de reproducción, suscriptores, demografía y fuentes de tráfico.
- Responder y moderar comentarios.

**No se puede**
- Si el proyecto de Google no ha pasado la auditoría, todo lo que subas queda privado.
- Publicaciones de Comunidad.
- Marcar un video como Short: YouTube lo decide por el formato (vertical) y la duración.

## Google Business Profile

**Se puede:** publicar novedades, ofertas y eventos; leer y responder reseñas; ver métricas (vistas en Búsqueda y Maps, llamadas, clics a la web, solicitudes de cómo llegar); editar horario y datos del negocio.

**No se puede:** borrar reseñas negativas (solo responderlas o reportarlas). Tampoco se puede usar la API sin pedir acceso a Google y que lo aprueben.

## LinkedIn

Publicar, programar y ver métricas de páginas de empresa requiere que LinkedIn te apruebe como partner de la Community Management API. Sin esa aprobación no hay acceso.

## Otras integraciones útiles para un CM

- **Google Analytics 4 (Data API):** tráfico web, fuentes y conversiones del sitio del cliente. Sirve para mostrar qué redes llevan visitas a su web.
- **WhatsApp Business Platform:** enviar mensajes con plantillas aprobadas y atender conversaciones del número de empresa. No da acceso a WhatsApp personal.
- **Meta Ads / Google Ads:** gasto, resultados y costo por resultado dentro del reporte mensual.
- **X (Twitter):** tiene API, pero es de pago.

## Lo que ninguna plataforma permite

- Publicar en cuentas personales.
- Usar música con derechos de autor desde sus bibliotecas.
- Ver datos privados de la competencia.
- Automatizar likes, follows o comentarios masivos. Está prohibido y es motivo de bloqueo.

## Qué hace hoy el dashboard (mockup) y qué falta

**Ya funciona con datos de demostración:**
- Resumen: KPIs, gráfica de crecimiento y rendimiento por red.
- Calendario de contenido.
- Crear y programar publicaciones, con límite de caracteres por red y avisos de cada plataforma.
- Bandeja unificada con respuestas rápidas.
- Aprobaciones del cliente.
- Reportes en PDF, con demografía y mejores horas para publicar.
- Novedades y notas del CM.
- Mapa de conexiones.

**Para producción hace falta:**
1. **Backend** (por ejemplo Supabase o Firebase) con login de verdad para el CM y para cada cliente.
2. **Conexión OAuth** con cada red: el cliente conecta sus cuentas una sola vez.
3. **Un servidor de tareas** que publique a la hora programada (Instagram, TikTok, Google) y que traiga las métricas todos los días.
4. **Almacenamiento de archivos** para imágenes y videos, porque las APIs piden una URL pública.
5. **Webhooks** de Meta para que los comentarios y mensajes nuevos lleguen en tiempo real.
6. **Revisiones y auditorías**: Meta App Review, auditoría de TikTok, auditoría de YouTube, acceso a Google Business Profile y, si lo quieres, partner de LinkedIn.

**Atajo posible:** en lugar de pasar todas las auditorías tú mismo, puedes usar un proveedor que ya las tiene aprobadas y que publica en todas las redes con una sola API (por ejemplo Ayrshare, Outstand o Postproxy). Tu dashboard queda igual y ellos se encargan de la conexión con cada red.
