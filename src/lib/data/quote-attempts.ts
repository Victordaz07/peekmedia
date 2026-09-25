import "server-only";
import { randomUUID } from "node:crypto";
import { isLocalMode } from "@/lib/env";
import { QUOTE_LOOKBACK_MS, quoteLimitReached } from "@/lib/leads/limit";
import { createAdminClient } from "@/lib/supabase/server";
import { localTable } from "./local-store";

type Attempt = { id: string; ipHash: string; createdAt: string };
const localAttempts = localTable<Attempt>("quote_attempts");

/** Máximo de correos de "nuevo prospecto" por hora: si alguien inunda el cotizador, no se agota la cuota de correo. */
export const LEAD_EMAILS_PER_HOUR = 20;

/** Cuántos prospectos del cotizador llegaron en la última hora (todos los visitantes). */
export async function leadsInLastHour(): Promise<number> {
  const since = new Date(Date.now() - 3_600_000).toISOString();
  if (isLocalMode()) return (await localAttempts.all()).filter((a) => a.createdAt > since).length;
  const { count, error } = await createAdminClient().from("quote_attempts").select("*", { count: "exact", head: true }).gt("created_at", since);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

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
  // Atómico en la base de datos (cuenta e inserta con un candado por visitante).
  const atomic = await admin.rpc("take_quote_attempt", { p_ip_hash: ipHash });
  if (!atomic.error) return atomic.data === true;
  if (!/take_quote_attempt/.test(atomic.error.message)) throw new Error(`No se pudo revisar el límite: ${atomic.error.message}`);
  // Sin la migración todavía: el método anterior (cuenta y luego inserta).
  const { data, error } = await admin.from("quote_attempts").select("created_at").eq("ip_hash", ipHash).gt("created_at", since);
  if (error) throw new Error(`No se pudo revisar el límite: ${error.message}`);
  if (quoteLimitReached((data as { created_at: string }[]).map((r) => r.created_at))) return false;

  const { error: insertError } = await admin.from("quote_attempts").insert({ ip_hash: ipHash });
  if (insertError) throw new Error(`No se pudo registrar el intento: ${insertError.message}`);
  // Limpieza de paso: lo de hace más de 2 días ya no cuenta para nada.
  await admin.from("quote_attempts").delete().lt("created_at", new Date(Date.now() - 2 * QUOTE_LOOKBACK_MS).toISOString());
  return true;
}
