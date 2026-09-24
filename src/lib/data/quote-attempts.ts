import "server-only";
import { randomUUID } from "node:crypto";
import { isLocalMode } from "@/lib/env";
import { QUOTE_LOOKBACK_MS, quoteLimitReached } from "@/lib/leads/limit";
import { createAdminClient } from "@/lib/supabase/server";
import { localTable } from "./local-store";

type Attempt = { id: string; ipHash: string; createdAt: string };
const localAttempts = localTable<Attempt>("quote_attempts");

/**
 * Registra un intento de cotización de este visitante (por el hash de su IP).
 * Devuelve false, sin registrarlo, si ya pasó el límite.
 */
export async function takeQuoteAttempt(ipHash: string): Promise<boolean> {
  const since = new Date(Date.now() - QUOTE_LOOKBACK_MS).toISOString();

  if (isLocalMode()) {
    const previous = (await localAttempts.all()).filter((a) => a.ipHash === ipHash && a.createdAt > since).map((a) => a.createdAt);
    if (quoteLimitReached(previous)) return false;
    await localAttempts.insert({ id: randomUUID(), ipHash, createdAt: new Date().toISOString() });
    return true;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("quote_attempts").select("created_at").eq("ip_hash", ipHash).gt("created_at", since);
  if (error) throw new Error(`No se pudo revisar el límite: ${error.message}`);
  if (quoteLimitReached((data as { created_at: string }[]).map((r) => r.created_at))) return false;

  const { error: insertError } = await admin.from("quote_attempts").insert({ ip_hash: ipHash });
  if (insertError) throw new Error(`No se pudo registrar el intento: ${insertError.message}`);
  // Limpieza de paso: lo de hace más de 2 días ya no cuenta para nada.
  await admin.from("quote_attempts").delete().lt("created_at", new Date(Date.now() - 2 * QUOTE_LOOKBACK_MS).toISOString());
  return true;
}
