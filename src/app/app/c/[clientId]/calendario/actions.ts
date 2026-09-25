"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeam } from "@/lib/auth";
import { planMonth } from "@/lib/ai/assist";
import { runAI } from "@/lib/ai/claude";
import type { MonthPlan } from "@/lib/ai/schemas";
import { getClient } from "@/lib/data/clients";
import { createPost } from "@/lib/data/posts";
import { networkIds, type Network } from "@/lib/design/tokens";
import { fromRDInput } from "@/lib/format";
import { postTypes, type PostType } from "@/lib/social/platforms";
import { validatePost } from "@/lib/social/validate";

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

/** "Plan del mes": Claude propone de 8 a 12 ideas para el mes (equipo). No guarda nada todavía. */
export async function planMonthAction(clientId: string, mes: string, brief: string): Promise<{ ok: true; data: MonthPlan } | { ok: false; error: string }> {
  await requireTeam();
  const client = z.string().min(1).max(64).safeParse(clientId).success ? await getClient(clientId) : null;
  if (!client || !month.safeParse(mes).success) return { ok: false, error: "Solicitud no válida." };
  const note = z.string().trim().max(1000).safeParse(brief);
  if (!note.success) return { ok: false, error: "La indicación es muy larga." };
  return runAI("plan del mes", () => planMonth(client, mes, note.data));
}

const idea = z.object({
  fechaHora: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  tipo: z.enum(postTypes as unknown as [PostType, ...PostType[]]),
  redes: z.array(z.enum(networkIds as [Network, ...Network[]])).min(1),
  caption: z.string().max(5000),
});

/** Crea borradores con fecha a partir de las ideas elegidas (equipo). Quedan en el calendario para completarlos. */
export async function createDraftsAction(clientId: string, ideas: unknown): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const user = await requireTeam();
  const client = z.string().min(1).max(64).safeParse(clientId).success ? await getClient(clientId) : null;
  const parsed = z.array(idea).min(1).max(14).safeParse(ideas);
  if (!client || !parsed.success) return { ok: false, error: "Solicitud no válida." };
  let created = 0;
  for (const i of parsed.data) {
    const input = {
      type: i.tipo,
      caption: i.caption,
      firstComment: "",
      altText: "",
      media: [],
      platforms: i.redes.filter((r) => client.platforms.includes(r)),
      scheduledAt: fromRDInput(i.fechaHora),
    };
    if (validatePost(input, "draft")) continue;
    await createPost(client.id, input, "draft", user);
    created++;
  }
  revalidatePath(`/app/c/${client.id}`, "layout");
  return created ? { ok: true, created } : { ok: false, error: "Ninguna idea se pudo guardar como borrador." };
}
