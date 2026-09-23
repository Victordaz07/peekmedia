import { networks } from "@/lib/design/tokens";
import { needsMedia } from "./platforms";
import type { PostInput } from "./schema";

export type Intent = "draft" | "approval" | "schedule" | "now";

/**
 * Reglas de "Crear publicación". Se usan en el editor (para avisar al instante) y en el servidor (para imponerlas).
 * Devuelve el primer problema o null.
 */
export function validatePost(input: PostInput, intent: Intent, now = new Date()): string | null {
  if (!input.platforms.length) return "Elige al menos una red.";
  if (!input.caption.trim() && !input.media.length) return "Agrega texto o un archivo.";
  const over = input.platforms.find((p) => input.caption.length > networks[p].charLimit);
  if (over) return `El texto pasa el límite de ${networks[over].label} (${networks[over].charLimit.toLocaleString("en-US")} caracteres).`;
  if (intent === "draft") return null;

  const noMedia = input.platforms.find((p) => needsMedia.includes(p)) && !input.media.length;
  if (noMedia) {
    const names = input.platforms.filter((p) => needsMedia.includes(p)).map((p) => networks[p].label);
    return `${names.join(" y ")} ${names.length > 1 ? "necesitan" : "necesita"} una imagen o un video.`;
  }
  if (input.type === "story" && input.platforms.some((p) => p !== "instagram" && p !== "facebook")) return "Las historias solo existen en Instagram y Facebook.";
  if (input.type === "carousel" && input.media.length < 2) return "Un carrusel necesita al menos 2 archivos.";
  if (input.media.length > 10) return "Máximo 10 archivos por publicación.";
  if (input.platforms.includes("youtube") && !input.media.some((m) => m.mime.startsWith("video/"))) return "YouTube necesita un video.";
  if (intent === "schedule") {
    if (!input.scheduledAt) return "Elige la fecha y la hora.";
    if (new Date(input.scheduledAt).getTime() < now.getTime() - 60_000) return "Esa fecha ya pasó. Usa “Publicar ahora” o elige otra.";
  }
  return null;
}
