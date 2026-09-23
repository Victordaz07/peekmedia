import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Cifrado de tokens de redes (AES-256-GCM). La clave vive en TOKEN_ENCRYPTION_KEY (32 bytes en base64);
 * en desarrollo sin clave se deriva una fija para que el modo local funcione.
 */
function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (raw) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY debe ser de 32 bytes en base64 (openssl rand -base64 32).");
    return buf;
  }
  if (process.env.NODE_ENV === "production" && process.env.PEEK_ALLOW_LOCAL_MODE !== "1") {
    throw new Error("Falta TOKEN_ENCRYPTION_KEY para guardar tokens de redes.");
  }
  return createHash("sha256").update("peek-media-dev-only-key").digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(".");
}

export function decryptSecret(sealed: string): string {
  const [v, iv, tag, data] = sealed.split(".");
  if (v !== "v1") throw new Error("Formato de secreto desconocido");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

/** Firma HMAC corta (para el "state" de OAuth). */
export function sign(payload: string): string {
  const mac = createHmac("sha256", key()).update(`state:${payload}`).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${mac}`;
}

export function verifySigned(token: string): string | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const payload = Buffer.from(body, "base64url").toString("utf8");
  const expected = createHmac("sha256", key()).update(`state:${payload}`).digest("base64url");
  if (expected.length !== mac.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(mac))) return null;
  return payload;
}
