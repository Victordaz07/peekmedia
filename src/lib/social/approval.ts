import type { Approval, Post } from "./schema";
import type { Intent } from "./validate";

type Content = Pick<Post, "type" | "caption" | "firstComment" | "altText" | "media" | "platforms">;

/** Lo que el cliente aprueba: formato, textos, archivos y redes (la fecha no cuenta). */
export function contentKey(p: Content) {
  return JSON.stringify([p.type, p.caption, p.firstComment, p.altText, p.media.map((m) => m.id), [...p.platforms].sort()]);
}

/**
 * ¿Se puede programar o publicar esta pieza? Si nunca se mandó al cliente, sí (el equipo programa directo).
 * Si ya pasó por aprobación, solo cuando el cliente aprobó exactamente este contenido: si el equipo lo cambió,
 * o el cliente pidió cambios, o todavía no responde, hay que volver a enviarla a aprobación.
 * `approvals` viene del más nuevo al más viejo.
 */
export function approvalBlocker(input: { intent: Intent; post: Pick<Post, "version" | "status"> & Content; next: Content; approvals: Pick<Approval, "action" | "version">[] }): string | null {
  const { intent, post, next, approvals } = input;
  if (intent !== "schedule" && intent !== "now") return null;
  // Pasó por el cliente si hay registros o si su estado lo dice (el estado solo no basta para darla por aprobada).
  const sentToClient = approvals.length > 0 || ["pending", "changes", "approved"].includes(post.status);
  if (!sentToClient) return null;
  if (contentKey(post) !== contentKey(next)) return "Cambiaste el contenido que revisó el cliente. Usa “Enviar a aprobación” para que vea la versión nueva.";
  const decision = approvals.find((a) => a.version === post.version && (a.action === "approve" || a.action === "changes"));
  if (decision?.action === "approve") return null;
  return decision?.action === "changes"
    ? "El cliente pidió cambios en esta versión. Haz los cambios y envíala a aprobación de nuevo."
    : "El cliente todavía no aprueba esta publicación. Espera su respuesta o pídele que la revise.";
}
