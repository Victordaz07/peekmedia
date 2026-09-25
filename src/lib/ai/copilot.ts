import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { listNotes } from "@/lib/data/clients";
import { listAudience, listMetrics } from "@/lib/data/insights";
import { listPosts } from "@/lib/data/posts";
import { listAccounts } from "@/lib/data/social";
import type { Client } from "@/lib/clients/schema";
import { networks, type Network } from "@/lib/design/tokens";
import { fromRDInput, toRDInput } from "@/lib/format";
import { bestTime, daysAgo, engagementOf, heatmap, HEAT_DAYS, HEAT_HOURS, platformRows, reachOf } from "@/lib/social/analytics";
import { composerNote, needsMedia, postTypeLabel } from "@/lib/social/platforms";
import type { Post } from "@/lib/social/schema";
import { suggestionSchema, type CopilotInput, type Suggestion } from "./copilot-schema";

const MODEL = "claude-opus-5";
const TOOL = "entregar_propuesta";

/** El copiloto necesita la clave de la API de Claude (solo en el servidor). */
export function copilotReady() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

const SYSTEM = `Eres el copiloto de contenido de Peek Media, una agencia de redes sociales en República Dominicana. Trabajas al lado del community manager (CM) mientras prepara una publicación para un cliente.

Tu trabajo: revisar el borrador o la idea del CM y devolver una propuesta lista para publicar, hecha para ESTA cuenta y no genérica. Piensa como un CM senior:
- Continuidad: lee lo que la cuenta ya publicó, qué le funcionó (tasa de interacción) y qué viene programado. Mantén la voz, los temas y los formatos que le funcionan; no repitas lo que ya salió o está por salir.
- Cliente: respeta lo que el cliente pidió en cambios anteriores y las notas del equipo; eso manda sobre tu gusto.
- Audiencia: usa edades, ciudades y las mejores horas medidas. Si no hay datos, dilo y no inventes números.
- Actualidad: usa la búsqueda web para revisar tendencias, fechas y conversaciones de esta semana en RD y en el rubro del cliente, y hashtags que se estén usando de verdad. Busca poco y bien (2–4 búsquedas). Si algo no aplica a la marca, no lo fuerces.
- Reglas de cada red: límites de caracteres, qué formatos acepta y dónde van los hashtags.
- Gancho en la primera línea, un solo mensaje claro y una llamada a la acción concreta.

Idioma y tono: español dominicano natural, como hablaría la marca (tutea salvo que la cuenta use usted). Sin clichés de IA, sin exceso de emojis y sin promesas que el cliente no pueda cumplir (precios, resultados de salud, rendimientos). No inventes datos del negocio (horarios, precios, direcciones): si hacen falta, déjalos como [DATO] para que el CM los complete.

Cuando termines de investigar, llama a la herramienta ${TOOL} una sola vez con la propuesta completa. No escribas la propuesta como texto.`;

const rate = (p: Post) => {
  const reach = reachOf(p);
  return reach ? Math.round((engagementOf(p) / reach) * 1000) / 10 : 0;
};
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
const line = (p: Post) =>
  `- ${p.scheduledAt ? toRDInput(p.scheduledAt).replace("T", " ") : "sin fecha"} · ${postTypeLabel[p.type]} · ${p.platforms.map((n) => networks[n].label).join("/")}` +
  (p.status === "published" ? ` · alcance ${reachOf(p)} · interacción ${rate(p)}%` : "") +
  `\n  «${clip(p.caption.replace(/\s+/g, " ").trim(), 400)}»` +
  (p.firstComment ? `\n  Primer comentario: «${clip(p.firstComment.replace(/\s+/g, " "), 200)}»` : "");

/** Todo lo que sabemos de la cuenta, en texto. Va en el system (se puede cachear por cliente). */
async function accountContext(client: Client) {
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

/** Imágenes del borrador para que Claude las vea. Solo del almacenamiento propio (nada de URLs arbitrarias). */
async function draftImages(media: CopilotInput["media"]): Promise<Anthropic.Beta.BetaImageBlockParam[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!base) return [];
  const allowed = `${base}/storage/v1/object/public/`;
  const types = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  const out: Anthropic.Beta.BetaImageBlockParam[] = [];
  for (const m of media) {
    const mime = types.find((t) => t === m.mime);
    if (!mime || !m.url.startsWith(allowed) || out.length >= 3) continue;
    try {
      const res = await fetch(m.url, { signal: AbortSignal.timeout(10_000) });
      const body = res.ok ? await res.arrayBuffer() : null;
      if (body && body.byteLength <= 3_500_000) out.push({ type: "image", source: { type: "base64", media_type: mime, data: Buffer.from(body).toString("base64") } });
    } catch {
      // Sin la imagen igual se puede revisar el texto.
    }
  }
  return out;
}

function draftText(input: CopilotInput, imageCount: number) {
  const videos = input.media.filter((m) => m.mime.startsWith("video/")).length;
  return [
    `Hoy es ${toRDInput(new Date().toISOString()).replace("T", " ")} (hora de RD).`,
    `\n# Borrador del CM`,
    `Redes: ${input.platforms.map((n) => networks[n].label).join(", ")}`,
    `Formato: ${postTypeLabel[input.type]}`,
    `Archivos: ${input.media.length ? `${input.media.length} (${videos} video${videos === 1 ? "" : "s"})${imageCount ? `; te adjunto ${imageCount} imagen${imageCount === 1 ? "" : "es"}` : ""}` : "ninguno todavía"}`,
    `Fecha elegida: ${input.scheduledAt ? toRDInput(input.scheduledAt).replace("T", " ") : "sin fecha"}`,
    `Texto:\n"""\n${input.caption.trim() || "(vacío)"}\n"""`,
    input.firstComment.trim() ? `Primer comentario:\n"""\n${input.firstComment.trim()}\n"""` : "",
    input.altText.trim() ? `Texto alternativo: ${input.altText.trim()}` : "",
    input.brief ? `\nLo que el CM quiere lograr: ${input.brief}` : "",
    `\nRevisa el borrador contra la cuenta y lo que está pasando ahora, y entrega tu propuesta con ${TOOL}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Limpia lo que no se puede usar tal cual en el editor. */
function tidy(s: Suggestion, input: CopilotInput): Suggestion {
  const tags = [...new Set(s.hashtags.map((h) => `#${h.trim().replace(/^#+/, "").replace(/\s+/g, "")}`).filter((h) => h.length > 1))].slice(0, 20);
  const at = fromRDInput(s.horario.fechaHora);
  return {
    ...s,
    puntuacion: Math.min(10, Math.max(1, Math.round(s.puntuacion))),
    hashtags: tags,
    horario: at && new Date(at).getTime() > Date.now() ? s.horario : { ...s.horario, fechaHora: "" },
    porRed: s.porRed.filter((r) => input.platforms.includes(r.red as Network)),
    tendencias: s.tendencias.slice(0, 4).map((t) => ({ ...t, fuente: /^https?:\/\//.test(t.fuente) ? t.fuente : "" })),
  };
}

const inputSchema = (() => {
  const schema = z.toJSONSchema(suggestionSchema, { target: "draft-7" }) as Record<string, unknown>;
  delete schema.$schema;
  return schema as Anthropic.Beta.BetaTool.InputSchema;
})();

export class CopilotError extends Error {}

/** Revisa el borrador con Claude usando el contexto de la cuenta y la búsqueda web. */
export async function reviewDraft(client: Client, input: CopilotInput): Promise<Suggestion> {
  if (!copilotReady()) throw new CopilotError("Falta la clave de Claude (ANTHROPIC_API_KEY) en Vercel.");
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim(), timeout: 240_000, maxRetries: 1 });
  const [context, images] = await Promise.all([accountContext(client), draftImages(input.media)]);
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: [...images, { type: "text", text: draftText(input, images.length) }] }];

  for (let turn = 0; turn < 4; turn++) {
    let msg: Anthropic.Beta.BetaMessage;
    try {
      msg = await anthropic.beta.messages
        .stream({
          model: MODEL,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          thinking: { type: "adaptive" },
          system: [
            { type: "text", text: SYSTEM },
            { type: "text", text: context, cache_control: { type: "ephemeral" } },
          ],
          tools: [
            {
              type: "web_search_20260209",
              name: "web_search",
              max_uses: 4,
              user_location: { type: "approximate", country: "DO", city: "Santo Domingo", timezone: "America/Santo_Domingo" },
            },
            {
              name: TOOL,
              description: "Entrega la propuesta final para el editor. Llámala una sola vez, al final.",
              strict: true,
              eager_input_streaming: true,
              input_schema: inputSchema,
            },
          ],
          tool_choice: { type: "auto" },
          messages,
        })
        .finalMessage();
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) throw new CopilotError("La clave de Claude no es válida. Revísala en Vercel.");
      if (e instanceof Anthropic.RateLimitError) throw new CopilotError("Claude está muy solicitado ahora mismo. Intenta en un minuto.");
      if (e instanceof Anthropic.APIConnectionTimeoutError) throw new CopilotError("Claude tardó demasiado. Intenta de nuevo.");
      if (e instanceof Anthropic.APIError) throw new CopilotError(`Claude no pudo responder (${e.status ?? "sin conexión"}). Intenta de nuevo.`);
      throw e;
    }

    if (msg.stop_reason === "refusal") throw new CopilotError("Claude no quiso revisar este contenido. Ajusta el texto e intenta de nuevo.");
    if (msg.stop_reason === "max_tokens") throw new CopilotError("La propuesta salió incompleta. Intenta de nuevo.");
    const call = msg.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === TOOL);
    if (call) {
      const parsed = suggestionSchema.safeParse(call.input);
      if (parsed.success) return tidy(parsed.data, input);
      throw new CopilotError("La propuesta llegó con un formato raro. Intenta de nuevo.");
    }
    // Búsqueda web en pausa: se reenvía tal cual y el servidor sigue donde iba.
    messages.push({ role: "assistant", content: msg.content });
    if (msg.stop_reason !== "pause_turn") messages.push({ role: "user", content: `Entrega ya la propuesta con ${TOOL}.` });
  }
  throw new CopilotError("Claude no terminó la propuesta. Intenta de nuevo.");
}
