import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { Client } from "@/lib/clients/schema";
import { networks, type Network } from "@/lib/design/tokens";
import { fromRDInput, toRDInput } from "@/lib/format";
import { postTypeLabel } from "@/lib/social/platforms";
import { ask } from "./claude";
import { accountContext, nowRD } from "./context";
import { suggestionSchema, type CopilotInput, type Suggestion } from "./copilot-schema";

const SYSTEM = `Eres el copiloto de contenido de Peek Media, una agencia de redes sociales en República Dominicana. Trabajas al lado del community manager (CM) mientras prepara una publicación para un cliente.

Tu trabajo: revisar el borrador o la idea del CM y devolver una propuesta lista para publicar, hecha para ESTA cuenta y no genérica. Piensa como un CM senior:
- Continuidad: lee lo que la cuenta ya publicó, qué le funcionó (tasa de interacción) y qué viene programado. Mantén la voz, los temas y los formatos que le funcionan; no repitas lo que ya salió o está por salir.
- Cliente: respeta lo que el cliente pidió en cambios anteriores y las notas del equipo; eso manda sobre tu gusto. Si el borrador tiene cambios pedidos por el cliente, aplicarlos es lo primero.
- Audiencia: usa edades, ciudades y las mejores horas medidas. Si no hay datos, dilo y no inventes números.
- Actualidad: usa la búsqueda web para revisar tendencias, fechas y conversaciones de esta semana en RD y en el rubro del cliente, y hashtags que se estén usando de verdad. Busca poco y bien (2–4 búsquedas). Si algo no aplica a la marca, no lo fuerces.
- Reglas de cada red: límites de caracteres, qué formatos acepta y dónde van los hashtags.
- Gancho en la primera línea, un solo mensaje claro y una llamada a la acción concreta.`;

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

function draftText(input: CopilotInput, imageCount: number, feedback: string | null) {
  const videos = input.media.filter((m) => m.mime.startsWith("video/")).length;
  return [
    `Hoy es ${nowRD()} (hora de RD).`,
    `\n# Borrador del CM`,
    `Redes: ${input.platforms.map((n) => networks[n].label).join(", ")}`,
    `Formato: ${postTypeLabel[input.type]}`,
    `Archivos: ${input.media.length ? `${input.media.length} (${videos} video${videos === 1 ? "" : "s"})${imageCount ? `; te adjunto ${imageCount} imagen${imageCount === 1 ? "" : "es"}` : ""}` : "ninguno todavía"}`,
    `Fecha elegida: ${input.scheduledAt ? toRDInput(input.scheduledAt).replace("T", " ") : "sin fecha"}`,
    `Texto:\n"""\n${input.caption.trim() || "(vacío)"}\n"""`,
    input.firstComment.trim() ? `Primer comentario:\n"""\n${input.firstComment.trim()}\n"""` : "",
    input.altText.trim() ? `Texto alternativo: ${input.altText.trim()}` : "",
    feedback ? `\nEl cliente pidió estos cambios (aplícalos primero): «${feedback}»` : "",
    input.brief ? `\nLo que el CM quiere lograr: ${input.brief}` : "",
    `\nRevisa el borrador contra la cuenta y lo que está pasando ahora, y entrega tu propuesta.`,
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

/** Revisa el borrador con Claude usando el contexto de la cuenta y la búsqueda web. `feedback`: cambios que pidió el cliente. */
export async function reviewDraft(client: Client, input: CopilotInput, feedback: string | null): Promise<Suggestion> {
  const [context, images] = await Promise.all([accountContext(client), draftImages(input.media)]);
  const s = await ask({ system: SYSTEM, context, content: [...images, { type: "text", text: draftText(input, images.length, feedback) }], schema: suggestionSchema, webSearch: 4 });
  return tidy(s, input);
}
