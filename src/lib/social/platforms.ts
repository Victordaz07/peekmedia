import type { Network } from "@/lib/design/tokens";

/**
 * Cómo se conecta, publica y mide cada red.
 * - meta: API directa de Meta (Graph API) para Instagram y Facebook.
 * - ayrshare: agregador ya auditado para el resto (TikTok, YouTube, Google, LinkedIn, Pinterest, X, Threads).
 */
export type Provider = "meta" | "ayrshare";

export const providerOf: Record<Network, Provider> = {
  instagram: "meta",
  facebook: "meta",
  threads: "ayrshare",
  tiktok: "ayrshare",
  youtube: "ayrshare",
  google: "ayrshare",
  linkedin: "ayrshare",
  pinterest: "ayrshare",
  x: "ayrshare",
};

/** Nombre de cada red en la API de Ayrshare. */
export const ayrshareName: Partial<Record<Network, string>> = {
  threads: "threads",
  tiktok: "tiktok",
  youtube: "youtube",
  google: "gmb",
  linkedin: "linkedin",
  pinterest: "pinterest",
  x: "twitter",
};

export const postTypes = ["post", "carousel", "reel", "story", "video"] as const;
export type PostType = (typeof postTypes)[number];

export const postTypeLabel: Record<PostType, string> = {
  post: "Post",
  carousel: "Carrusel",
  reel: "Reel",
  story: "Historia",
  video: "Video o Short",
};

/** Relación de aspecto de la vista previa según el formato. */
export const postTypeRatio: Record<PostType, string> = {
  post: "1 / 1",
  carousel: "1 / 1",
  reel: "9 / 16",
  story: "9 / 16",
  video: "16 / 9",
};

/** Permisos en lenguaje simple (pantalla "Conectar cuentas"). */
export const permissions: Record<Network, string[]> = {
  instagram: ["Publicar y programar posts, reels e historias", "Ver métricas y datos de tu audiencia", "Responder comentarios y mensajes"],
  facebook: ["Publicar y programar en tu página", "Ver métricas de la página", "Responder comentarios y Messenger", "Ver resultados de tus anuncios"],
  threads: ["Publicar y programar", "Ver métricas", "Responder respuestas"],
  tiktok: ["Publicar videos y fotos", "Ver métricas de tus videos"],
  youtube: ["Subir y programar videos", "Ver YouTube Analytics", "Responder comentarios"],
  google: ["Publicar novedades y ofertas", "Responder reseñas", "Ver vistas, llamadas y rutas"],
  linkedin: ["Publicar en tu página de empresa", "Ver métricas de la página"],
  x: ["Publicar y programar", "Ver métricas de tus posts"],
  pinterest: ["Crear pines y tableros", "Ver métricas de tus pines"],
};

/** Aviso que aparece al elegir la red en "Crear publicación". */
export const composerNote: Partial<Record<Network, string>> = {
  tiktok: "Sin auditoría de TikTok la publicación queda privada. Alternativa: enviarla como borrador a la app.",
  google: "Google solo acepta novedades, ofertas o eventos; nada de reels ni historias.",
  linkedin: "Requiere aprobación de LinkedIn como partner.",
  youtube: "YouTube necesita un video. Si es vertical y corto, sale como Short.",
  x: "X cobra por cada publicación hecha por la API.",
  pinterest: "Pinterest necesita imagen o video.",
  threads: "Threads: máximo 500 caracteres.",
};

/** Redes que necesitan imagen o video sí o sí. */
export const needsMedia: Network[] = ["instagram", "tiktok", "youtube", "pinterest"];

/** Pasos para dar acceso como socio cuando no hay conexión directa. */
export const manualAccess: Partial<Record<Network, { url: string; steps: (businessId: string) => string[] }>> = {
  instagram: {
    url: "https://business.facebook.com/settings/partners",
    steps: (b) => [
      "Se abrió Meta Business Suite › Configuración del negocio › Socios.",
      "Toca “Agregar” › “Dar a un socio acceso a tus activos”.",
      `Escribe el ID de negocio de Peek Media: ${b}.`,
      "Marca tu cuenta de Instagram y tu página de Facebook con control total, y guarda.",
    ],
  },
  facebook: {
    url: "https://business.facebook.com/settings/partners",
    steps: (b) => [
      "Se abrió Meta Business Suite › Configuración del negocio › Socios.",
      "Toca “Agregar” › “Dar a un socio acceso a tus activos”.",
      `Escribe el ID de negocio de Peek Media: ${b}.`,
      "Marca tu página de Facebook (y la cuenta publicitaria) con control total, y guarda.",
    ],
  },
  youtube: {
    url: "https://studio.youtube.com/",
    steps: () => ["Se abrió YouTube Studio. Ve a Configuración › Permisos.", "Toca “Invitar” y escribe el correo del equipo de Peek Media.", "Elige el rol “Administrador” y guarda."],
  },
  google: {
    url: "https://business.google.com/",
    steps: () => ["Se abrió tu perfil de negocio en Google.", "Menú ⋮ › Configuración del perfil › Personas y acceso.", "Agrega el correo del equipo de Peek Media como Administrador."],
  },
  linkedin: {
    url: "https://www.linkedin.com/",
    steps: () => ["Abre tu página de empresa en LinkedIn.", "Herramientas de administrador › Administrar administradores.", "Agrega a la persona de Peek Media como “Administrador de contenido”."],
  },
  pinterest: {
    url: "https://www.pinterest.com/settings/",
    steps: () => ["Se abrió la configuración de Pinterest. Ve a “Acceso de empresa”.", "Toca “Agregar socio” y escribe el ID de empresa de Peek Media.", "Dale acceso a tus tableros."],
  },
};

/** Qué permite y qué no cada API (pantalla "Conexiones y API"). Revisado en septiembre de 2026. */
export const capabilities: { id: Network; can: string[]; cannot: string[]; req: string }[] = [
  {
    id: "instagram",
    can: [
      "Publicar fotos, carruseles (hasta 10), reels e historias en cuentas profesionales.",
      "Programar: el servidor publica a la hora elegida.",
      "Métricas de cuenta y de cada post: alcance, interacciones, guardados, visitas al perfil.",
      "Demografía de seguidores (cuentas con 100+ seguidores).",
      "Leer, responder, ocultar y borrar comentarios.",
      "Responder DMs dentro de 24 h desde el último mensaje del usuario.",
    ],
    cannot: ["Cuentas personales.", "Música de la biblioteca, filtros, stickers de encuesta o enlace en historias.", "Editar un post ya publicado.", "Ver la lista de seguidores o quién dejó de seguir."],
    req: "App de Meta + App Review (publicación, comentarios, mensajes, insights) + verificación del negocio. Hasta 100 posts por API cada 24 h.",
  },
  {
    id: "facebook",
    can: ["Publicar y programar en Páginas: texto, fotos, videos, reels y enlaces.", "Métricas de Página y de cada publicación.", "Responder comentarios y Messenger (regla de 24 h).", "Anuncios con Marketing API."],
    cannot: ["Perfiles personales y grupos.", "Historias con stickers o música.", "Mensajes de más de 24 h sin etiqueta aprobada."],
    req: "La misma app de Meta que Instagram. Permisos pages_manage_posts, pages_read_engagement, pages_messaging y read_insights.",
  },
  {
    id: "tiktok",
    can: ["Publicar videos y fotos.", "Enviar como borrador a la bandeja de TikTok del cliente.", "Métricas de perfil y videos."],
    cannot: ["Sin auditoría, lo publicado queda privado.", "Unos 15 posts por día por cuenta.", "Sonidos en tendencia, efectos y mensajes directos."],
    req: "Vía Ayrshare (ya auditado) o app propia en TikTok for Developers con auditoría de Direct Post.",
  },
  {
    id: "youtube",
    can: ["Subir videos y Shorts, y programarlos.", "Editar título y descripción.", "Analytics: vistas, suscriptores, demografía.", "Responder comentarios."],
    cannot: ["Publicaciones de Comunidad.", "Marcar un video como Short: YouTube lo decide por formato y duración."],
    req: "Vía Ayrshare o proyecto propio en Google Cloud con auditoría de la YouTube API.",
  },
  {
    id: "google",
    can: ["Publicar novedades, ofertas y eventos.", "Leer y responder reseñas.", "Métricas: vistas, llamadas, clics a la web y rutas."],
    cannot: ["Borrar reseñas negativas (solo responder o reportar)."],
    req: "Vía Ayrshare o acceso aprobado a las APIs de Google Business Profile.",
  },
  {
    id: "linkedin",
    can: ["Publicar en páginas de empresa.", "Métricas de página y de publicaciones.", "Responder comentarios."],
    cannot: ["Nada de esto sin partner aprobado (o un agregador que ya lo sea)."],
    req: "Vía Ayrshare o aprobación en LinkedIn Community Management API.",
  },
  {
    id: "threads",
    can: ["Publicar texto, imágenes, videos y carruseles.", "Métricas de perfil y de cada post.", "Leer y responder respuestas."],
    cannot: ["Mensajes directos.", "Programación nativa (la hace nuestro servidor)."],
    req: "Vía Ayrshare o Threads API de Meta con App Review.",
  },
  {
    id: "x",
    can: ["Publicar posts con imagen o video.", "Métricas de posts."],
    cannot: ["No es gratis: la API cobra por uso."],
    req: "Vía Ayrshare (incluye el acceso) o cuenta de desarrollador de pago en X.",
  },
  {
    id: "pinterest",
    can: ["Crear pines de imagen o video.", "Métricas de pines y de la cuenta."],
    cannot: ["Mensajes directos."],
    req: "Vía Ayrshare o app en Pinterest Developers con acceso estándar.",
  },
];
