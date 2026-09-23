const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/**
 * "23 sept, 5:54 a. m." en hora de República Dominicana (UTC−4, sin horario de verano).
 * Sin Intl a propósito: Node y cada navegador traen datos de idioma distintos y la hidratación no coincidiría.
 */
export function formatDateTimeRD(iso: string) {
  const d = new Date(new Date(iso).getTime() - 4 * 60 * 60 * 1000);
  const h = d.getUTCHours();
  const hour12 = h % 12 || 12;
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}, ${hour12}:${minutes} ${h < 12 ? "a. m." : "p. m."}`;
}
