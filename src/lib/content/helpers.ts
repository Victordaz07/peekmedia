import type { Billing, QuoteService, SiteContent } from "./schema";

/** Un texto cuenta como contenido real si no está vacío y no es un placeholder tipo "[Respuesta]". */
export function hasText(value: string | null | undefined): value is string {
  if (!value) return false;
  const v = value.trim();
  return v.length > 0 && !/^\[.*\]$/.test(v);
}

export function waLink(number: string, message?: string) {
  const n = number.replace(/\D/g, "");
  return `https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export function instagramUrl(handle: string) {
  return `https://instagram.com/${handle.replace(/^@/, "")}`;
}

export function money(n: number) {
  return `RD$ ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function priceLabel(priceFrom: number | null, billing: Billing) {
  if (priceFrom == null) return "A cotizar";
  return `Desde ${money(priceFrom)}${billing === "monthly" ? " / mes" : ""}`;
}

export function quoteTotals(selected: Pick<QuoteService, "priceFrom" | "billing">[]) {
  let monthly = 0;
  let once = 0;
  let unpriced = 0;
  for (const s of selected) {
    if (s.priceFrom == null) unpriced++;
    else if (s.billing === "monthly") monthly += s.priceFrom;
    else once += s.priceFrom;
  }
  return { monthly, once, unpriced };
}

export function quoteMessage(q: { name: string; business: string; notes: string; services: Pick<QuoteService, "name">[] }) {
  return [
    "Hola Peek Media, quiero una cotización personalizada.",
    q.name.trim() && `Nombre: ${q.name.trim()}`,
    q.business.trim() && `Negocio: ${q.business.trim()}`,
    q.services.length ? `Servicios:\n${q.services.map((s) => `- ${s.name}`).join("\n")}` : "",
    q.notes.trim() && `Notas: ${q.notes.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Mensajes prellenados por CTA: así se sabe desde qué parte de la página escriben. */
export const waMessages = {
  nav: "Hola Peek Media, quiero información.",
  hero: "Hola, quiero que mi marca se vea. ¿Hablamos?",
  cta: "Hola Peek Media, quiero hablar de mi negocio.",
  bubble: "Hola Peek Media.",
  plan: (name: string) => `Hola Peek Media, me interesa el ${name}.`,
} as const;

/**
 * Vista pública: filtra lo que no tiene datos reales para que ningún placeholder salga publicado.
 * Una sección sin elementos se oculta entera.
 */
export function publicView(c: SiteContent) {
  const g = c.general;
  return {
    general: g,
    plans: c.plans.map((p) => ({ ...p, items: p.items.filter(hasText) })),
    posts: c.posts.filter((p) => hasText(p.title)),
    process: c.process.filter((s) => hasText(s.title)),
    case: { ...c.case, metrics: c.case.metrics.filter((m) => hasText(m.value)) },
    logos: c.logos.filter((l) => hasText(l.name) || hasText(l.image)),
    testimonials: c.testimonials.filter((t) => hasText(t.quote) && hasText(t.name)),
    faq: c.faq.filter((f) => hasText(f.q) && hasText(f.a)),
    quoteServices: c.quoteServices.filter((s) => hasText(s.name)),
  };
}

export type PublicContent = ReturnType<typeof publicView>;
