import "server-only";
import { money } from "@/lib/content/helpers";
import { clientContacts } from "@/lib/data/clients";
import { listTeamEmails } from "@/lib/data/identity";
import { networks } from "@/lib/design/tokens";
import { sendMail } from "@/lib/mail";
import { siteUrl } from "@/lib/site";
import type { NewLead } from "@/lib/leads/schema";
import type { Post } from "@/lib/social/schema";

const snippet = (p: Pick<Post, "caption">) => (p.caption.trim() ? `“${p.caption.trim().slice(0, 80)}${p.caption.length > 80 ? "…" : ""}”` : "(sin texto)");

async function mailMany(to: string[], subject: string, text: string) {
  await Promise.all([...new Set(to)].map((t) => sendMail({ to: t, subject, text })));
}

/** Pieza enviada a aprobación: avisa a Administradores y Aprobadores del cliente. */
export async function notifyApprovalRequested(post: Post, clientName: string) {
  const people = await clientContacts(post.clientId, ["admin", "approver"]);
  await mailMany(
    people.map((p) => p.email),
    `Tienes una publicación por aprobar · ${clientName}`,
    [`Hola, tu agencia preparó una publicación para ${clientName}: ${snippet(post)}.`, `Revísala y apruébala o pide cambios aquí: ${siteUrl}/app/c/${post.clientId}/aprobaciones`].join("\n"),
  );
}

/** El cliente aprobó o pidió cambios: avisa al equipo. */
export async function notifyReviewed(post: Post, clientName: string, action: "approve" | "changes", by: string, comment: string) {
  const subject = action === "approve" ? `${clientName} aprobó una publicación` : `${clientName} pidió cambios`;
  const body = [
    `${by} ${action === "approve" ? "aprobó" : "pidió cambios en"} ${snippet(post)}.`,
    comment ? `Comentario: ${comment}` : "",
    `${siteUrl}/app/c/${post.clientId}/calendario`,
  ].filter(Boolean);
  await mailMany(await listTeamEmails(), subject, body.join("\n"));
}

/** Falló la publicación en alguna red: avisa al equipo. */
export async function notifyPublishFailed(post: Post, clientName: string, errors: { platform: keyof typeof networks; error: string }[]) {
  await mailMany(
    await listTeamEmails(),
    `No se pudo publicar en ${errors.map((e) => networks[e.platform].label).join(", ")} · ${clientName}`,
    [`Publicación: ${snippet(post)}`, ...errors.map((e) => `• ${networks[e.platform].label}: ${e.error}`), `${siteUrl}/app/c/${post.clientId}/calendario`].join("\n"),
  );
}

/** Reporte mensual listo: avisa a Administradores del cliente. */
export async function notifyMonthlyReport(clientId: string, clientName: string, summary: string[]) {
  const people = await clientContacts(clientId, ["admin", "approver", "viewer"]);
  await mailMany(
    people.map((p) => p.email),
    `Tu reporte del mes · ${clientName}`,
    [`Hola, este es el resumen del mes de ${clientName}:`, ...summary.map((s) => `• ${s}`), `Míralo completo: ${siteUrl}/app/c/${clientId}/reportes`].join("\n"),
  );
}

/** Llegó una cotización del sitio: avisa al equipo. */
export async function notifyNewLead(lead: NewLead) {
  const totals = [lead.totalMonthly ? `${money(lead.totalMonthly)} / mes` : "", lead.totalOnce ? `${money(lead.totalOnce)} pago único` : ""].filter(Boolean);
  await mailMany(
    await listTeamEmails(),
    `Nuevo prospecto: ${lead.name}${lead.business ? ` · ${lead.business}` : ""}`,
    [
      `${lead.name}${lead.business ? ` (${lead.business})` : ""} pidió una cotización desde el sitio.`,
      lead.services.length ? `Servicios: ${lead.services.map((s) => s.name).join(", ")}` : "Sin servicios marcados.",
      totals.length ? `Total estimado: ${totals.join(" + ")}` : "",
      lead.notes ? `Notas: ${lead.notes}` : "",
      "También te escribió por WhatsApp.",
      `${siteUrl}/app/prospectos`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}
