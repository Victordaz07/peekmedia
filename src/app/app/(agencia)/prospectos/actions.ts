"use server";

import { z } from "zod";
import { requireTeam } from "@/lib/auth";
import { replyToLead } from "@/lib/ai/assist";
import { runAI } from "@/lib/ai/claude";
import type { LeadReply } from "@/lib/ai/schemas";
import { contractPlans } from "@/lib/contracts/catalog";
import { getSiteContent } from "@/lib/data/content";
import { listLeads, setLeadStatus } from "@/lib/data/leads";
import { leadStatuses } from "@/lib/leads/schema";

const input = z.object({ id: z.string().min(1).max(64), status: z.enum(leadStatuses) });

export async function updateLeadStatus(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  await requireTeam();
  const parsed = input.safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Estado no válido." };
  try {
    await setLeadStatus(parsed.data.id, parsed.data.status);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo actualizar." };
  }
}

/** "Sugerir respuesta con Claude": primer WhatsApp, plan recomendado y preguntas para la llamada (equipo). */
export async function leadReplyAction(id: string): Promise<{ ok: true; data: LeadReply & { planName: string } } | { ok: false; error: string }> {
  await requireTeam();
  const lead = z.string().min(1).max(64).safeParse(id).success ? (await listLeads()).find((l) => l.id === id) : null;
  if (!lead) return { ok: false, error: "Ese prospecto no existe." };
  const plans = contractPlans((await getSiteContent()).plans);
  return runAI("prospecto", async () => {
    const r = await replyToLead(lead, plans);
    return { ...r, planName: plans.find((p) => p.id === r.planId)?.name ?? "" };
  });
}
