import "server-only";
import type { Client } from "@/lib/clients/schema";
import { money } from "@/lib/content/helpers";
import type { ContractPlan } from "@/lib/contracts/catalog";
import { listInbox, listMetrics } from "@/lib/data/insights";
import { listPosts } from "@/lib/data/posts";
import { networks } from "@/lib/design/tokens";
import { fromRDInput, monthLabel } from "@/lib/format";
import type { Lead } from "@/lib/leads/schema";
import { daysAgo, kpis, platformRows, reachOf } from "@/lib/social/analytics";
import { inboxKindLabel } from "@/lib/social/inbox";
import type { InboxItem } from "@/lib/social/schema";
import { ask } from "./claude";
import { accountContext, clip, line, nowRD, rate } from "./context";
import { leadReplySchema, monthPlanSchema, replySchema, reportSummarySchema, type LeadReply, type MonthPlan, type ReplySuggestion, type ReportSummary } from "./schemas";

/* ── Bandeja ── */

const REPLY_SYSTEM = `Eres community manager senior de Peek Media (agencia de redes en República Dominicana). Redactas la respuesta de la marca a un comentario, mensaje directo o reseña.
- Suena como la marca: usa su voz (mira sus publicaciones y cómo el equipo ha respondido antes).
- Corto y humano: 1–3 frases en comentarios; en DM puedes extenderte un poco. Usa el nombre de la persona si se ve natural.
- Responde lo que preguntan. Si no sabes el dato (precio, horario, disponibilidad), no lo inventes: pon [DATO] o invita a escribir por DM.
- Quejas y reseñas negativas: agradece, reconoce sin ponerte a la defensiva, no admitas culpa legal y lleva la conversación a privado con un canal concreto.
- Reseñas buenas: agradece de forma específica (menciona lo que elogiaron), sin sonar a plantilla.
- Nunca pidas ni publiques datos personales o de salud en público.`;

export async function suggestReply(client: Client, item: InboxItem): Promise<ReplySuggestion> {
  const [context, inbox, posts] = await Promise.all([accountContext(client), listInbox(client.id), listPosts(client.id)]);
  const previous = inbox.filter((i) => i.reply && i.id !== item.id).slice(0, 8);
  const post = item.postRef ? posts.find((p) => p.targets.some((t) => t.externalId === item.postRef)) : null;
  const text = [
    `Hoy es ${nowRD()} (hora de RD).`,
    previous.length ? `\n## Cómo ha respondido el equipo antes\n${previous.map((i) => `- ${inboxKindLabel[i.kind]} de ${i.author}: «${clip(i.text, 160)}» → «${clip(i.reply!, 240)}»`).join("\n")}` : "",
    `\n# Lo que hay que responder`,
    `${inboxKindLabel[item.kind]} en ${networks[item.platform].label} de ${item.author}${item.stars != null ? ` (${item.stars} de 5 estrellas)` : ""}:`,
    `"""\n${item.text}\n"""`,
    post ? `Es sobre esta publicación:\n${line(post)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return ask({ system: REPLY_SYSTEM, context, content: text, schema: replySchema, effort: "medium" });
}

/* ── Calendario: plan del mes ── */

const PLAN_SYSTEM = `Eres estratega de contenido senior de Peek Media (agencia de redes en República Dominicana). Armas el plan de contenido de un mes para un cliente.
- Parte de los datos: repite los formatos, temas y horas que mejor le funcionan a la cuenta y corrige lo que no funcionó.
- Usa la búsqueda web para fechas importantes de ese mes en RD (feriados, días nacionales e internacionales que le hablen al rubro, temporadas, eventos) y tendencias del rubro. Busca poco y bien (2–4 búsquedas).
- No repitas lo que ya está programado; completa los huecos del mes y reparte las ideas en los mejores días y horas medidos.
- Mezcla objetivos: alcance, comunidad, venta y confianza. Cada idea debe ser concreta (qué se ve, qué se dice), no genérica.
- Solo usa las redes que maneja el cliente y formatos que cada red acepta (historias solo en Instagram y Facebook).`;

export async function planMonth(client: Client, month: string, brief: string): Promise<MonthPlan> {
  const context = await accountContext(client);
  const text = [
    `Hoy es ${nowRD()} (hora de RD).`,
    `Arma el plan de ${monthLabel(month)} (${month}). Solo fechas desde hoy en adelante.`,
    `Redes del cliente: ${client.platforms.map((n) => `${networks[n].label} (${n})`).join(", ")}.`,
    brief ? `Lo que el equipo quiere para este mes: ${brief}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const plan = await ask({ system: PLAN_SYSTEM, context, content: text, schema: monthPlanSchema, webSearch: 4 });
  const now = Date.now();
  return {
    ...plan,
    ideas: plan.ideas
      .map((i) => ({ ...i, redes: i.redes.filter((r) => client.platforms.includes(r)) }))
      .filter((i) => {
        const at = fromRDInput(i.fechaHora);
        return i.redes.length > 0 && at && new Date(at).getTime() > now && i.fechaHora.startsWith(month);
      })
      .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
      .slice(0, 14),
  };
}

/* ── Reportes: resumen del mes ── */

const REPORT_SYSTEM = `Eres el estratega de Peek Media (agencia de redes en República Dominicana) y le explicas al cliente cómo le fue en redes los últimos 30 días.
- Lenguaje sencillo, para dueños de negocio: nada de "engagement", "KPIs" ni jerga; di "interacción", "personas alcanzadas", etc.
- Honesto: celebra lo que funcionó con números reales y di lo que no funcionó sin esconderlo, siempre con qué vamos a hacer.
- Usa solo los números que te doy. No inventes cifras ni compares con otras marcas.
- Recomendaciones concretas y alcanzables para el mes que viene.`;

export async function summarizeReport(client: Client): Promise<ReportSummary> {
  const [context, rows, posts] = await Promise.all([accountContext(client), listMetrics(client.id, daysAgo(60)), listPosts(client.id)]);
  const k = kpis(rows, posts);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const month = posts.filter((p) => p.status === "published" && (p.scheduledAt ?? p.createdAt) >= since && reachOf(p) > 0);
  const byType = Object.entries(
    month.reduce<Record<string, number[]>>((acc, p) => ((acc[p.type] ??= []).push(rate(p)), acc), {}),
  ).map(([t, r]) => `${t}: ${r.length} piezas, interacción promedio ${Math.round((r.reduce((a, b) => a + b, 0) / r.length) * 10) / 10}%`);
  const text = [
    `Hoy es ${nowRD()} (hora de RD).`,
    `\n# Totales de los últimos 30 días (y cambio contra los 30 anteriores)`,
    `Seguidores: ${k.followers} (${k.followersDelta >= 0 ? "+" : ""}${k.followersDelta}%) · Alcance: ${k.reach} (${k.reachDelta >= 0 ? "+" : ""}${k.reachDelta}%) · Interacciones: ${k.interactions} · Tasa de interacción: ${k.engagement}% (${k.engagementDelta >= 0 ? "+" : ""}${k.engagementDelta} puntos) · Publicado: ${k.published} · Programado: ${k.scheduled}`,
    `\n# Por red\n${platformRows(rows, posts).map((r) => `- ${networks[r.platform].label}: ${r.followers} seguidores (${r.growth >= 0 ? "+" : ""}${r.growth}%), alcance ${r.reach}, interacciones ${r.interactions}, ${r.posts} publicaciones`).join("\n")}`,
    byType.length ? `\n# Por formato\n${byType.join("\n")}` : "",
    `\nEscribe el resumen del mes para el cliente.`,
  ]
    .filter(Boolean)
    .join("\n");
  const r = await ask({ system: REPORT_SYSTEM, context, content: text, schema: reportSummarySchema, effort: "medium" });
  return { ...r, notaParaCliente: clip(r.notaParaCliente.trim(), 1900) };
}

/* ── Prospectos ── */

const LEAD_SYSTEM = `Eres el encargado comercial de Peek Media, agencia de redes sociales en República Dominicana. Un prospecto armó una cotización en el sitio y le vas a escribir por WhatsApp.
- Primer mensaje cálido, corto (máximo 5 líneas), personalizado con su negocio y lo que marcó. Termina con una pregunta fácil de responder o proponiendo una llamada corta.
- Recomienda el plan que más le conviene según lo que marcó y lo que contó; si pidió poco, no lo empujes al más caro.
- No prometas resultados (seguidores, ventas) ni precios distintos a los de la lista.`;

export async function replyToLead(lead: Lead, plans: ContractPlan[]): Promise<LeadReply> {
  const text = [
    `Hoy es ${nowRD()} (hora de RD).`,
    `\n# Planes de Peek Media`,
    ...plans.map((p) => `- id "${p.id}": ${p.name}, desde ${money(p.priceFrom)} al mes. ${Object.entries(p.deliverables).map(([k, v]) => `${k} ${v}`).join(", ")}. ${p.extras.join("; ")}`),
    `\n# Prospecto`,
    `Nombre: ${lead.name}`,
    `Negocio: ${lead.business || "no lo dijo"}`,
    `Marcó: ${lead.services.map((s) => `${s.name}${s.priceFrom ? ` (desde ${money(s.priceFrom)}${s.billing === "monthly" ? "/mes" : " único"})` : ""}`).join(", ") || "nada"}`,
    `Estimado: ${lead.totalMonthly ? `${money(lead.totalMonthly)}/mes` : ""} ${lead.totalOnce ? `+ ${money(lead.totalOnce)} único` : ""}`.trim(),
    `Lo que nos contó: ${lead.notes || "nada"}`,
    `Llegó: ${lead.createdAt.slice(0, 10)} · Estado: ${lead.status}`,
  ].join("\n");
  const r = await ask({ system: LEAD_SYSTEM, content: text, schema: leadReplySchema, effort: "medium" });
  return { ...r, planId: plans.some((p) => p.id === r.planId) ? r.planId : "" };
}
