import { siteUrl } from "@/lib/site";

/** Texto de invitación: se envía por correo y también se puede copiar para WhatsApp. */
export function invitationText(p: { name: string; clientName: string; email: string; code: string }) {
  return [
    `Hola ${p.name}, ya tienes acceso al panel de ${p.clientName} en Peek Media.`,
    `Entra en: ${siteUrl}/login?cliente=1`,
    `Correo: ${p.email}`,
    `Código de acceso: ${p.code}`,
    "Al entrar, revisa y firma tu contrato en “Mi plan y contrato”.",
    "Este código es personal; no lo compartas.",
  ].join("\n");
}

export function contractSentText(p: { name: string; clientName: string; planName: string; clientId: string }) {
  return [
    `Hola ${p.name}, tu contrato con Peek Media (${p.planName}) está listo para firmar.`,
    `Revísalo y fírmalo desde tu panel, sin papeles: ${siteUrl}/app/c/${p.clientId}/plan`,
    "Si tienes dudas, respóndenos por WhatsApp.",
  ].join("\n");
}
