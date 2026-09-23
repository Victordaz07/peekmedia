/** Meta solo deja responder un DM por la API dentro de las 24 h siguientes al último mensaje del usuario. */
export function dmWindowOpen(receivedAt: string, now = Date.now()) {
  return now - new Date(receivedAt).getTime() < 24 * 3_600_000;
}

export const QUICK_REPLIES = ["¡Gracias por escribirnos!", "Te escribimos por mensaje directo.", "Escríbenos al WhatsApp y te ayudamos."];

export const inboxKindLabel = { comment: "Comentario", dm: "Mensaje directo", review: "Reseña" } as const;
