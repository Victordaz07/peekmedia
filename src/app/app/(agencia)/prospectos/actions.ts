"use server";

import { z } from "zod";
import { requireTeam } from "@/lib/auth";
import { setLeadStatus } from "@/lib/data/leads";
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
