import "server-only";
import { randomUUID } from "node:crypto";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import type { Network } from "@/lib/design/tokens";
import { isLocalMode } from "@/lib/env";
import type { ConnectionMode, ConnectionStatus, SocialAccount } from "@/lib/social/schema";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";
import { localTable } from "./local-store";

/** Cuenta con sus secretos: solo para el servidor (publicar, sincronizar, responder). */
export type AccountWithSecrets = SocialAccount & {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  meta: Record<string, unknown>;
};

type LocalAccount = SocialAccount & { accessTokenEnc: string | null; refreshTokenEnc: string | null; expiresAt: string | null; meta: Record<string, unknown> };

const accountsT = localTable<LocalAccount>("social-accounts");
const profilesT = localTable<{ id: string; clientId: string; provider: string; profileKeyEnc: string }>("integration-profiles");
const pendingT = localTable<{ id: string; clientId: string; provider: string; payloadEnc: string; expiresAt: string }>("oauth-pending");

const publicCols = "id, client_id, platform, mode, status, external_id, account_name, error, connected_at";

type Row = {
  id: string;
  client_id: string;
  platform: Network;
  mode: ConnectionMode;
  status: ConnectionStatus;
  external_id: string;
  account_name: string;
  error: string | null;
  connected_at: string | null;
  access_token_enc?: string | null;
  refresh_token_enc?: string | null;
  expires_at?: string | null;
  meta?: Record<string, unknown>;
};

const fromRow = (r: Row): SocialAccount => ({
  id: r.id,
  clientId: r.client_id,
  platform: r.platform,
  mode: r.mode,
  status: r.status,
  externalId: r.external_id,
  accountName: r.account_name,
  connectedAt: r.connected_at,
  error: r.error,
});

const strip = ({ accessTokenEnc, refreshTokenEnc, expiresAt, meta, ...pub }: LocalAccount): SocialAccount => {
  void accessTokenEnc;
  void refreshTokenEnc;
  void expiresAt;
  void meta;
  return pub;
};

const open = (enc: string | null | undefined) => (enc ? decryptSecret(enc) : null);

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "error desconocido"}`);
}

/** Cuentas del cliente (sin secretos). */
export async function listAccounts(clientId: string): Promise<SocialAccount[]> {
  if (isLocalMode()) return (await accountsT.all()).filter((a) => a.clientId === clientId).map(strip);
  const { data, error } = await (await createSessionClient()).from("social_accounts").select(publicCols).eq("client_id", clientId);
  if (error) fail("No se pudieron leer las conexiones", error);
  return (data as Row[]).map(fromRow);
}

/** Todas las cuentas conectadas, con secretos (para los jobs). */
export async function listConnectedWithSecrets(clientId?: string): Promise<AccountWithSecrets[]> {
  if (isLocalMode()) {
    return (await accountsT.all())
      .filter((a) => a.status === "connected" && (!clientId || a.clientId === clientId))
      .map((a) => ({ ...strip(a), accessToken: open(a.accessTokenEnc), refreshToken: open(a.refreshTokenEnc), expiresAt: a.expiresAt, meta: a.meta }));
  }
  let q = createAdminClient().from("social_accounts").select("*").eq("status", "connected");
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q;
  if (error) fail("No se pudieron leer las conexiones", error);
  return (data as Row[]).map((r) => ({
    ...fromRow(r),
    accessToken: open(r.access_token_enc),
    refreshToken: open(r.refresh_token_enc),
    expiresAt: r.expires_at ?? null,
    meta: r.meta ?? {},
  }));
}

export async function getAccountWithSecrets(clientId: string, platform: Network): Promise<AccountWithSecrets | null> {
  return (await listConnectedWithSecrets(clientId)).find((a) => a.platform === platform) ?? null;
}

export type AccountUpsert = {
  clientId: string;
  platform: Network;
  mode: ConnectionMode;
  status: ConnectionStatus;
  externalId?: string;
  accountName?: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: string | null;
  meta?: Record<string, unknown>;
  error?: string | null;
};

/** Crea o actualiza la conexión de una red (una por cliente y red). Cifra los tokens. */
export async function upsertAccount(a: AccountUpsert): Promise<void> {
  const connectedAt = a.status === "connected" ? new Date().toISOString() : null;
  const tokens = {
    ...(a.accessToken !== undefined && { accessTokenEnc: a.accessToken ? encryptSecret(a.accessToken) : null }),
    ...(a.refreshToken !== undefined && { refreshTokenEnc: a.refreshToken ? encryptSecret(a.refreshToken) : null }),
  };
  if (isLocalMode()) {
    const existing = await accountsT.find((x) => x.clientId === a.clientId && x.platform === a.platform);
    const patch = {
      mode: a.mode,
      status: a.status,
      externalId: a.externalId ?? existing?.externalId ?? "",
      accountName: a.accountName ?? existing?.accountName ?? "",
      connectedAt: connectedAt ?? (a.status === existing?.status ? existing.connectedAt : null),
      error: a.error ?? null,
      expiresAt: a.expiresAt ?? existing?.expiresAt ?? null,
      meta: a.meta ?? existing?.meta ?? {},
      ...tokens,
    };
    if (existing) await accountsT.update(existing.id, patch);
    else await accountsT.insert({ id: randomUUID(), clientId: a.clientId, platform: a.platform, accessTokenEnc: null, refreshTokenEnc: null, ...patch });
    return;
  }
  const row: Record<string, unknown> = {
    client_id: a.clientId,
    platform: a.platform,
    mode: a.mode,
    status: a.status,
    error: a.error ?? null,
    updated_at: new Date().toISOString(),
    connected_at: connectedAt,
  };
  if (a.externalId !== undefined) row.external_id = a.externalId;
  if (a.accountName !== undefined) row.account_name = a.accountName;
  if (a.expiresAt !== undefined) row.expires_at = a.expiresAt;
  if (a.meta !== undefined) row.meta = a.meta;
  if ("accessTokenEnc" in tokens) row.access_token_enc = tokens.accessTokenEnc;
  if ("refreshTokenEnc" in tokens) row.refresh_token_enc = tokens.refreshTokenEnc;
  const { error } = await createAdminClient().from("social_accounts").upsert(row, { onConflict: "client_id,platform" });
  if (error) fail("No se pudo guardar la conexión", error);
}

export async function setAccountError(clientId: string, platform: Network, message: string | null) {
  if (isLocalMode()) {
    const existing = await accountsT.find((x) => x.clientId === clientId && x.platform === platform);
    if (existing) await accountsT.update(existing.id, { error: message });
    return;
  }
  await createAdminClient().from("social_accounts").update({ error: message }).eq("client_id", clientId).eq("platform", platform);
}

/** Quita la conexión y borra sus tokens. */
export async function removeAccount(clientId: string, platform: Network) {
  if (isLocalMode()) {
    const existing = await accountsT.find((x) => x.clientId === clientId && x.platform === platform);
    if (existing) await accountsT.remove(existing.id);
    return;
  }
  const { error } = await createAdminClient().from("social_accounts").delete().eq("client_id", clientId).eq("platform", platform);
  if (error) fail("No se pudo quitar la conexión", error);
}

/* ───────── perfil en el agregador ───────── */

export async function getProfileKey(clientId: string, provider: string): Promise<string | null> {
  if (isLocalMode()) return open((await profilesT.find((p) => p.clientId === clientId && p.provider === provider))?.profileKeyEnc);
  const { data } = await createAdminClient()
    .from("integration_profiles")
    .select("profile_key_enc")
    .eq("client_id", clientId)
    .eq("provider", provider)
    .maybeSingle();
  return open(data?.profile_key_enc);
}

export async function saveProfileKey(clientId: string, provider: string, key: string) {
  const enc = encryptSecret(key);
  if (isLocalMode()) {
    await profilesT.insert({ id: randomUUID(), clientId, provider, profileKeyEnc: enc });
    return;
  }
  const { error } = await createAdminClient().from("integration_profiles").upsert({ client_id: clientId, provider, profile_key_enc: enc });
  if (error) fail("No se pudo guardar el perfil de integración", error);
}

/* ───────── OAuth a medio terminar (elegir página) ───────── */

export async function savePending(clientId: string, provider: string, payload: unknown): Promise<string> {
  const id = randomUUID();
  const payloadEnc = encryptSecret(JSON.stringify(payload));
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  if (isLocalMode()) {
    await pendingT.insert({ id, clientId, provider, payloadEnc, expiresAt });
    return id;
  }
  const { error } = await createAdminClient().from("oauth_pending").insert({ id, client_id: clientId, provider, payload_enc: payloadEnc, expires_at: expiresAt });
  if (error) fail("No se pudo guardar la conexión pendiente", error);
  return id;
}

export async function takePending<T>(id: string, clientId: string): Promise<T | null> {
  if (isLocalMode()) {
    const row = await pendingT.find((p) => p.id === id && p.clientId === clientId);
    if (!row) return null;
    await pendingT.remove(id);
    return row.expiresAt > new Date().toISOString() ? (JSON.parse(decryptSecret(row.payloadEnc)) as T) : null;
  }
  const admin = createAdminClient();
  const { data } = await admin.from("oauth_pending").select("*").eq("id", id).eq("client_id", clientId).maybeSingle();
  if (!data) return null;
  await admin.from("oauth_pending").delete().eq("id", id);
  return data.expires_at > new Date().toISOString() ? (JSON.parse(decryptSecret(data.payload_enc)) as T) : null;
}

export async function peekPending<T>(id: string, clientId: string): Promise<T | null> {
  if (isLocalMode()) {
    const row = await pendingT.find((p) => p.id === id && p.clientId === clientId);
    return row && row.expiresAt > new Date().toISOString() ? (JSON.parse(decryptSecret(row.payloadEnc)) as T) : null;
  }
  const { data } = await createAdminClient().from("oauth_pending").select("*").eq("id", id).eq("client_id", clientId).maybeSingle();
  return data && data.expires_at > new Date().toISOString() ? (JSON.parse(decryptSecret(data.payload_enc)) as T) : null;
}

/** Cuenta conectada por su id en la red (para asociar un webhook a su cliente). */
export async function findAccountByExternalId(platform: Network, externalId: string): Promise<SocialAccount | null> {
  if (isLocalMode()) {
    const a = await accountsT.find((x) => x.platform === platform && x.externalId === externalId && x.status === "connected");
    return a ? strip(a) : null;
  }
  const { data } = await createAdminClient()
    .from("social_accounts")
    .select(publicCols)
    .eq("platform", platform)
    .eq("external_id", externalId)
    .eq("status", "connected")
    .maybeSingle();
  return data ? fromRow(data as Row) : null;
}
