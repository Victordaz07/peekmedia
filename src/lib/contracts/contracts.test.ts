import { describe, expect, it } from "vitest";
import { generateAccessCode, normalizeAccessCode } from "@/lib/access-code";
import type { Client } from "@/lib/clients/schema";
import { clientInputSchema, inviteSchema } from "@/lib/clients/schema";
import { defaultContent } from "@/lib/content/defaults";
import { addMonths, longDate, todayRD } from "@/lib/format";
import { contractPlans } from "./catalog";
import { canonicalDocument, contractEnd, contractSections, nextPayment, paymentSchedule } from "./document";
import { contractTermsSchema, signSchema, type Contract } from "./schema";
import { defaultTerms } from "./terms";

const client: Client = {
  id: "c1",
  name: "Café Aroma",
  industry: "Cafetería",
  handle: "cafearoma",
  avatarColor: "coral",
  platforms: ["instagram", "facebook"],
  contactName: "Ana Pérez",
  contactEmail: "ana@cafe.do",
  contactPhone: "",
  taxId: "131-12345-6",
  status: "active",
  fee: 12000,
  createdAt: "2026-09-01T00:00:00Z",
};

const plans = contractPlans(defaultContent.plans);
const basico = plans.find((p) => p.id === "basico")!;

const contract: Contract = {
  id: "k1",
  clientId: "c1",
  number: "PM-1001",
  version: 1,
  planId: basico.id,
  planName: basico.name,
  extras: basico.extras,
  price: 13500,
  startDate: "2026-10-01",
  months: 6,
  billingDay: 5,
  paymentMethod: "Transferencia bancaria",
  deliverables: basico.deliverables,
  addons: ["Pack de 4 reels extra"],
  status: "sent",
  createdAt: "2026-09-23T12:00:00Z",
  sentAt: "2026-09-23T12:00:00Z",
  signedAt: null,
  endedAt: null,
  endDate: null,
  endReason: null,
  endedByName: null,
  signature: null,
};
const agency = { name: "Peek Media", representative: "Dagoberto Nuñez" };

describe("catálogo de planes", () => {
  it("usa solo los planes mensuales, ordenados por precio, con entregables", () => {
    expect(plans.map((p) => p.id)).toEqual(["basico", "estrategico", "premium"]);
    expect(basico.deliverables.posts).toBe(12);
  });
  it("las condiciones iniciales empiezan el mes que viene", () => {
    const t = defaultTerms(basico, "2026-09-23");
    expect(t.startDate).toBe("2026-10-01");
    expect(contractTermsSchema.safeParse(t).success).toBe(true);
  });
});

describe("documento del contrato", () => {
  const sections = contractSections(contract, client, agency);
  it("tiene 10 cláusulas con los datos del contrato", () => {
    expect(sections).toHaveLength(10);
    const text = JSON.stringify(sections);
    expect(text).toContain("representado por Ana Pérez, RNC/Cédula 131-12345-6");
    expect(text).toContain("RD$ 13,500 mensuales");
    expect(text).toContain("Instagram, Facebook");
    expect(text).toContain("Servicios adicionales: Pack de 4 reels extra.");
    expect(text).toContain("1 de octubre de 2026");
    expect(text).toContain("Ley No. 126-02");
    expect(sections.flatMap((s) => s.paras).join(" ")).not.toMatch(/\[[^\]]*\]/); // sin placeholders
  });
  it("el documento canónico cambia si cambia el precio (y con él su hash)", () => {
    expect(canonicalDocument(contract, client, agency)).not.toBe(canonicalDocument({ ...contract, price: 1 }, client, agency));
  });
});

describe("fechas y pagos", () => {
  it("suma meses sin pasarse del último día", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
    expect(longDate("2027-04-01")).toBe("1 de abril de 2027");
  });
  it("calcula fin del plazo y próximo pago", () => {
    expect(contractEnd(contract)).toBe("2027-04-01");
    expect(nextPayment(contract, "2026-09-23")).toBe("2026-10-05"); // antes de empezar: primer pago
    expect(nextPayment(contract, "2026-11-04")).toBe("2026-11-05");
    expect(nextPayment(contract, "2026-11-06")).toBe("2026-12-05");
  });
  it("arma el historial de pagos", () => {
    const rows = paymentSchedule(contract, [{ period: "2026-10", paidAt: "2026-10-04T00:00:00Z" }], "2026-12-10");
    expect(rows.map((r) => `${r.period}:${r.status}`)).toEqual(["2027-01:upcoming", "2026-12:pending", "2026-11:pending", "2026-10:paid"]);
  });
  it("todayRD usa la hora de RD", () => {
    expect(todayRD(new Date("2026-09-24T02:00:00Z"))).toBe("2026-09-23");
  });
});

describe("accesos", () => {
  it("genera códigos XXXX-XXXX sin caracteres confusos", () => {
    for (let i = 0; i < 50; i++) expect(generateAccessCode()).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  });
  it("normaliza lo que escribe la persona", () => {
    expect(normalizeAccessCode("ab3d ef7h")).toBe("AB3D-EF7H");
    expect(normalizeAccessCode("ab3d-ef7h")).toBe("AB3D-EF7H");
  });
  it("valida invitaciones y clientes", () => {
    expect(inviteSchema.safeParse({ name: "Ana", email: "ANA@Cafe.do ", role: "admin" }).data?.email).toBe("ana@cafe.do");
    expect(inviteSchema.safeParse({ name: "Ana", email: "no-es-email", role: "admin" }).success).toBe(false);
    const { id, createdAt, ...input } = client;
    expect(clientInputSchema.safeParse({ ...input, platforms: [] }).success).toBe(false);
    expect(clientInputSchema.safeParse({ ...input, handle: "@cafearoma" }).data?.handle).toBe("cafearoma");
    expect(id && createdAt).toBeTruthy();
  });
});

describe("firma", () => {
  const base = { contractId: "k1", name: "Ana Pérez", method: "typed" as const, image: null, accept: true as const };
  it("exige nombre completo y aceptación", () => {
    expect(signSchema.safeParse(base).success).toBe(true);
    expect(signSchema.safeParse({ ...base, name: "Ana" }).success).toBe(false);
    expect(signSchema.safeParse({ ...base, accept: false }).success).toBe(false);
  });
  it("solo acepta PNG en data URL como firma dibujada", () => {
    expect(signSchema.safeParse({ ...base, method: "drawn", image: "data:image/png;base64,iVBORw0KGgo=" }).success).toBe(true);
    expect(signSchema.safeParse({ ...base, method: "drawn", image: "javascript:alert(1)" }).success).toBe(false);
  });
});
