import type { Plan } from "@/lib/content/schema";

export const deliverableKeys = ["posts", "reels", "stories", "networks", "reports", "meetings"] as const;
export type DeliverableKey = (typeof deliverableKeys)[number];
export type Deliverables = Record<DeliverableKey, number>;

export const deliverableLabel: Record<DeliverableKey, string> = {
  posts: "Publicaciones al mes",
  reels: "Reels o videos al mes",
  stories: "Historias al mes",
  networks: "Redes gestionadas",
  reports: "Reportes al mes",
  meetings: "Reuniones al mes",
};

export const ADDONS = [
  "Sesión de fotos o video",
  "Identidad visual",
  "Campañas en Google",
  "Pack de 4 reels extra",
  "Auditoría de redes",
  "Página web",
] as const;

export const PAYMENT_METHODS = ["Transferencia bancaria", "Tarjeta de crédito", "Depósito", "Efectivo"] as const;

const zero: Deliverables = { posts: 0, reels: 0, stories: 0, networks: 0, reports: 0, meetings: 0 };

/** Entregables y extras por plan (catálogo del handoff). Un plan nuevo del CMS empieza en cero. */
const known: Record<string, { d: Deliverables; extras: string[] }> = {
  basico: {
    d: { posts: 12, reels: 2, stories: 8, networks: 2, reports: 1, meetings: 1 },
    extras: ["Diseño de posts y carruseles", "Calendario mensual", "Reporte mensual"],
  },
  estrategico: {
    d: { posts: 16, reels: 6, stories: 16, networks: 4, reports: 1, meetings: 2 },
    extras: ["Estrategia de contenido", "Gestión de comunidad", "Campañas en Meta Ads", "Reporte mensual"],
  },
  premium: {
    d: { posts: 24, reels: 10, stories: 30, networks: 6, reports: 2, meetings: 4 },
    extras: ["Todo lo del Estratégico", "Sesión de fotos o video mensual", "Campañas en varias redes", "Reunión semanal"],
  },
};

export type ContractPlan = { id: string; name: string; priceFrom: number; deliverables: Deliverables; extras: string[] };

/** Planes mensuales del sitio convertidos en planes de contrato (con entregables). */
export function contractPlans(sitePlans: Plan[]): ContractPlan[] {
  return sitePlans
    .filter((p) => p.billing === "monthly")
    .map((p) => ({
      id: p.id,
      name: p.name,
      priceFrom: p.priceFrom ?? 0,
      deliverables: { ...(known[p.id]?.d ?? zero) },
      extras: known[p.id]?.extras ?? p.items,
    }))
    .sort((a, b) => a.priceFrom - b.priceFrom);
}

export const DEFAULT_PLAN_ID = "estrategico";
