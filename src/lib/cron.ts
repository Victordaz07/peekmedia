import "server-only";
import { timingSafeEqual } from "node:crypto";
import { isLocalMode } from "@/lib/env";

/**
 * Vercel Cron (o un cron externo) manda "Authorization: Bearer CRON_SECRET". En modo local sin secreto se permite para probar.
 * trim(): al copiar y pegar la clave en Vercel o en el cron es fácil que se cuele un espacio o un salto de línea.
 */
export function cronAllowed(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return isLocalMode();
  const header = request.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;
  const given = Buffer.from(match[1].trim());
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
