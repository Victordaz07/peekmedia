/**
 * Vocabulario compartido del sistema de diseño: redes, estados y escalas.
 * Los valores visuales viven en src/app/globals.css (@theme); aquí solo se referencian por nombre.
 */

/** Escala de espacio de la marca, expresada en unidades de Tailwind (1 = 4px). */
export const space = {
  xs: 2, // 8px — ícono y texto
  sm: 3, // 12px — padding de chips y botones pequeños
  md: 5, // 20px — padding estándar de cards
  lg: 8, // 32px — entre bloques de una sección
  xl: 14, // 56px — márgenes de sección
  xxl: 22, // 88px — entre secciones grandes
} as const;

export const networks = {
  instagram: { label: "Instagram", short: "IG", dot: "bg-net-instagram", charLimit: 2200 },
  facebook: { label: "Facebook", short: "FB", dot: "bg-net-facebook", charLimit: 63206 },
  tiktok: { label: "TikTok", short: "TT", dot: "bg-net-tiktok", charLimit: 2200 },
  youtube: { label: "YouTube", short: "YT", dot: "bg-net-youtube", charLimit: 5000 },
  google: { label: "Google Business", short: "GBP", dot: "bg-net-google", charLimit: 1500 },
  linkedin: { label: "LinkedIn", short: "LI", dot: "bg-net-linkedin", charLimit: 3000 },
  threads: { label: "Threads", short: "TH", dot: "bg-net-threads", charLimit: 500 },
  x: { label: "X", short: "X", dot: "bg-net-x", charLimit: 280 },
  pinterest: { label: "Pinterest", short: "PIN", dot: "bg-net-pinterest", charLimit: 500 },
} as const;

export type Network = keyof typeof networks;
export const networkIds = Object.keys(networks) as Network[];

/** Clases de cada tono de pill/badge. Todos con texto ink salvo los fondos oscuros. */
export const tones = {
  neutral: "bg-sand text-ink",
  outline: "bg-surface text-ink ring-1 ring-inset ring-line",
  info: "bg-cyan-tint text-ink",
  accent: "bg-cyan text-ink",
  warning: "bg-coral-tint text-ink",
  alert: "bg-coral text-ink",
  danger: "bg-coral-strong text-white",
  dark: "bg-ink text-white",
} as const;

export type Tone = keyof typeof tones;

type StatusDef = { label: string; tone: Tone };

/** Contenido: Borrador → Por aprobar → Cambios pedidos → Aprobado → Programado → Publicado / Falló */
export const postStatus = {
  draft: { label: "Borrador", tone: "neutral" },
  pending: { label: "Por aprobar", tone: "warning" },
  changes: { label: "Cambios pedidos", tone: "alert" },
  approved: { label: "Aprobado", tone: "info" },
  scheduled: { label: "Programado", tone: "accent" },
  published: { label: "Publicado", tone: "dark" },
  failed: { label: "Falló", tone: "danger" },
} as const satisfies Record<string, StatusDef>;

/** Clientes: Prospecto → Activo → Pausado → Finalizado */
export const clientStatus = {
  prospect: { label: "Prospecto", tone: "outline" },
  active: { label: "Activo", tone: "info" },
  paused: { label: "Pausado", tone: "warning" },
  ended: { label: "Finalizado", tone: "neutral" },
} as const satisfies Record<string, StatusDef>;

/** Contratos */
export const contractStatus = {
  draft: { label: "Borrador", tone: "neutral" },
  sent: { label: "Pendiente de firma", tone: "warning" },
  signed: { label: "Firmado · Vigente", tone: "accent" },
  superseded: { label: "Versión anterior", tone: "outline" },
} as const satisfies Record<string, StatusDef>;

/** Conexión de cuentas: none → esperando → verificando → conectado */
export const connectionStatus = {
  none: { label: "Sin conectar", tone: "neutral" },
  waiting: { label: "Esperando que termines", tone: "warning" },
  verifying: { label: "En verificación", tone: "outline" },
  connected: { label: "Conectado", tone: "info" },
} as const satisfies Record<string, StatusDef>;

/** Pagos */
export const invoiceStatus = {
  paid: { label: "Pagado", tone: "info" },
  pending: { label: "Pendiente", tone: "warning" },
  upcoming: { label: "Próximo", tone: "outline" },
} as const satisfies Record<string, StatusDef>;

/** Prospectos que llegan del cotizador del sitio */
export const leadStatus = {
  new: { label: "Nuevo", tone: "alert" },
  contacted: { label: "Contactado", tone: "warning" },
  proposal: { label: "Propuesta enviada", tone: "info" },
  won: { label: "Ganado", tone: "accent" },
  lost: { label: "Perdido", tone: "neutral" },
} as const satisfies Record<string, StatusDef>;

/** Solicitudes de cambio de plan o de servicios adicionales */
export const requestStatus = {
  pending: { label: "Pendiente", tone: "warning" },
  approved: { label: "Aprobada", tone: "info" },
  rejected: { label: "Rechazada", tone: "neutral" },
} as const satisfies Record<string, StatusDef>;

/** Accesos de personas del cliente */
export const accessStatus = {
  active: { label: "Activo", tone: "info" },
  inactive: { label: "Desactivado", tone: "neutral" },
} as const satisfies Record<string, StatusDef>;

export const statusVocabularies = {
  post: postStatus,
  client: clientStatus,
  contract: contractStatus,
  connection: connectionStatus,
  invoice: invoiceStatus,
  lead: leadStatus,
  request: requestStatus,
  access: accessStatus,
} as const;

export type StatusKind = keyof typeof statusVocabularies;
export type StatusOf<K extends StatusKind> = keyof (typeof statusVocabularies)[K];

/** Colores de avatar de cliente (4 opciones del formulario). */
export const avatarColors = {
  coral: "bg-coral text-ink",
  cyan: "bg-cyan text-ink",
  ink: "bg-ink text-white",
  ocean: "bg-ocean text-white",
} as const;

export type AvatarColor = keyof typeof avatarColors;
