"use server";

import { z } from "zod";
import { requireTeam } from "@/lib/auth";
import { summarizeReport } from "@/lib/ai/assist";
import { runAI } from "@/lib/ai/claude";
import type { ReportSummary } from "@/lib/ai/schemas";
import { getClient } from "@/lib/data/clients";

/** "Resumen del mes con Claude" (equipo). Se publica al cliente solo si el equipo lo decide, como nota en Novedades. */
export async function summarizeReportAction(clientId: string): Promise<{ ok: true; data: ReportSummary } | { ok: false; error: string }> {
  await requireTeam();
  const client = z.string().min(1).max(64).safeParse(clientId).success ? await getClient(clientId) : null;
  if (!client) return { ok: false, error: "Ese cliente no existe." };
  return runAI("resumen del mes", () => summarizeReport(client));
}
