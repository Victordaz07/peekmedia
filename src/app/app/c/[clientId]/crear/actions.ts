"use server";

import { requireTeam } from "@/lib/auth";
import { CopilotError, reviewDraft } from "@/lib/ai/copilot";
import { copilotInputSchema, type Suggestion } from "@/lib/ai/copilot-schema";
import { getClient } from "@/lib/data/clients";

type Result = { ok: true; suggestion: Suggestion } | { ok: false; error: string };

/** "Revisar con Claude" en Crear publicación (solo equipo). La clave de Claude nunca sale del servidor. */
export async function reviewDraftAction(clientId: string, input: unknown): Promise<Result> {
  await requireTeam();
  const client = typeof clientId === "string" && clientId.length <= 64 ? await getClient(clientId) : null;
  if (!client) return { ok: false, error: "Ese cliente no existe." };
  const parsed = copilotInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!parsed.data.caption.trim() && !parsed.data.brief) return { ok: false, error: "Escribe tu idea o el texto para que Claude lo revise." };
  if (parsed.data.platforms.some((p) => !client.platforms.includes(p))) return { ok: false, error: "Este cliente no maneja una de esas redes." };
  try {
    return { ok: true, suggestion: await reviewDraft(client, parsed.data) };
  } catch (e) {
    if (e instanceof CopilotError) return { ok: false, error: e.message };
    console.error("copiloto", e);
    return { ok: false, error: "No se pudo revisar con Claude. Intenta de nuevo." };
  }
}
