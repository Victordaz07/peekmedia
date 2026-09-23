"use server";

import { getSiteContent } from "@/lib/data/content";
import { createLead } from "@/lib/data/leads";
import { quoteTotals } from "@/lib/content/helpers";
import { quoteSubmissionSchema } from "@/lib/leads/schema";

export type QuoteResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Guarda la cotización del sitio como prospecto. Los precios salen del catálogo, no del navegador. */
export async function submitQuote(input: unknown): Promise<QuoteResult> {
  const parsed = quoteSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Revisa los datos del formulario.", fieldErrors };
  }
  const { name, business, notes, serviceIds, website } = parsed.data;
  // Honeypot lleno: respondemos "ok" para no darle pistas al bot, pero no guardamos nada.
  if (website) return { ok: true };

  const { quoteServices } = await getSiteContent();
  const services = quoteServices
    .filter((s) => serviceIds.includes(s.id))
    .map(({ id, name, priceFrom, billing }) => ({ id, name, priceFrom, billing }));
  const totals = quoteTotals(services);

  try {
    await createLead({ name, business, notes, services, totalMonthly: totals.monthly, totalOnce: totals.once, source: "cotizador" });
    return { ok: true };
  } catch (e) {
    console.error("[submitQuote]", e);
    return { ok: false, error: "No pudimos guardar tu cotización, pero igual te llegó por WhatsApp." };
  }
}
