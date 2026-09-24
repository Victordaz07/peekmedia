/**
 * URL pública del sitio, sin "/" al final. Orden: NEXT_PUBLIC_SITE_URL → dominio de producción de Vercel → localhost.
 * Acepta el valor con o sin "https://" y tolera variables vacías o mal escritas.
 */
function resolveSiteUrl(): string {
  const candidates = [process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL];
  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
      return new URL(withProtocol).origin;
    } catch {
      // Valor inválido: se prueba el siguiente.
    }
  }
  return "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl();
