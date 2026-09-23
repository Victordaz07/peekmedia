import "server-only";

/**
 * Supabase se activa en cuanto existen sus variables. Sin ellas, la app corre en "modo local":
 * guarda en archivos JSON dentro de .data/ (solo para desarrollo; en producción no se permite).
 */
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey, secretKey: process.env.SUPABASE_SECRET_KEY ?? null };
}

export function isLocalMode() {
  return supabaseConfig() === null;
}

/** El modo local no tiene login: solo se permite fuera de producción (o si se fuerza para pruebas). */
export function localModeAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.PEEK_ALLOW_LOCAL_MODE === "1";
}
