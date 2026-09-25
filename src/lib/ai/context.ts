import "server-only";
import { listNotes } from "@/lib/data/clients";
import { listAudience, listMetrics } from "@/lib/data/insights";
import { listPosts } from "@/lib/data/posts";
import { listAccounts } from "@/lib/data/social";
import type { Client } from "@/lib/clients/schema";
import { networks } from "@/lib/design/tokens";
import { toRDInput } from "@/lib/format";
import { bestTime, daysAgo, engagementOf, heatmap, HEAT_DAYS, HEAT_HOURS, platformRows, reachOf } from "@/lib/social/analytics";
import { composerNote, needsMedia, postTypeLabel } from "@/lib/social/platforms";
import type { Post } from "@/lib/social/schema";

/** Hora actual de RD en texto, para que Claude sepa qué día es. */
export const nowRD = () => toRDInput(new Date().toISOString()).replace("T", " ");

export const rate = (p: Post) => {
  const reach = reachOf(p);
  return reach ? Math.round((engagementOf(p) / reach) * 1000) / 10 : 0;
};
export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
export const line = (p: Post) =>
  `- ${p.scheduledAt ? toRDInput(p.scheduledAt).replace("T", " ") : "sin fecha"} · ${postTypeLabel[p.type]} · ${p.platforms.map((n) => networks[n].label).join("/")}` +
  (p.status === "published" ? ` · alcance ${reachOf(p)} · interacción ${rate(p)}%` : "") +
  `\n  «${clip(p.caption.replace(/\s+/g, " ").trim(), 400)}»` +
  (p.firstComment ? `\n  Primer comentario: «${clip(p.firstComment.replace(/\s+/g, " "), 200)}»` : "");

/** Todo lo que sabemos de la cuenta, en texto. Va en el system (se puede cachear por cliente). */
export async function accountContext(client: Client) {
  const [posts, accounts, audience, rows, notes] = await Promise.all([
    listPosts(client.id),
    listAccounts(client.id),
    listAudience(client.id),
    listMetrics(client.id, daysAgo(60)),
    listNotes(client.id),
  ]);
  const published = posts.filter((p) => p.status === "published").sort((a, b) => (b.scheduledAt ?? "").localeCompare(a.scheduledAt ?? ""));
  const best = [...published].filter((p) => reachOf(p) > 0).sort((a, b) => rate(b) - rate(a));
  const now = new Date().toISOString();
  const upcoming = posts
    .filter((p) => ["scheduled", "pending", "approved", "changes"].includes(p.status) && (p.scheduledAt ?? "") >= now)
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
  const feedback = posts.filter((p) => p.feedback).slice(0, 6);
  const heat = heatmap(posts);
  const slots = heat.grid
    .flatMap((row, d) => row.map((v, h) => ({ v, label: `${HEAT_DAYS[d]} ${HEAT_HOURS[h]}` })))
    .filter((s) => s.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 5);

  const parts = [
    `# Cuenta: ${client.name}`,
    `Rubro: ${client.industry || "sin definir"} · Usuario: @${client.handle.replace(/^@/, "")} · Redes que manejamos: ${client.platforms.map((n) => networks[n].label).join(", ")}`,
    accounts.length ? `Cuentas conectadas: ${accounts.map((a) => `${networks[a.platform].label} (${a.accountName || a.status})`).join(", ")}` : "",
    `\n## Números (últimos 30 días)\n${
      platformRows(rows, posts)
        .map((r) => `- ${networks[r.platform].label}: ${r.followers} seguidores (${r.growth >= 0 ? "+" : ""}${r.growth}%), alcance ${r.reach}, interacciones ${r.interactions}, ${r.posts} publicaciones`)
        .join("\n") || "Sin métricas todavía."
    }`,
    `\n## Audiencia\n${
      audience.map((a) => `- ${networks[a.platform].label}: edades ${a.ages.map((x) => `${x.label} ${x.value}%`).join(", ")}; ciudades ${a.cities.map((x) => `${x.label} ${x.value}%`).join(", ")}`).join("\n") ||
      "Sin datos de audiencia."
    }`,
    `\n## Mejores horas medidas (hora de RD)\n${heat.samples >= 5 ? `${slots.map((s) => s.label).join(", ")}. Mejor momento: ${bestTime(heat.grid)}` : "Todavía no hay suficientes publicaciones con métricas."}`,
    best.length ? `\n## Lo que mejor le funcionó (por tasa de interacción)\n${best.slice(0, 5).map(line).join("\n")}` : "",
    best.length > 5 ? `\n## Lo que menos funcionó\n${best.slice(-3).map(line).join("\n")}` : "",
    published.length ? `\n## Últimas publicaciones (voz y temas de la cuenta)\n${published.slice(0, 12).map(line).join("\n")}` : "\nLa cuenta todavía no tiene publicaciones: propón una voz coherente con el rubro.",
    upcoming.length ? `\n## Ya programado o en aprobación (no lo repitas)\n${upcoming.slice(0, 10).map(line).join("\n")}` : "",
    feedback.length ? `\n## Lo que el cliente ha pedido cambiar antes\n${feedback.map((p) => `- «${clip(p.feedback!, 300)}» (sobre: «${clip(p.caption, 120)}»)`).join("\n")}` : "",
    notes.length ? `\n## Notas internas del equipo sobre el cliente\n${notes.slice(0, 8).map((n) => `- ${clip(n.text, 300)}`).join("\n")}` : "",
    `\n## Reglas de las redes\n${client.platforms
      .map((n) => `- ${networks[n].label}: máximo ${networks[n].charLimit} caracteres${needsMedia.includes(n) ? "; necesita imagen o video" : ""}${composerNote[n] ? `; ${composerNote[n]}` : ""}`)
      .join("\n")}\n- Historias: solo Instagram y Facebook. Carrusel: 2 a 10 archivos. En Instagram, los hashtags suelen ir en el primer comentario.`,
  ];
  return parts.filter(Boolean).join("\n");
}
