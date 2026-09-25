"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { quoteTotals } from "@/lib/content/helpers";
import { hashVisitor } from "@/lib/crypto";
import { getSiteContent } from "@/lib/data/content";
import { createLead } from "@/lib/data/leads";
import { LEAD_EMAILS_PER_HOUR, leadsInLastHour, takeQuoteAttempt } from "@/lib/data/quote-attempts";
import { quoteSubmissionSchema } from "@/lib/leads/schema";
import { notifyNewLead } from "@/lib/notify";

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

  if (!(await withinQuoteLimit())) {
    return { ok: false, error: "Ya recibimos varias cotizaciones tuyas. Te respondemos por WhatsApp en un rato." };
  }

  const { quoteServices } = await getSiteContent();
  const services = quoteServices
    .filter((s) => serviceIds.includes(s.id))
    .map(({ id, name, priceFrom, billing }) => ({ id, name, priceFrom, billing }));
  const totals = quoteTotals(services);

  try {
    const lead = { name, business, notes, services, totalMonthly: totals.monthly, totalOnce: totals.once, source: "cotizador" };
    await createLead(lead);
    after(async () => {
      // Tope de correos por hora: el prospecto se guarda igual y se ve en el panel.
      const recent = await leadsInLastHour().catch(() => 0);
      if (recent > LEAD_EMAILS_PER_HOUR) return console.warn("[notifyNewLead] tope de correos por hora alcanzado");
      await notifyNewLead(lead).catch((e) => console.error("[notifyNewLead]", e));
    });
    return { ok: true };
  } catch (e) {
    console.error("[submitQuote]", e);
    return { ok: false, error: "No pudimos guardar tu cotización, pero igual te llegó por WhatsApp." };
  }
}

/** Límite por visitante (hash de su IP). Si el límite falla por algo nuestro, dejamos pasar: perder un prospecto es peor. */
async function withinQuoteLimit(): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip")?.trim();
  if (!ip) return true;
  try {
    return await takeQuoteAttempt(hashVisitor(ip));
  } catch (e) {
    console.error("[quoteLimit]", e);
    return true;
  }
}
