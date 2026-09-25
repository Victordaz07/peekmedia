import "server-only";
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isLocalMode } from "@/lib/env";
import { createAdminClient, createPublicClient, createSessionClient } from "@/lib/supabase/server";
import { localTable, readJson, writeJson } from "./local-store";

/**
 * Cuentas de acceso (email + contraseña o código). En Supabase son usuarios de Auth;
 * en modo local, un archivo con hashes scrypt y una cookie firmada con HMAC.
 */

type LocalUser = { id: string; email: string; name: string; secretHash: string; banned: boolean };
type LocalMembership = { id: string; userId: string; role: "owner" | "cm" };

const users = localTable<LocalUser>("users");
export const localMemberships = localTable<LocalMembership>("memberships");

/** Cuenta del equipo que se crea sola en modo local para poder entrar. */
export const LOCAL_TEAM = { email: "equipo@peekmedia.local", password: "peek-local-2026", name: "Equipo Peek" };

const COOKIE = "peek_session";
const SESSION_DAYS = 14;

function hashSecret(secret: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(secret, salt, 32).toString("hex")}`;
}

function verifySecret(secret: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const candidate = scryptSync(secret, salt, 32);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

async function sessionKey() {
  if (process.env.PEEK_SESSION_SECRET) return process.env.PEEK_SESSION_SECRET;
  const stored = await readJson<{ key: string }>("session-key");
  if (stored) return stored.key;
  const key = randomBytes(32).toString("hex");
  await writeJson("session-key", { key });
  return key;
}

async function ensureLocalSeed() {
  if ((await users.all()).length) return;
  const id = randomUUID();
  await users.insert({ id, email: LOCAL_TEAM.email, name: LOCAL_TEAM.name, secretHash: hashSecret(LOCAL_TEAM.password), banned: false });
  await localMemberships.insert({ id: randomUUID(), userId: id, role: "owner" });
}

export type SessionUser = { id: string; email: string; name: string };

/** Verifica email + secreto y abre la sesión. Devuelve el usuario o null. */
export async function signInWithSecret(email: string, secret: string): Promise<SessionUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!isLocalMode()) {
    const supabase = await createSessionClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password: secret });
    if (error || !data.user) return null;
    const meta = (data.user.user_metadata ?? {}) as { name?: string };
    return { id: data.user.id, email: data.user.email ?? normalized, name: meta.name ?? "" };
  }
  await ensureLocalSeed();
  const user = await users.find((u) => u.email === normalized);
  if (!user || user.banned || !verifySecret(secret, user.secretHash)) return null;
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = `${user.id}.${expires}`;
  const sig = createHmac("sha256", await sessionKey()).update(payload).digest("hex");
  (await cookies()).set(COOKIE, `${payload}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return { id: user.id, email: user.email, name: user.name };
}

/**
 * Vuelve a pedir la contraseña de quien ya tiene la sesión abierta (acciones delicadas).
 * No toca la sesión actual: en Supabase abre una sesión aparte, sin cookies, y la cierra enseguida.
 */
export async function verifyOwnPassword(user: { id: string; email: string }, secret: string): Promise<boolean> {
  if (!isLocalMode()) {
    const supabase = createPublicClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: user.email.trim().toLowerCase(), password: secret });
    if (error || !data.user) return false;
    // "local" cierra solo esta sesión temporal, no las demás del usuario.
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    return data.user.id === user.id;
  }
  const local = await users.find((u) => u.id === user.id);
  return Boolean(local && !local.banned && verifySecret(secret, local.secretHash));
}

export async function endSession() {
  if (!isLocalMode()) {
    await (await createSessionClient()).auth.signOut();
    return;
  }
  (await cookies()).delete(COOKIE);
}

/** Usuario de la sesión actual (sin decir todavía si es del equipo o de un cliente). */
export async function currentSessionUser(): Promise<SessionUser | null> {
  if (!isLocalMode()) {
    const supabase = await createSessionClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return null;
    const meta = (claims.user_metadata ?? {}) as { name?: string };
    return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "", name: meta.name ?? "" };
  }
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, expires, sig] = raw.split(".");
  const expected = createHmac("sha256", await sessionKey()).update(`${id}.${expires}`).digest("hex");
  if (!sig || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(expires) < Date.now()) return null;
  const user = await users.find((u) => u.id === id);
  if (!user || user.banned) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function teamRoleOf(userId: string): Promise<"owner" | "cm" | null> {
  if (isLocalMode()) return (await localMemberships.find((m) => m.userId === userId))?.role ?? null;
  const supabase = await createSessionClient();
  const { data } = await supabase.from("memberships").select("role").eq("user_id", userId).maybeSingle();
  return (data?.role as "owner" | "cm" | undefined) ?? null;
}

export class EmailTakenError extends Error {
  constructor() {
    super("Ese correo ya tiene acceso. Cada correo entra a un solo espacio.");
  }
}

/** Crea la cuenta de una persona del cliente. El código es su contraseña. */
export async function createLoginUser(email: string, name: string, secret: string): Promise<string> {
  if (!isLocalMode()) {
    const { data, error } = await createAdminClient().auth.admin.createUser({
      email,
      password: secret,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) throw new EmailTakenError();
      throw new Error(`No se pudo crear el acceso: ${error.message}`);
    }
    return data.user.id;
  }
  await ensureLocalSeed();
  if (await users.find((u) => u.email === email)) throw new EmailTakenError();
  const id = randomUUID();
  await users.insert({ id, email, name, secretHash: hashSecret(secret), banned: false });
  return id;
}

export async function setLoginSecret(userId: string, secret: string) {
  if (!isLocalMode()) {
    const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password: secret });
    if (error) throw new Error(`No se pudo cambiar el código: ${error.message}`);
    return;
  }
  await users.update(userId, { secretHash: hashSecret(secret) });
}

/** Bloquea o desbloquea la cuenta (cierra sus sesiones en Supabase). */
export async function setLoginBlocked(userId: string, blocked: boolean) {
  if (!isLocalMode()) {
    const { error } = await createAdminClient().auth.admin.updateUserById(userId, { ban_duration: blocked ? "876000h" : "none" });
    if (error) throw new Error(`No se pudo actualizar el acceso: ${error.message}`);
    return;
  }
  await users.update(userId, { banned: blocked });
}

export async function deleteLoginUser(userId: string) {
  if (!isLocalMode()) {
    const { error } = await createAdminClient().auth.admin.deleteUser(userId);
    if (error) throw new Error(`No se pudo borrar el acceso: ${error.message}`);
    return;
  }
  await users.remove(userId);
}

/** Correos del equipo (para avisos). */
export async function listTeamEmails(): Promise<string[]> {
  if (isLocalMode()) {
    const members = await localMemberships.all();
    const all = await users.all();
    return members.map((m) => all.find((u) => u.id === m.userId)?.email).filter((e): e is string => Boolean(e));
  }
  const admin = createAdminClient();
  const { data: members } = await admin.from("memberships").select("user_id");
  if (!members?.length) return [];
  const { data } = await admin.from("profiles").select("email").in("id", members.map((m) => m.user_id));
  return (data ?? []).map((p) => p.email).filter(Boolean);
}

/**
 * Manda el enlace para elegir una contraseña nueva. Solo a correos del equipo: los clientes
 * entran con un código que les cambia su community manager. No dice si el correo existe.
 */
export async function sendTeamPasswordReset(email: string, redirectTo: string): Promise<void> {
  if (isLocalMode()) return;
  if (!(await listTeamEmails()).includes(email)) return;
  const { error } = await (await createSessionClient()).auth.resetPasswordForEmail(email, { redirectTo });
  if (error) console.error("[sendTeamPasswordReset]", error.message);
}

/** Abre la sesión con el enlace del correo (código PKCE o token_hash). Devuelve false si venció o ya se usó. */
export async function openSessionFromEmailLink(link: { code?: string | null; tokenHash?: string | null; type?: string | null }): Promise<boolean> {
  if (isLocalMode()) return false;
  const supabase = await createSessionClient();
  if (link.code) return !(await supabase.auth.exchangeCodeForSession(link.code)).error;
  if (link.tokenHash && link.type === "recovery") return !(await supabase.auth.verifyOtp({ type: "recovery", token_hash: link.tokenHash })).error;
  return false;
}

/** Cambia la contraseña de quien tiene la sesión abierta. */
export async function setOwnPassword(password: string): Promise<void> {
  if (isLocalMode()) throw new Error("En modo local la contraseña del equipo es fija.");
  const { error } = await (await createSessionClient()).auth.updateUser({ password });
  if (error) throw new Error(/different|same/i.test(error.message) ? "Usa una contraseña distinta a la anterior." : `No se pudo cambiar: ${error.message}`);
}
