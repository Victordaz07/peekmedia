import { z } from "zod";
import { ADDONS, deliverableKeys, PAYMENT_METHODS, type Deliverables } from "./catalog";

export const contractStatuses = ["draft", "sent", "signed", "superseded"] as const;
export type ContractStatus = (typeof contractStatuses)[number];

export type Signature = {
  id: string;
  contractId: string;
  signerUserId: string;
  signerName: string;
  signerRole: string;
  method: "typed" | "drawn";
  /** PNG en data URL si la firma fue dibujada. */
  image: string | null;
  signedAt: string;
  ip: string;
  userAgent: string;
  docSha256: string;
  /** JSON canónico exacto que se firmó (su SHA-256 es docSha256). */
  document: string;
  verificationCode: string;
};

export type Contract = {
  id: string;
  clientId: string;
  number: string;
  version: number;
  planId: string;
  planName: string;
  extras: string[];
  price: number;
  startDate: string;
  months: number;
  billingDay: number;
  paymentMethod: string;
  deliverables: Deliverables;
  addons: string[];
  status: ContractStatus;
  createdAt: string;
  sentAt: string | null;
  signedAt: string | null;
  signature: Signature | null;
};

const count = z.number().int().min(0).max(999);

/** Lo que edita el equipo en "Editar plan y condiciones". */
export const contractTermsSchema = z.object({
  planId: z.string().min(1).max(40),
  price: z.number().positive("Pon el precio acordado").max(10_000_000),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida"),
  months: z.number().int().min(1, "Mínimo 1 mes").max(60),
  billingDay: z.number().int().min(1).max(28, "Usa un día del 1 al 28"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  deliverables: z.object(Object.fromEntries(deliverableKeys.map((k) => [k, count])) as Record<keyof Deliverables, typeof count>),
  addons: z.array(z.enum(ADDONS)).max(ADDONS.length),
});

export type ContractTerms = z.infer<typeof contractTermsSchema>;

export const signSchema = z.object({
  contractId: z.string().min(1).max(64),
  name: z.string().trim().min(5, "Escribe tu nombre completo").max(120),
  method: z.enum(["typed", "drawn"]),
  image: z
    .string()
    .max(400_000, "La firma es demasiado grande")
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Firma no válida")
    .nullable(),
  accept: z.literal(true, "Marca la casilla para aceptar el contrato"),
});

export type PlanRequest = {
  id: string;
  clientId: string;
  type: "plan" | "addon";
  /** planId o nombre del servicio adicional */
  target: string;
  status: "pending" | "approved" | "rejected";
  byName: string;
  byUserId: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type Payment = { id: string; clientId: string; period: string; amount: number; paidAt: string };
