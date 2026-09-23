import "server-only";
import { isLocalMode } from "@/lib/env";

/** Vercel Cron manda "Authorization: Bearer CRON_SECRET". En modo local sin secreto se permite para probar. */
export function cronAllowed(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return isLocalMode();
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
