import "server-only";

export type MailResult = { sent: true } | { sent: false; reason: string };

/**
 * Envía un correo con Resend. Sin RESEND_API_KEY no falla: devuelve { sent: false }
 * y la interfaz ofrece copiar el mensaje para mandarlo por WhatsApp.
 */
export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return { sent: false, reason: "El correo no está configurado." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { sent: false, reason: `El servicio de correo respondió ${res.status}.` };
    return { sent: true };
  } catch {
    return { sent: false, reason: "No se pudo conectar con el servicio de correo." };
  }
}
