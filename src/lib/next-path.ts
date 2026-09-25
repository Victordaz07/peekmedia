/**
 * A dónde volver después de entrar ("?next="). Solo rutas internas del panel: nada de otros dominios
 * ("//evil.com", "/\\evil.com") ni esquemas raros.
 */
export function safeNext(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 600) return null;
  if (!value.startsWith("/app/") || value.startsWith("//") || /[\\\s]/.test(value)) return null;
  try {
    const url = new URL(value, "https://peek.invalid");
    return url.origin === "https://peek.invalid" && url.pathname.startsWith("/app/") ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}
