"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getViewer, isClientAdmin, requireTeam } from "@/lib/auth";
import { contractSentText } from "@/lib/clients/messages";
import { clientRoleLabel } from "@/lib/clients/schema";
import { getAgency } from "@/lib/contracts/agency";
import { ADDONS, contractPlans, type ContractPlan } from "@/lib/contracts/catalog";
import { canonicalDocument } from "@/lib/contracts/document";
import { contractTermsSchema, signSchema, type ContractTerms } from "@/lib/contracts/schema";
import { defaultTerms, termsOf } from "@/lib/contracts/terms";
import { getClient, listClientUsers } from "@/lib/data/clients";
import { getSiteContent } from "@/lib/data/content";
import * as contracts from "@/lib/data/contracts";
import { sendMail } from "@/lib/mail";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const id = z.string().min(1).max(64);

async function plans() {
  return contractPlans((await getSiteContent()).plans);
}

function refresh(clientId: string) {
  revalidatePath(`/app/c/${clientId}`, "layout");
  revalidatePath("/app", "layout");
}

async function validTerms(clientId: string, input: unknown): Promise<Result<{ terms: ContractTerms; plan: ContractPlan }>> {
  if (!id.safeParse(clientId).success || !(await getClient(clientId))) return { ok: false, error: "Ese cliente no existe." };
  const parsed = contractTermsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const plan = (await plans()).find((p) => p.id === parsed.data.planId);
  if (!plan) return { ok: false, error: "Ese plan ya no existe en el catálogo." };
  return { ok: true, terms: parsed.data, plan };
}

/* ───────── equipo: editar y enviar ───────── */

export async function saveDraftAction(clientId: string, input: unknown): Promise<Result> {
  await requireTeam();
  const v = await validTerms(clientId, input);
  if (!v.ok) return v;
  await contracts.saveContractDraft(clientId, v.terms, v.plan);
  refresh(clientId);
  return { ok: true };
}

/** Guarda y envía para firma. Avisa por correo a los Administradores del cliente. */
export async function sendContractAction(clientId: string, input: unknown): Promise<Result<{ mailed: number; admins: number }>> {
  await requireTeam();
  const v = await validTerms(clientId, input);
  if (!v.ok) return v;
  const draft = await contracts.saveContractDraft(clientId, v.terms, v.plan);
  await contracts.markContractSent(draft.id);

  const client = (await getClient(clientId))!;
  const admins = (await listClientUsers(clientId)).filter((u) => u.active && u.role === "admin");
  let mailed = 0;
  for (const a of admins) {
    const r = await sendMail({
      to: a.email,
      subject: `Tu contrato con Peek Media está listo para firmar`,
      text: contractSentText({ name: a.name, clientName: client.name, planName: v.plan.name, clientId }),
    });
    if (r.sent) mailed++;
  }
  refresh(clientId);
  return { ok: true, mailed, admins: admins.length };
}

/* ───────── cliente: firmar ───────── */

/** Firma electrónica: solo un Administrador del cliente, sobre el texto exacto que se muestra. */
export async function signContractAction(input: unknown): Promise<Result<{ code: string }>> {
  const viewer = await getViewer();
  if (!viewer || !isClientAdmin(viewer)) return { ok: false, error: "Solo un Administrador de tu negocio puede firmar." };

  const parsed = signSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { contractId, name, method, image } = parsed.data;
  if (method === "drawn" && !image) return { ok: false, error: "Dibuja tu firma en el recuadro." };

  const contract = await contracts.getContract(contractId);
  if (!contract || contract.clientId !== viewer.clientId) return { ok: false, error: "Ese contrato no existe." };
  if (contract.status !== "sent") return { ok: false, error: "Este contrato ya no está pendiente de firma." };
  const client = (await getClient(contract.clientId))!;

  const document = canonicalDocument(contract, client, await getAgency());
  const h = await headers();
  const code = `SIG-${randomBytes(4).toString("hex").toUpperCase()}`;
  try {
    await contracts.recordSignature({
      contractId,
      signerUserId: viewer.id,
      signerName: name,
      signerRole: clientRoleLabel[viewer.role],
      method,
      image: method === "drawn" ? image : null,
      signedAt: new Date().toISOString(),
      ip: (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim().slice(0, 64),
      userAgent: (h.get("user-agent") ?? "").slice(0, 400),
      docSha256: createHash("sha256").update(document, "utf8").digest("hex"),
      document,
      verificationCode: code,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo firmar." };
  }
  refresh(contract.clientId);
  return { ok: true, code };
}

/* ───────── cliente: pedir mejoras ───────── */

export async function requestChangeAction(clientId: string, type: "plan" | "addon", target: string): Promise<Result> {
  const viewer = await getViewer();
  if (!viewer || !isClientAdmin(viewer) || viewer.clientId !== clientId) {
    return { ok: false, error: "Solo un Administrador de tu negocio puede solicitar cambios." };
  }
  const current = (await contracts.listContracts(clientId))[0];
  if (type === "plan") {
    const plan = (await plans()).find((p) => p.id === target);
    const currentPlan = (await plans()).find((p) => p.id === current?.planId);
    if (!plan || plan.priceFrom <= (currentPlan?.priceFrom ?? 0)) return { ok: false, error: "Ese plan no está disponible." };
  } else if (!(ADDONS as readonly string[]).includes(target) || current?.addons.includes(target)) {
    return { ok: false, error: "Ese servicio no está disponible." };
  }
  const pending = await contracts.listPlanRequests(clientId);
  if (pending.some((r) => r.status === "pending" && r.type === type && r.target === target)) return { ok: true };
  await contracts.createPlanRequest({ clientId, type, target, byName: viewer.name, byUserId: viewer.id });
  refresh(clientId);
  return { ok: true };
}

/* ───────── equipo: resolver solicitudes y pagos ───────── */

/** Aprobar prepara un contrato nuevo en borrador con el cambio; el equipo lo revisa y lo envía. */
export async function resolveRequestAction(requestId: string, decision: "approved" | "rejected"): Promise<Result> {
  await requireTeam();
  const request = id.safeParse(requestId).success ? await contracts.getPlanRequest(requestId) : null;
  if (!request || request.status !== "pending") return { ok: false, error: "Esa solicitud ya no está pendiente." };

  if (decision === "approved") {
    const catalog = await plans();
    const current = (await contracts.listContracts(request.clientId))[0];
    const basePlan = catalog.find((p) => p.id === (request.type === "plan" ? request.target : current?.planId)) ?? catalog[0];
    let terms: ContractTerms = current ? termsOf(current) : defaultTerms(basePlan);
    if (request.type === "plan") {
      terms = { ...terms, planId: basePlan.id, deliverables: { ...basePlan.deliverables }, price: Math.max(terms.price, basePlan.priceFrom) };
    } else if (!terms.addons.includes(request.target as ContractTerms["addons"][number])) {
      terms = { ...terms, addons: [...terms.addons, request.target as ContractTerms["addons"][number]] };
    }
    await contracts.saveContractDraft(request.clientId, terms, basePlan);
  }
  await contracts.resolvePlanRequest(request.id, decision);
  refresh(request.clientId);
  return { ok: true };
}

export async function setPaymentAction(clientId: string, period: string, paid: boolean): Promise<Result> {
  await requireTeam();
  if (!/^\d{4}-\d{2}$/.test(period)) return { ok: false, error: "Mes no válido." };
  const signed = (await contracts.listContracts(clientId)).find((c) => c.status === "signed");
  if (!signed) return { ok: false, error: "El cliente no tiene un contrato firmado." };
  await contracts.setPaymentPaid(clientId, period, signed.price, paid);
  refresh(clientId);
  return { ok: true };
}
