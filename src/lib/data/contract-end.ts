import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { isLocalMode } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import { localTable } from "./local-store";

/**
 * Anular o finalizar un contrato: el dueño lo pide con su contraseña y lo confirma desde el enlace de su correo.
 * Solo el servidor toca estas tablas (en Supabase con la clave secreta; RLS se las niega a todos los demás).
 */

export type EndAction = "void" | "terminate";

export type EndRequest = {
  id: string;
  contractId: string;
  action: EndAction;
  reason: string;
  endDate: string;
  requestedBy: string;
  requestedByName: string;
  tokenHash: string;
  expiresAt: string;
  confirmedAt: string | null;
  createdAt: string;
};

/** El enlace vale 30 minutos. */
export const END_LINK_MINUTES = 30;
/** Máximo de contraseñas equivocadas en 15 minutos. */
const MAX_FAILED = 5;
const FAILED_WINDOW_MS = 15 * 60_000;

const requestsT = localTable<EndRequest>("contract-end-requests");
const checksT = localTable<{ id: string; userId: string; ok: boolean; createdAt: string }>("owner-checks");
const contractsT = localTable<{ id: string; status: string; clientId: string }>("contracts");

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "error desconocido"}`);
}

/** ¿Ya se equivocó demasiadas veces? Se revisa antes de probar la contraseña. */
export async function tooManyFailedChecks(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - FAILED_WINDOW_MS).toISOString();
  if (isLocalMode()) {
    return (await checksT.all()).filter((c) => c.userId === userId && !c.ok && c.createdAt >= since).length >= MAX_FAILED;
  }
  const { count, error } = await createAdminClient()
    .from("owner_checks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("ok", false)
    .gte("created_at", since);
  if (error) fail("No se pudo revisar los intentos", error);
  return (count ?? 0) >= MAX_FAILED;
}

export async function recordCheck(userId: string, ok: boolean) {
  if (isLocalMode()) {
    await checksT.insert({ id: randomUUID(), userId, ok, createdAt: new Date().toISOString() });
    return;
  }
  const { error } = await createAdminClient().from("owner_checks").insert({ user_id: userId, ok });
  if (error) fail("No se pudo registrar el intento", error);
}

/** Crea la solicitud y devuelve el token del enlace (solo se guarda su hash). */
export async function createEndRequest(input: Pick<EndRequest, "contractId" | "action" | "reason" | "endDate" | "requestedBy" | "requestedByName">): Promise<{ id: string; token: string }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + END_LINK_MINUTES * 60_000).toISOString();
  if (isLocalMode()) {
    const id = randomUUID();
    await requestsT.insert({ ...input, id, tokenHash: hash(token), expiresAt, confirmedAt: null, createdAt: new Date().toISOString() });
    return { id, token };
  }
  const { data, error } = await createAdminClient()
    .from("contract_end_requests")
    .insert({
      contract_id: input.contractId,
      action: input.action,
      reason: input.reason,
      end_date: input.endDate,
      requested_by: input.requestedBy,
      requested_by_name: input.requestedByName,
      token_hash: hash(token),
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error) fail("No se pudo crear la solicitud", error);
  return { id: data.id as string, token };
}

/** Deja sin efecto una solicitud (por ejemplo, si el correo no salió). */
export async function cancelEndRequest(id: string) {
  const now = new Date().toISOString();
  if (isLocalMode()) {
    await requestsT.update(id, { expiresAt: now });
    return;
  }
  await createAdminClient().from("contract_end_requests").update({ expires_at: now }).eq("id", id);
}

/** Busca la solicitud por el token del enlace. Devuelve también las vencidas o usadas, para explicar qué pasó. */
export async function findEndRequest(token: string): Promise<EndRequest | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const tokenHash = hash(token);
  if (isLocalMode()) return (await requestsT.find((r) => r.tokenHash === tokenHash)) ?? null;
  const { data, error } = await createAdminClient().from("contract_end_requests").select("*").eq("token_hash", tokenHash).maybeSingle();
  if (error) fail("No se pudo leer la solicitud", error);
  if (!data) return null;
  return {
    id: data.id,
    contractId: data.contract_id,
    action: data.action,
    reason: data.reason,
    endDate: data.end_date,
    requestedBy: data.requested_by,
    requestedByName: data.requested_by_name,
    tokenHash: data.token_hash,
    expiresAt: data.expires_at,
    confirmedAt: data.confirmed_at,
    createdAt: data.created_at,
  };
}

export class EndRequestError extends Error {}

/**
 * Aplica la solicitud. En Supabase lo hace end_contract en una transacción: vigente, sin usar,
 * de la misma persona, que siga siendo dueña, y con el contrato en el estado correcto.
 */
export async function applyEndRequest(requestId: string, userId: string): Promise<"voided" | "terminated"> {
  if (!isLocalMode()) {
    const { data, error } = await createAdminClient().rpc("end_contract", { p_request_id: requestId, p_user: userId });
    if (error) {
      if (/request not valid/.test(error.message)) throw new EndRequestError("Este enlace ya se usó o venció. Pide uno nuevo desde el contrato.");
      if (/not owner/.test(error.message)) throw new EndRequestError("Solo el dueño de la agencia puede hacer esto.");
      if (/not sent|not signed/.test(error.message)) throw new EndRequestError("El contrato cambió de estado desde que lo pediste. Revísalo y vuelve a intentarlo.");
      fail("No se pudo cerrar el contrato", error);
    }
    return data as "voided" | "terminated";
  }
  const r = await requestsT.find((x) => x.id === requestId);
  if (!r || r.confirmedAt || r.expiresAt <= new Date().toISOString() || r.requestedBy !== userId) {
    throw new EndRequestError("Este enlace ya se usó o venció. Pide uno nuevo desde el contrato.");
  }
  const contract = await contractsT.find((c) => c.id === r.contractId);
  const expected = r.action === "void" ? "sent" : "signed";
  if (!contract || contract.status !== expected) throw new EndRequestError("El contrato cambió de estado desde que lo pediste. Revísalo y vuelve a intentarlo.");
  const status = r.action === "void" ? "voided" : "terminated";
  const now = new Date().toISOString();
  await contractsT.update(contract.id, { status, endedAt: now, endDate: r.endDate, endReason: r.reason, endedByName: r.requestedByName } as never);
  await requestsT.update(r.id, { confirmedAt: now });
  for (const other of await requestsT.all()) {
    if (other.contractId === r.contractId && !other.confirmedAt && other.id !== r.id) await requestsT.update(other.id, { expiresAt: now });
  }
  return status;
}
