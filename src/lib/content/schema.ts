import { z } from "zod";

/**
 * Contenido editable del sitio público (CMS). Se guarda por grupos en `site_content`
 * (una fila por clave) y se valida aquí tanto al leer como al guardar.
 */

const text = (max = 2000) => z.string().trim().max(max);
const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Debe empezar con https://");
const price = z.number().nonnegative().max(10_000_000).nullable();
const billing = z.enum(["monthly", "once"]);

export const generalSchema = z.object({
  whatsapp: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^\d{10,15}$/.test(v.replace(/\D/g, "")), "Usa el formato 1809XXXXXXX"),
  website: text(200),
  instagram: text(60),
  contactEmail: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Email no válido"),
  followers: text(20),
  postsCount: text(20),
  heroText: text(400),
  yearsExperience: text(6),
  aboutTitle: text(200),
  aboutText: text(1500),
  aboutPhoto: optionalUrl,
  founderName: text(100),
  founderRole: text(100),
});

export const planSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  name: text(80).min(1, "Ponle nombre al plan"),
  description: text(300),
  priceFrom: price,
  billing,
  items: z.array(text(160)).max(12),
  featured: z.boolean(),
});

export const postSchema = z.object({ title: text(160), tag: text(40), image: optionalUrl, url: optionalUrl });
export const stepSchema = z.object({ title: text(60), desc: text(300) });
export const metricSchema = z.object({ value: text(60), label: text(60) });
export const logoSchema = z.object({ name: text(80), image: optionalUrl });
export const testimonialSchema = z.object({ quote: text(600), name: text(80), business: text(80) });
export const faqSchema = z.object({ q: text(200), a: text(1500) });

export const caseSchema = z.object({
  title: text(160),
  text: text(1500),
  photo: optionalUrl,
  metrics: z.array(metricSchema).max(6),
});

export const quoteServiceSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: text(80).min(1, "Ponle nombre al servicio"),
  description: text(300),
  priceFrom: price,
  billing,
});

export const siteContentSchema = z.object({
  general: generalSchema,
  plans: z.array(planSchema).max(6),
  posts: z.array(postSchema).max(12),
  process: z.array(stepSchema).max(6),
  case: caseSchema,
  logos: z.array(logoSchema).max(12),
  testimonials: z.array(testimonialSchema).max(9),
  faq: z.array(faqSchema).max(15),
  quoteServices: z.array(quoteServiceSchema).max(24),
});

export type SiteContent = z.infer<typeof siteContentSchema>;
export type ContentKey = keyof SiteContent;
export type Plan = z.infer<typeof planSchema>;
export type QuoteService = z.infer<typeof quoteServiceSchema>;
export type Billing = z.infer<typeof billing>;

export const contentKeys = Object.keys(siteContentSchema.shape) as ContentKey[];
