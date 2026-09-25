"use server";

import { requireTeam } from "@/lib/auth";
import { runAI } from "@/lib/ai/claude";
import { reviewDraft } from "@/lib/ai/copilot";
import { copilotInputSchema, type Suggestion } from "@/lib/ai/copilot-schema";
import { getClient } from "@/lib/data/clients";
import { getPost } from "@/lib/data/posts";

type Result = { ok: true; suggestion: Suggestion } | { ok: false; error: string };

/**
 * "Revisar con Claude" en Crear publicación (solo equipo). Si se está editando una publicación con cambios
 * pedidos por el cliente, Claude los aplica primero. La clave de Claude nunca sale del servidor.
 */
export async function reviewDraftAction(clientId: string, postId: string | null, input: unknown): Promise<Result> {
  await requireTeam();
  const client = typeof clientId === "string" && clientId.length <= 64 ? await getClient(clientId) : null;
  if (!client) return { ok: false, error: "Ese cliente no existe." };
  const parsed = copilotInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const post = typeof postId === "string" && postId.length <= 64 ? await getPost(postId) : null;
  const feedback = post && post.clientId === client.id && post.status === "changes" ? post.feedback : null;
  if (!parsed.data.caption.trim() && !parsed.data.brief && !feedback) return { ok: false, error: "Escribe tu idea o el texto para que Claude lo revise." };
  if (parsed.data.platforms.some((p) => !client.platforms.includes(p))) return { ok: false, error: "Este cliente no maneja una de esas redes." };
  const res = await runAI("copiloto", () => reviewDraft(client, parsed.data, feedback));
  return res.ok ? { ok: true, suggestion: res.data } : res;
}
