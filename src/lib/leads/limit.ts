/** Cuántas cotizaciones acepta el sitio de un mismo visitante. */
export const QUOTE_LIMITS = [
  { windowMs: 10 * 60 * 1000, max: 3 },
  { windowMs: 24 * 60 * 60 * 1000, max: 10 },
] as const;

/** Ventana más larga: lo que haya que leer para decidir. */
export const QUOTE_LOOKBACK_MS = Math.max(...QUOTE_LIMITS.map((l) => l.windowMs));

/** true si un intento más pasaría alguno de los límites. */
export function quoteLimitReached(previous: string[], now = Date.now()): boolean {
  return QUOTE_LIMITS.some(({ windowMs, max }) => previous.filter((iso) => now - Date.parse(iso) < windowMs).length >= max);
}
