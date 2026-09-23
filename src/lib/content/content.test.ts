import { describe, expect, it } from "vitest";
import { quoteSubmissionSchema } from "@/lib/leads/schema";
import { defaultContent } from "./defaults";
import { hasText, priceLabel, publicView, quoteMessage, quoteTotals, waLink } from "./helpers";
import { siteContentSchema } from "./schema";

describe("contenido por defecto", () => {
  it("cumple el esquema del CMS", () => {
    expect(siteContentSchema.safeParse(defaultContent).success).toBe(true);
  });

  it("no publica placeholders ni secciones sin datos", () => {
    const view = publicView(defaultContent);
    expect(view.faq).toHaveLength(0); // las respuestas están vacías
    expect(view.testimonials).toHaveLength(0);
    expect(view.logos).toHaveLength(0);
    expect(view.case.metrics).toHaveLength(0);
    expect(view.plans.length).toBeGreaterThan(0);
    expect(JSON.stringify(view)).not.toMatch(/\[[^\]]*\]"/);
  });
});

describe("hasText", () => {
  it("trata vacíos y [placeholders] como sin contenido", () => {
    expect(hasText("")).toBe(false);
    expect(hasText("   ")).toBe(false);
    expect(hasText("[Respuesta]")).toBe(false);
    expect(hasText(undefined)).toBe(false);
    expect(hasText("Sí, mes a mes.")).toBe(true);
  });
});

describe("cotizador", () => {
  const services = [
    { name: "Redes", priceFrom: 10000, billing: "monthly" as const },
    { name: "Reels", priceFrom: 8000, billing: "monthly" as const },
    { name: "Logo", priceFrom: 15000, billing: "once" as const },
    { name: "Web", priceFrom: null, billing: "once" as const },
  ];

  it("suma mensual y pago único por separado", () => {
    expect(quoteTotals(services)).toEqual({ monthly: 18000, once: 15000, unpriced: 1 });
  });

  it("etiqueta precios", () => {
    expect(priceLabel(12000, "monthly")).toBe("Desde RD$ 12,000 / mes");
    expect(priceLabel(6500, "once")).toBe("Desde RD$ 6,500");
    expect(priceLabel(null, "once")).toBe("A cotizar");
  });

  it("arma el mensaje de WhatsApp solo con lo que hay", () => {
    const msg = quoteMessage({ name: " María ", business: "", notes: "Más ventas", services: [{ name: "Redes" }] });
    expect(msg).toBe("Hola Peek Media, quiero una cotización personalizada.\nNombre: María\nServicios:\n- Redes\nNotas: Más ventas");
  });

  it("limpia el número y codifica el texto", () => {
    expect(waLink("1 (809) 555-1234", "Hola ¿qué tal?")).toBe("https://wa.me/18095551234?text=Hola%20%C2%BFqu%C3%A9%20tal%3F");
  });

  it("exige nombre al enviar la cotización", () => {
    expect(quoteSubmissionSchema.safeParse({ name: " ", business: "", notes: "", serviceIds: [] }).success).toBe(false);
    expect(quoteSubmissionSchema.safeParse({ name: "Ana", business: "", notes: "", serviceIds: ["redes"] }).success).toBe(true);
  });
});

describe("validación del CMS", () => {
  it("rechaza URLs sin https y WhatsApp mal escrito", () => {
    const bad = structuredClone(defaultContent);
    bad.general.aboutPhoto = "foto.jpg";
    expect(siteContentSchema.safeParse(bad).success).toBe(false);
    const badWa = structuredClone(defaultContent);
    badWa.general.whatsapp = "809";
    expect(siteContentSchema.safeParse(badWa).success).toBe(false);
  });
});
