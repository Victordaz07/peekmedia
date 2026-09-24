import "server-only";
import { randomUUID } from "node:crypto";
import { isLocalMode } from "@/lib/env";
import type { Lead } from "@/lib/leads/schema";
import { createAdminClient } from "@/lib/supabase/server";
import { readJson, writeJson } from "./local-store";

/**
 * Datos de demostración para enseñar el panel funcionando. Los clientes de ejemplo quedan marcados
 * (clients.is_demo) y se borran completos con purgeDemo(); los prospectos de ejemplo llevan source = "demo".
 */

export const DEMO_LEAD_SOURCE = "demo";

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "error desconocido"}`);
}

export async function listDemoClientIds(): Promise<string[]> {
  if (isLocalMode()) return (await readJson<string[]>("demo-clients")) ?? [];
  const { data, error } = await createAdminClient().from("clients").select("id").eq("is_demo", true);
  if (error) fail("No se pudieron leer los clientes de demostración", error);
  return data.map((r) => r.id as string);
}

/** Marca un cliente como de demostración. Solo con la clave secreta: el panel no puede cambiar esta marca. */
export async function markClientDemo(clientId: string) {
  if (isLocalMode()) {
    const ids = await listDemoClientIds();
    await writeJson("demo-clients", [...new Set([...ids, clientId])]);
    return;
  }
  const { error } = await createAdminClient().from("clients").update({ is_demo: true }).eq("id", clientId);
  if (error) fail("No se pudo marcar el cliente de demostración", error);
}

/** Solicitud de cambio de plan hecha "por el cliente" (en el panel solo la crea un Administrador del cliente). */
export async function insertDemoPlanRequest(r: { clientId: string; type: "plan" | "addon"; target: string; byName: string; byUserId: string }) {
  if (isLocalMode()) {
    const all = (await readJson<unknown[]>("plan-requests")) ?? [];
    all.push({ ...r, id: randomUUID(), status: "pending", createdAt: new Date().toISOString(), resolvedAt: null });
    await writeJson("plan-requests", all);
    return;
  }
  const { error } = await createAdminClient()
    .from("plan_requests")
    .insert({ client_id: r.clientId, type: r.type, target: r.target, by_name: r.byName, by_user: r.byUserId });
  if (error) fail("No se pudo crear la solicitud de ejemplo", error);
}

/** Borra todo lo de demostración: clientes marcados (con sus accesos, firmas, métricas, etc.) y prospectos de ejemplo. */
export async function purgeDemo(): Promise<{ clients: number; leads: number }> {
  const ids = await listDemoClientIds();
  if (isLocalMode()) return purgeLocal(ids);

  const db = createAdminClient();
  let leads = 0;
  if (ids.length) {
    const { data: users, error: usersError } = await db.from("client_users").select("user_id").in("client_id", ids);
    if (usersError) fail("No se pudieron leer los accesos de demostración", usersError);
    for (const u of users) {
      const { error } = await db.auth.admin.deleteUser(u.user_id as string);
      if (error && !/not.?found/i.test(error.message)) fail("No se pudo borrar un acceso de demostración", error);
    }
    const { data: contracts, error: contractsError } = await db.from("contracts").select("id").in("client_id", ids);
    if (contractsError) fail("No se pudieron leer los contratos de demostración", contractsError);
    if (contracts.length) {
      // El trigger solo permite borrar firmas de clientes de demostración.
      const { error } = await db.from("signatures").delete().in("contract_id", contracts.map((c) => c.id as string));
      if (error) fail("No se pudieron borrar las firmas de demostración", error);
    }
    const { error } = await db.from("clients").delete().in("id", ids).eq("is_demo", true);
    if (error) fail("No se pudieron borrar los clientes de demostración", error);
  }
  const { data: removed, error: leadsError } = await db.from("leads").delete().eq("source", DEMO_LEAD_SOURCE).select("id");
  if (leadsError) fail("No se pudieron borrar los prospectos de demostración", leadsError);
  leads = removed.length;
  return { clients: ids.length, leads };
}

/* ───────── modo local ───────── */

type Row = Record<string, unknown>;

async function filterTable(name: string, keep: (row: Row) => boolean) {
  const rows = await readJson<Row[]>(name);
  if (rows) await writeJson(name, rows.filter(keep));
}

async function purgeLocal(ids: string[]) {
  const set = new Set(ids);
  const byClient = (row: Row) => !set.has(row.clientId as string);

  const contracts = ((await readJson<Row[]>("contracts")) ?? []).filter((c) => set.has(c.clientId as string)).map((c) => c.id);
  const posts = ((await readJson<Row[]>("posts")) ?? []).filter((p) => set.has(p.clientId as string)).map((p) => p.id);
  const users = ((await readJson<Row[]>("client-users")) ?? []).filter((u) => set.has(u.clientId as string)).map((u) => u.userId);

  await filterTable("signatures", (s) => !contracts.includes(s.contractId));
  await filterTable("approvals", (a) => !posts.includes(a.postId));
  await filterTable("users", (u) => !users.includes(u.id));
  for (const t of ["client-users", "notes", "tasks", "contracts", "plan-requests", "payments", "social-accounts", "integration-profiles", "oauth-pending", "metrics", "audience", "inbox", "client-notes", "posts"]) {
    await filterTable(t, byClient);
  }
  await filterTable("clients", (c) => !set.has(c.id as string));
  await writeJson("demo-clients", []);

  const leads = (await readJson<Lead[]>("leads")) ?? [];
  const kept = leads.filter((l) => l.source !== DEMO_LEAD_SOURCE);
  await writeJson("leads", kept);
  return { clients: ids.length, leads: leads.length - kept.length };
}
