import "server-only";
import { isLocalMode, localModeAllowed } from "@/lib/env";
import { siteUrl } from "@/lib/site";

/** Qué integraciones están configuradas (por variables de entorno). Nunca expone los secretos. */
export function integrations() {
  const meta = Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
  const ayrshare = Boolean(process.env.AYRSHARE_API_KEY);
  return {
    meta,
    metaWebhook: meta && Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN),
    metaBusinessId: process.env.META_BUSINESS_ID ?? "",
    ayrshare,
    ayrshareLinking: ayrshare && Boolean(process.env.AYRSHARE_PRIVATE_KEY && process.env.AYRSHARE_DOMAIN),
    mail: Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM),
    cron: Boolean(process.env.CRON_SECRET),
    tokenKey: Boolean(process.env.TOKEN_ENCRYPTION_KEY),
    /** Conexiones de demostración: solo en modo local, para probar sin cuentas reales. */
    demo: isLocalMode() && localModeAllowed(),
  };
}

export const metaGraph = () => `https://graph.facebook.com/${process.env.META_GRAPH_VERSION ?? "v23.0"}`;

export const oauthRedirect = (provider: string) => `${siteUrl}/oauth/callback/${provider}`;
