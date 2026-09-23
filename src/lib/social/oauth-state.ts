import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { sign, verifySigned } from "@/lib/crypto";

const COOKIE = "peek_oauth_nonce";

/** "state" de OAuth firmado y atado a este navegador con un nonce en cookie (contra CSRF). */
export async function createOAuthState(clientId: string, userId: string) {
  const nonce = randomBytes(16).toString("hex");
  (await cookies()).set(COOKIE, nonce, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/oauth", maxAge: 600 });
  return sign(JSON.stringify({ c: clientId, u: userId, n: nonce, exp: Date.now() + 600_000 }));
}

export async function readOAuthState(state: string): Promise<{ clientId: string; userId: string } | null> {
  const payload = verifySigned(state);
  if (!payload) return null;
  const { c, u, n, exp } = JSON.parse(payload) as { c: string; u: string; n: string; exp: number };
  const store = await cookies();
  const nonce = store.get(COOKIE)?.value;
  store.delete(COOKIE);
  if (!nonce || nonce !== n || exp < Date.now()) return null;
  return { clientId: c, userId: u };
}
