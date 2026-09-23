import { z } from "zod";

export const leadStatuses = ["new", "contacted", "proposal", "won", "lost"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

/** Lo que manda el cotizador del sitio. Los precios se recalculan en el servidor: nunca se confía en el cliente. */
export const quoteSubmissionSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(100),
  business: z.string().trim().max(120),
  notes: z.string().trim().max(1500),
  serviceIds: z.array(z.string().max(40)).max(24),
  /** Honeypot: las personas no lo ven; si llega lleno, es un bot. */
  website: z.string().optional(),
});

export type QuoteSubmission = z.infer<typeof quoteSubmissionSchema>;

export type LeadService = { id: string; name: string; priceFrom: number | null; billing: "monthly" | "once" };

export type Lead = {
  id: string;
  name: string;
  business: string;
  notes: string;
  services: LeadService[];
  totalMonthly: number;
  totalOnce: number;
  source: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
};

export type NewLead = Omit<Lead, "id" | "status" | "createdAt" | "updatedAt">;
