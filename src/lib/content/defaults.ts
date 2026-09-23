import type { SiteContent } from "./schema";

/**
 * Contenido inicial (del handoff, `pm-store.js` + catálogo de planes).
 * Los campos vacíos son datos que faltan: el sitio oculta lo que no tenga contenido real.
 */
export const defaultContent: SiteContent = {
  general: {
    whatsapp: "",
    website: "",
    instagram: "peekmedia.rd",
    contactEmail: "",
    followers: "",
    postsCount: "",
    heroText: "Ideas que encuentran a su gente. Marketing digital desde Santo Domingo, con estrategia y cercanía.",
    yearsExperience: "5",
    aboutTitle: "Somos Peek Media. Te ayudamos a que tu marca se vea y se quede.",
    aboutText:
      "Peek Media es una agencia de marketing digital en Santo Domingo, liderada por Dagoberto Nuñez. Dagoberto tiene más de 5 años de experiencia en marketing digital y campañas publicitarias en República Dominicana, y hoy también es director de marketing de una inmobiliaria en RD.",
    aboutPhoto: "",
    founderName: "Dagoberto Nuñez",
    founderRole: "Fundador de Peek Media",
  },
  plans: [
    {
      id: "basico",
      name: "Plan Básico",
      description: "Para empezar a tener presencia constante en redes.",
      priceFrom: 12000,
      billing: "monthly",
      items: ["12 publicaciones al mes", "2 reels y 8 historias", "2 redes sociales", "Reporte mensual y 1 reunión"],
      featured: false,
    },
    {
      id: "estrategico",
      name: "Plan Estratégico",
      description: "Estrategia, contenido y campañas trabajando juntos.",
      priceFrom: 25000,
      billing: "monthly",
      items: ["16 publicaciones al mes", "6 reels y 16 historias", "4 redes sociales", "Reporte mensual y 2 reuniones"],
      featured: true,
    },
    {
      id: "premium",
      name: "Plan Premium",
      description: "Para marcas que quieren estar en todas partes, todo el mes.",
      priceFrom: 45000,
      billing: "monthly",
      items: ["24 publicaciones al mes", "10 reels y 30 historias", "6 redes sociales", "2 reportes y 4 reuniones al mes"],
      featured: false,
    },
    {
      id: "auditoria",
      name: "Auditoría de Redes",
      description: "Revisamos tus redes y te decimos qué mejorar.",
      priceFrom: 6500,
      billing: "once",
      items: ["Diagnóstico de tus cuentas", "Comparación con tu competencia", "Plan de acción por escrito"],
      featured: false,
    },
  ],
  posts: [
    { title: "Te queremos ayudar: apoya negocios locales", tag: "Comunidad", image: "", url: "" },
    { title: "Un regalo para el emprendedor", tag: "Tips", image: "", url: "" },
    { title: "Adivina la red social", tag: "Juego", image: "", url: "" },
    { title: "Debí publicar más", tag: "Humor", image: "", url: "" },
    { title: "El cliente dice: haz que se haga viral", tag: "Humor", image: "", url: "" },
    { title: "No te imagines una empanada con lentes", tag: "Creatividad", image: "", url: "" },
  ],
  process: [
    { title: "Diagnóstico", desc: "Revisamos tu marca, tus redes y a tu competencia." },
    { title: "Estrategia", desc: "Definimos a quién le hablamos, qué decimos y dónde." },
    { title: "Contenido", desc: "Creamos y publicamos piezas pensadas para tu gente." },
    { title: "Medición", desc: "Revisamos los números y ajustamos lo que haga falta." },
  ],
  case: {
    title: "Marketing para una inmobiliaria en RD.",
    text: "Dagoberto Nuñez dirige el marketing de una inmobiliaria en República Dominicana. Desde ahí aplica lo mismo que ofrece Peek Media: estrategia, contenido y campañas pensadas para resultados.",
    photo: "",
    metrics: [
      { value: "", label: "Estrategia" },
      { value: "", label: "Contenido" },
      { value: "", label: "Resultados" },
    ],
  },
  logos: [],
  testimonials: [],
  faq: [
    { q: "¿Cuánto tiempo toma ver resultados?", a: "" },
    { q: "¿Necesito firmar un contrato largo?", a: "" },
    { q: "¿Trabajan con negocios fuera de Santo Domingo?", a: "" },
    { q: "¿La inversión en anuncios está incluida en el plan?", a: "" },
    { q: "¿Qué necesito para empezar?", a: "" },
  ],
  quoteServices: [
    { id: "redes", name: "Manejo de redes sociales", description: "Publicación y comunidad en tus cuentas.", priceFrom: 10000, billing: "monthly" },
    { id: "diseno", name: "Diseño de posts y carruseles", description: "Piezas gráficas para tu feed.", priceFrom: 6000, billing: "monthly" },
    { id: "reels", name: "Reels y video corto", description: "Guion, edición y publicación.", priceFrom: 8000, billing: "monthly" },
    { id: "meta-ads", name: "Campañas en Meta Ads", description: "Facebook e Instagram. La inversión en anuncios va aparte.", priceFrom: 7000, billing: "monthly" },
    { id: "reporte", name: "Reporte mensual de métricas", description: "Qué funcionó y qué ajustar.", priceFrom: 2500, billing: "monthly" },
    { id: "auditoria", name: "Auditoría de redes", description: "Diagnóstico completo de tus cuentas.", priceFrom: 6500, billing: "once" },
    { id: "estrategia", name: "Estrategia de contenido", description: "Pilares, tono y calendario.", priceFrom: 9000, billing: "once" },
    { id: "identidad", name: "Identidad visual", description: "Logo, colores y tipografía.", priceFrom: 15000, billing: "once" },
    { id: "fotos", name: "Sesión de fotos o video", description: "Producción para tu marca.", priceFrom: 8000, billing: "once" },
  ],
};
