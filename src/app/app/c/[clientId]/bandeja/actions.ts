"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeam } from "@/lib/auth";
import { runAI } from "@/lib/ai/claude";
import { suggestReply } from "@/lib/ai/assist";
import type { ReplySuggestion } from "@/lib/ai/schemas";
import { getClient } from "@/lib/data/clients";
import { getInboxItem, markReplied } from "@/lib/data/insights";
import { getAccountWithSecrets, getProfileKey } from "@/lib/data/social";
import { replyAyrshare } from "@/lib/integrations/ayrshare";
import { replyMeta } from "@/lib/integrations/meta";
import { dmWindowOpen } from "@/lib/social/inbox";

type Result = { ok: true } | { ok: false; error: string };

/** Responde un comentario, mensaje o reseña desde la bandeja (equipo). */
export async function replyAction(itemId: string, text: string): Promise<Result> {
  const user = await requireTeam();
  const body = z.string().trim().min(1, "Escribe la respuesta").max(2000).safeParse(text);
  if (!body.success) return { ok: false, error: body.error.issues[0].message };
  const item = z.string().min(1).max(64).safeParse(itemId).success ? await getInboxItem(itemId) : null;
  if (!item) return { ok: false, error: "Ese mensaje no existe." };
  if (item.kind === "dm" && !dmWindowOpen(item.receivedAt)) {
    return { ok: false, error: "Pasaron más de 24 h: Meta no permite responder por la API. Responde desde la app." };
  }
  const account = await getAccountWithSecrets(item.clientId, item.platform);
  try {
    if (!account) throw new Error("La cuenta ya no está conectada.");
    if (account.mode === "meta") await replyMeta(account, item, body.data);
    else if (account.mode === "ayrshare") {
      const key = await getProfileKey(item.clientId, "ayrshare");
      if (!key) throw new Error("Falta el perfil de Ayrshare del cliente.");
      await replyAyrshare(key, item.platform, item, body.data);
    } else if (account.mode === "manual") throw new Error("Esta red está conectada como socio: responde desde su app.");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo enviar la respuesta." };
  }
  await markReplied(item.id, body.data, user.name);
  revalidatePath(`/app/c/${item.clientId}/bandeja`);
  return { ok: true };
}

/** "Sugerir con Claude": borrador de respuesta con la voz de la marca (equipo). No envía nada. */
export async function suggestReplyAction(itemId: string): Promise<{ ok: true; data: ReplySuggestion } | { ok: false; error: string }> {
  await requireTeam();
  const item = z.string().min(1).max(64).safeParse(itemId).success ? await getInboxItem(itemId) : null;
  const client = item ? await getClient(item.clientId) : null;
  if (!item || !client) return { ok: false, error: "Ese mensaje no existe." };
  return runAI("bandeja", () => suggestReply(client, item));
}
