import { CheckCircle2, CircleDashed } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardTitle, LoadingState } from "@/components/ui";
import { requireTeam } from "@/lib/auth";
import { isLocalMode } from "@/lib/env";
import { integrations, oauthRedirect } from "@/lib/integrations/config";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Ajustes" };

export default function AjustesPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-display-sm font-bold tracking-[-0.04em]">Ajustes</h1>
        <p className="max-w-[65ch] text-body text-muted">Estado de las integraciones. Las claves se configuran como variables de entorno en Vercel; nunca se muestran aquí.</p>
      </header>
      <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  await requireTeam();
  const cfg = integrations();
  const rows: { label: string; ok: boolean; env: string; help: string }[] = [
    { label: "Base de datos (Supabase)", ok: !isLocalMode(), env: "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY", help: "Sin esto, el panel funciona en modo local." },
    { label: "Cifrado de tokens", ok: cfg.tokenKey, env: "TOKEN_ENCRYPTION_KEY", help: "32 bytes en base64 (openssl rand -base64 32). Obligatorio en producción." },
    { label: "Meta (Instagram y Facebook)", ok: cfg.meta, env: "META_APP_ID, META_APP_SECRET", help: "App de Meta con Facebook Login for Business." },
    { label: "Webhooks de Meta", ok: cfg.metaWebhook, env: "META_WEBHOOK_VERIFY_TOKEN", help: "Comentarios y mensajes llegan al instante a la Bandeja." },
    { label: "ID de negocio de Meta", ok: Boolean(cfg.metaBusinessId), env: "META_BUSINESS_ID", help: "Para el acceso como socio cuando no se usa OAuth." },
    { label: "Ayrshare (otras redes)", ok: cfg.ayrshare, env: "AYRSHARE_API_KEY", help: "TikTok, YouTube, Google, LinkedIn, Pinterest, X y Threads." },
    { label: "Enlace de Ayrshare para el cliente", ok: cfg.ayrshareLinking, env: "AYRSHARE_PRIVATE_KEY, AYRSHARE_DOMAIN", help: "Permite que el cliente conecte solo, sin entrar al panel de Ayrshare." },
    { label: "Tareas programadas", ok: cfg.cron, env: "CRON_SECRET", help: "Publicar cada 10 min, sincronizar a las 5:00 a. m. y reporte mensual." },
    { label: "Correos", ok: cfg.mail, env: "RESEND_API_KEY, MAIL_FROM", help: "Avisos de aprobación, cambios, fallos y reporte mensual." },
  ];
  const urls = [
    { label: "URL de redirección OAuth (Meta)", value: oauthRedirect("meta") },
    { label: "URL del webhook (Meta)", value: `${siteUrl}/api/webhooks/meta` },
    { label: "Política de privacidad", value: `${siteUrl}/privacidad` },
    { label: "Eliminación de datos", value: `${siteUrl}/eliminacion-de-datos` },
  ];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
      <Card className="gap-2">
        <CardTitle>Integraciones</CardTitle>
        <ul className="flex flex-col divide-y divide-hairline">
          {rows.map((r) => (
            <li key={r.label} className="flex items-start gap-3 py-3">
              {r.ok ? <CheckCircle2 aria-label="Configurado" className="mt-0.5 size-5 shrink-0" /> : <CircleDashed aria-label="Falta configurar" className="mt-0.5 size-5 shrink-0 text-muted" />}
              <div className="min-w-0">
                <p className="text-label font-bold">{r.label}</p>
                <p className="text-caption text-muted">{r.help}</p>
                <code className="text-caption break-all">{r.env}</code>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="gap-3">
        <CardTitle>URLs para la configuración</CardTitle>
        <p className="text-caption text-muted">Cópialas en el panel de Meta for Developers.</p>
        <dl className="flex flex-col gap-3">
          {urls.map((u) => (
            <div key={u.label} className="flex flex-col gap-1">
              <dt className="text-eyebrow">{u.label}</dt>
              <dd className="rounded-sm bg-hairline px-3 py-2 font-mono text-caption break-all select-all">{u.value}</dd>
            </div>
          ))}
        </dl>
        {cfg.demo && <p className="rounded-item bg-coral-tint px-4 py-3 text-caption">Modo local: “Conectar” crea cuentas de demostración con datos de ejemplo.</p>}
      </Card>
    </div>
  );
}
