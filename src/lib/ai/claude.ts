import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const MODEL = "claude-opus-5";
const TOOL = "entregar";

/** Las funciones de Claude necesitan la clave de la API (solo en el servidor). */
export function aiReady() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Error con un mensaje listo para mostrarle al equipo. */
export class AIError extends Error {}

/** Cómo escribe Peek Media: se comparte entre todas las funciones de Claude. */
export const VOICE = `Idioma y tono: español dominicano natural, como hablaría la marca (tutea salvo que la cuenta use usted). Sin clichés de IA, sin exceso de emojis y sin promesas que el cliente no pueda cumplir (precios, resultados de salud, rendimientos). No inventes datos del negocio (horarios, precios, direcciones, teléfonos): si hacen falta, déjalos como [DATO] para que el equipo los complete.`;

function toolSchema(schema: z.ZodType) {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete json.$schema;
  return json as Anthropic.Beta.BetaTool.InputSchema;
}

/**
 * Una pregunta a Claude con respuesta estructurada: Claude investiga (búsqueda web opcional) y entrega
 * el resultado con una herramienta estricta que valida `schema`. El `context` va en el system y se cachea.
 */
export async function ask<S extends z.ZodType>(opts: {
  system: string;
  context?: string;
  content: string | Anthropic.Beta.BetaContentBlockParam[];
  schema: S;
  /** Máximo de búsquedas web (0 = sin búsqueda). */
  webSearch?: number;
  effort?: "low" | "medium" | "high";
}): Promise<z.infer<S>> {
  if (!aiReady()) throw new AIError("Falta la clave de Claude (ANTHROPIC_API_KEY) en Vercel.");
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim(), timeout: 240_000, maxRetries: 1 });
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: `${opts.system}\n\n${VOICE}\n\nCuando tengas la respuesta, llama a la herramienta ${TOOL} una sola vez con todo. No la escribas como texto.` },
  ];
  if (opts.context) system.push({ type: "text", text: opts.context, cache_control: { type: "ephemeral" } });
  // Funciones opcionales. Si la cuenta de Claude no tiene alguna activada (la API responde 400), se reintenta sin ella.
  const on = { fallback: true, eager: true, strict: true, web: Boolean(opts.webSearch) };
  const request = (): Anthropic.Beta.MessageCreateParamsStreaming => {
    const tools: Anthropic.Beta.BetaToolUnion[] = [
      {
        name: TOOL,
        description: "Entrega la respuesta final. Llámala una sola vez, al final.",
        ...(on.strict ? { strict: true } : {}),
        ...(on.eager ? { eager_input_streaming: true } : {}),
        input_schema: toolSchema(opts.schema),
      },
    ];
    if (on.web) {
      tools.unshift({
        type: "web_search_20260209",
        name: "web_search",
        max_uses: opts.webSearch,
        user_location: { type: "approximate", country: "DO", city: "Santo Domingo", timezone: "America/Santo_Domingo" },
      });
    }
    return {
      model: MODEL,
      max_tokens: 16000,
      ...(on.fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      thinking: { type: "adaptive" },
      ...(opts.effort ? { output_config: { effort: opts.effort } } : {}),
      system,
      tools,
      tool_choice: { type: "auto" },
      messages,
      stream: true,
    };
  };
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: opts.content }];

  for (let turn = 0; turn < 8; turn++) {
    let msg: Anthropic.Beta.BetaMessage;
    try {
      msg = await anthropic.beta.messages.stream(request()).finalMessage();
    } catch (e) {
      if (e instanceof Anthropic.BadRequestError) {
        console.error("claude 400", e.message);
        const text = e.message.toLowerCase();
        // Primero lo que el mensaje de error nombra; si no nombra nada, se apaga lo más probable.
        const culprit =
          (on.fallback && /fallback|beta/.test(text) && "fallback") ||
          (on.web && /web_search|web search/.test(text) && "web") ||
          (on.eager && /eager/.test(text) && "eager") ||
          (on.strict && /strict|schema/.test(text) && "strict") ||
          (["fallback", "eager", "web", "strict"] as const).find((k) => on[k]);
        if (culprit && turn < 7) {
          on[culprit] = false;
          continue;
        }
        throw new AIError(`Claude rechazó la solicitud: ${e.message.slice(0, 200)}`);
      }
      if (e instanceof Anthropic.AuthenticationError) throw new AIError("La clave de Claude no es válida. Revísala en Vercel.");
      if (e instanceof Anthropic.PermissionDeniedError) throw new AIError("La clave de Claude no tiene permiso para esto. Revisa tu cuenta en console.anthropic.com.");
      if (e instanceof Anthropic.RateLimitError) throw new AIError("Claude está muy solicitado ahora mismo (o se acabó el saldo). Intenta en un minuto.");
      if (e instanceof Anthropic.APIConnectionTimeoutError) throw new AIError("Claude tardó demasiado. Intenta de nuevo.");
      if (e instanceof Anthropic.APIError) {
        console.error("claude", e.status, e.message);
        throw new AIError(`Claude no pudo responder (${e.status ?? "sin conexión"}). Intenta de nuevo.`);
      }
      throw e;
    }

    if (msg.stop_reason === "refusal") throw new AIError("Claude no quiso responder a esto. Ajusta el texto e intenta de nuevo.");
    if (msg.stop_reason === "max_tokens") throw new AIError("La respuesta salió incompleta. Intenta de nuevo.");
    const call = msg.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === TOOL);
    if (call) {
      const parsed = opts.schema.safeParse(call.input);
      if (parsed.success) return parsed.data;
      console.error("claude formato", parsed.error.issues.slice(0, 3));
      throw new AIError("La respuesta llegó con un formato raro. Intenta de nuevo.");
    }
    // Búsqueda web en pausa: se reenvía tal cual y el servidor sigue donde iba.
    messages.push({ role: "assistant", content: msg.content });
    if (msg.stop_reason !== "pause_turn") messages.push({ role: "user", content: `Entrega ya la respuesta con ${TOOL}.` });
  }
  throw new AIError("Claude no terminó la respuesta. Intenta de nuevo.");
}

/** Para las acciones: convierte cualquier error en un mensaje para la pantalla. */
export async function runAI<T>(label: string, fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof AIError) return { ok: false, error: e.message };
    console.error(label, e);
    return { ok: false, error: "Claude no pudo responder. Intenta de nuevo." };
  }
}
