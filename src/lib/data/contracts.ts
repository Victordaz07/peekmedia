import "server-only";
import { randomUUID } from "node:crypto";
import type { ContractPlan } from "@/lib/contracts/catalog";
import type { Contract, ContractTerms, Payment, PlanRequest, Signature } from "@/lib/contracts/schema";
import { isLocalMode } from "@/lib/env";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";
import { localTable } from "./local-store";

const contractsT = localTable<Omit<Contract, "signature">>("contracts");
const signaturesT = localTable<Signature>("signatures");
const requestsT = localTable<PlanRequest>("plan-requests");
const paymentsT = localTable<Payment>("payments");

type ContractRow = {
  id: string;
  client_id: string;
  number: string;
  version: number;
  plan_id: string;
  plan_name: string;
  extras: string[];
  price: number;
  start_date: string;
  months: number;
  billing_day: number;
  payment_method: string;
  deliverables: Contract["deliverables"];
  addons: string[];
  status: Contract["status"];
  created_at: string;
  sent_at: string | null;
  signed_at: string | null;
  ended_at: string | null;
  end_date: string | null;
  end_reason: string | null;
  ended_by_name: string | null;
  signatures?: SignatureRow[];
};

type SignatureRow = {
  id: string;
  contract_id: string;
  signer_user_id: string;
  signer_name: string;
  signer_role: string;
  method: Signature["method"];
  image: string | null;
  signed_at: string;
  ip: string;
  user_agent: string;
  doc_sha256: string;
  document: string;
  verification_code: string;
};

const sigFromRow = (r: SignatureRow): Signature => ({
  id: r.id,
  contractId: r.contract_id,
  signerUserId: r.signer_user_id,
  signerName: r.signer_name,
  signerRole: r.signer_role,
  method: r.method,
  image: r.image,
  signedAt: r.signed_at,
  ip: r.ip,
  userAgent: r.user_agent,
  docSha256: r.doc_sha256,
  document: r.document,
  verificationCode: r.verification_code,
});

const contractFromRow = (r: ContractRow): Contract => ({
  id: r.id,
  clientId: r.client_id,
  number: r.number,
  version: r.version,
  planId: r.plan_id,
  planName: r.plan_name,
  extras: r.extras,
  price: Number(r.price),
  startDate: r.start_date,
  months: r.months,
  billingDay: r.billing_day,
  paymentMethod: r.payment_method,
  deliverables: r.deliverables,
  addons: r.addons,
  status: r.status,
  createdAt: r.created_at,
  sentAt: r.sent_at,
  signedAt: r.signed_at,
  endedAt: r.ended_at ?? null,
  endDate: r.end_date ?? null,
  endReason: r.end_reason ?? null,
  endedByName: r.ended_by_name ?? null,
  signature: r.signatures?.[0] ? sigFromRow(r.signatures[0]) : null,
});

function termsToRow(t: ContractTerms, plan: ContractPlan) {
  return {
    plan_id: plan.id,
    plan_name: plan.name,
    extras: plan.extras,
    price: t.price,
    start_date: t.startDate,
    months: t.months,
    billing_day: t.billingDay,
    payment_method: t.paymentMethod,
    deliverables: t.deliverables,
    addons: t.addons,
  };
}

function termsToLocal(t: ContractTerms, plan: ContractPlan) {
  return {
    planId: plan.id,
    planName: plan.name,
    extras: plan.extras,
    price: t.price,
    startDate: t.startDate,
    months: t.months,
    billingDay: t.billingDay,
    paymentMethod: t.paymentMethod,
    deliverables: t.deliverables,
    addons: t.addons,
  };
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "error desconocido"}`);
}

/* ───────── contratos ───────── */

/** Todas las versiones del contrato del cliente, de la más nueva a la más vieja. RLS oculta los borradores al cliente. */
export async function listContracts(clientId: string): Promise<Contract[]> {
  if (isLocalMode()) {
    const sigs = await signaturesT.all();
    return (await contractsT.all())
      .filter((c) => c.clientId === clientId)
      .sort((a, b) => b.version - a.version)
      .map((c) => ({ ...c, signature: sigs.find((s) => s.contractId === c.id) ?? null }));
  }
  const { data, error } = await (await createSessionClient())
    .from("contracts")
    .select("*, signatures(*)")
    .eq("client_id", clientId)
    .order("version", { ascending: false });
  if (error) fail("No se pudo leer el contrato", error);
  return (data as ContractRow[]).map(contractFromRow);
}

/** Resumen de la última versión de cada cliente (para el inicio del equipo). */
export async function listLatestContracts(): Promise<Pick<Contract, "id" | "clientId" | "version" | "status" | "planName" | "sentAt">[]> {
  let rows: Pick<Contract, "id" | "clientId" | "version" | "status" | "planName" | "sentAt">[];
  if (isLocalMode()) {
    rows = await contractsT.all();
  } else {
    const { data, error } = await (await createSessionClient()).from("contracts").select("id, client_id, version, status, plan_name, sent_at");
    if (error) fail("No se pudieron leer los contratos", error);
    rows = data.map((r) => ({ id: r.id, clientId: r.client_id, version: r.version, status: r.status, planName: r.plan_name, sentAt: r.sent_at }));
  }
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if ((latest.get(r.clientId)?.version ?? 0) < r.version) latest.set(r.clientId, r);
  return [...latest.values()].map(({ id, clientId, version, status, planName, sentAt }) => ({ id, clientId, version, status, planName, sentAt }));
}

export async function getContract(id: string): Promise<Contract | null> {
  if (isLocalMode()) {
    const c = await contractsT.find((x) => x.id === id);
    if (!c) return null;
    return { ...c, signature: (await signaturesT.find((s) => s.contractId === id)) ?? null };
  }
  const { data, error } = await (await createSessionClient()).from("contracts").select("*, signatures(*)").eq("id", id).maybeSingle();
  if (error) fail("No se pudo leer el contrato", error);
  return data ? contractFromRow(data as ContractRow) : null;
}

/**
 * Guarda los términos como borrador. Si la versión más nueva es borrador o está enviada, se edita y vuelve a borrador;
 * si ya está firmada, se crea la versión N+1 (la firmada sigue vigente hasta que se firme la nueva).
 */
export async function saveContractDraft(clientId: string, terms: ContractTerms, plan: ContractPlan): Promise<Contract> {
  const latest = (await listContracts(clientId))[0];
  const now = new Date().toISOString();

  if (isLocalMode()) {
    if (latest && (latest.status === "draft" || latest.status === "sent")) {
      await contractsT.update(latest.id, { ...termsToLocal(terms, plan), status: "draft", sentAt: null });
      return (await getContract(latest.id))!;
    }
    const all = await contractsT.all();
    const number = latest?.number ?? `PM-${1001 + new Set(all.map((c) => c.number)).size}`;
    const row = {
      id: randomUUID(),
      clientId,
      number,
      version: (latest?.version ?? 0) + 1,
      ...termsToLocal(terms, plan),
      status: "draft" as const,
      createdAt: now,
      sentAt: null,
      signedAt: null,
      endedAt: null,
      endDate: null,
      endReason: null,
      endedByName: null,
    };
    await contractsT.insert(row);
    return { ...row, signature: null };
  }

  const supabase = await createSessionClient();
  if (latest && (latest.status === "draft" || latest.status === "sent")) {
    const { error } = await supabase
      .from("contracts")
      .update({ ...termsToRow(terms, plan), status: "draft", sent_at: null })
      .eq("id", latest.id);
    if (error) fail("No se pudo guardar el borrador", error);
    return (await getContract(latest.id))!;
  }
  const insert = {
    client_id: clientId,
    ...(latest && { number: latest.number }),
    version: (latest?.version ?? 0) + 1,
    ...termsToRow(terms, plan),
    status: "draft",
  };
  const { data, error } = await supabase.from("contracts").insert(insert).select("*").single();
  if (error) fail("No se pudo crear el contrato", error);
  return contractFromRow(data as ContractRow);
}

export async function markContractSent(id: string) {
  const sentAt = new Date().toISOString();
  if (isLocalMode()) {
    await contractsT.update(id, { status: "sent", sentAt });
    return;
  }
  const { error } = await (await createSessionClient()).from("contracts").update({ status: "sent", sent_at: sentAt }).eq("id", id).eq("status", "draft");
  if (error) fail("No se pudo enviar el contrato", error);
}

/**
 * Registra la firma y marca el contrato como firmado (las versiones firmadas anteriores pasan al historial).
 * En Supabase se hace en una sola transacción con la función sign_contract (solo la clave secreta puede llamarla).
 */
export async function recordSignature(sig: Omit<Signature, "id">): Promise<void> {
  if (isLocalMode()) {
    const contract = await contractsT.find((c) => c.id === sig.contractId);
    if (!contract || contract.status !== "sent") throw new Error("Este contrato ya no está pendiente de firma.");
    await signaturesT.insert({ ...sig, id: randomUUID() });
    for (const c of await contractsT.all()) {
      if (c.clientId === contract.clientId && c.status === "signed") await contractsT.update(c.id, { status: "superseded" });
    }
    await contractsT.update(contract.id, { status: "signed", signedAt: sig.signedAt });
    return;
  }
  const { error } = await createAdminClient().rpc("sign_contract", {
    p_contract_id: sig.contractId,
    p_signer_user_id: sig.signerUserId,
    p_signer_name: sig.signerName,
    p_signer_role: sig.signerRole,
    p_method: sig.method,
    p_image: sig.image,
    p_ip: sig.ip,
    p_user_agent: sig.userAgent,
    p_doc_sha256: sig.docSha256,
    p_verification_code: sig.verificationCode,
    p_document: sig.document,
  });
  if (error) {
    if (/not pending|pendiente/i.test(error.message)) throw new Error("Este contrato ya no está pendiente de firma.");
    if (/signer not allowed/i.test(error.message)) throw new Error("Solo un Administrador activo del cliente puede firmar.");
    fail("No se pudo registrar la firma", error);
  }
}

/* ───────── solicitudes de cambio ───────── */

type RequestRow = {
  id: string;
  client_id: string;
  type: PlanRequest["type"];
  target: string;
  status: PlanRequest["status"];
  by_name: string;
  by_user: string;
  created_at: string;
  resolved_at: string | null;
};

const requestFromRow = (r: RequestRow): PlanRequest => ({
  id: r.id,
  clientId: r.client_id,
  type: r.type,
  target: r.target,
  status: r.status,
  byName: r.by_name,
  byUserId: r.by_user,
  createdAt: r.created_at,
  resolvedAt: r.resolved_at,
});

export async function listPlanRequests(clientId?: string): Promise<PlanRequest[]> {
  if (isLocalMode()) {
    return (await requestsT.all()).filter((r) => !clientId || r.clientId === clientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  let q = (await createSessionClient()).from("plan_requests").select("*").order("created_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q;
  if (error) fail("No se pudieron leer las solicitudes", error);
  return (data as RequestRow[]).map(requestFromRow);
}

export async function createPlanRequest(r: Pick<PlanRequest, "clientId" | "type" | "target" | "byName" | "byUserId">) {
  if (isLocalMode()) {
    await requestsT.insert({ ...r, id: randomUUID(), status: "pending", createdAt: new Date().toISOString(), resolvedAt: null });
    return;
  }
  const { error } = await (await createSessionClient())
    .from("plan_requests")
    .insert({ client_id: r.clientId, type: r.type, target: r.target, by_name: r.byName, by_user: r.byUserId });
  if (error) fail("No se pudo enviar la solicitud", error);
}

export async function getPlanRequest(id: string): Promise<PlanRequest | null> {
  if (isLocalMode()) return (await requestsT.find((r) => r.id === id)) ?? null;
  const { data, error } = await (await createSessionClient()).from("plan_requests").select("*").eq("id", id).maybeSingle();
  if (error) fail("No se pudo leer la solicitud", error);
  return data ? requestFromRow(data as RequestRow) : null;
}

export async function resolvePlanRequest(id: string, status: "approved" | "rejected") {
  const resolvedAt = new Date().toISOString();
  if (isLocalMode()) {
    await requestsT.update(id, { status, resolvedAt });
    return;
  }
  const { error } = await (await createSessionClient())
    .from("plan_requests")
    .update({ status, resolved_at: resolvedAt })
    .eq("id", id)
    .eq("status", "pending");
  if (error) fail("No se pudo actualizar la solicitud", error);
}

/* ───────── pagos ───────── */

export async function listPayments(clientId: string): Promise<Payment[]> {
  if (isLocalMode()) return (await paymentsT.all()).filter((p) => p.clientId === clientId);
  const { data, error } = await (await createSessionClient())
    .from("payments")
    .select("id, client_id, period, amount, paid_at")
    .eq("client_id", clientId);
  if (error) fail("No se pudieron leer los pagos", error);
  return data.map((r) => ({ id: r.id, clientId: r.client_id, period: r.period, amount: Number(r.amount), paidAt: r.paid_at }));
}

export async function setPaymentPaid(clientId: string, period: string, amount: number, paid: boolean) {
  if (isLocalMode()) {
    const existing = await paymentsT.find((p) => p.clientId === clientId && p.period === period);
    if (paid && !existing) await paymentsT.insert({ id: randomUUID(), clientId, period, amount, paidAt: new Date().toISOString() });
    if (!paid && existing) await paymentsT.remove(existing.id);
    return;
  }
  const supabase = await createSessionClient();
  const { error } = paid
    ? await supabase.from("payments").upsert({ client_id: clientId, period, amount }, { onConflict: "client_id,period" })
    : await supabase.from("payments").delete().eq("client_id", clientId).eq("period", period);
  if (error) fail("No se pudo actualizar el pago", error);
}
