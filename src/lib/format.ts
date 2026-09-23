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

const monthsLong = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Fecha de hoy en RD como "YYYY-MM-DD". */
export function todayRD(now = new Date()) {
  return new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function parts(ymd: string) {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

/** "5 de octubre de 2026" */
export function longDate(ymd: string) {
  const { y, m, d } = parts(ymd);
  return `${d} de ${monthsLong[m - 1]} de ${y}`;
}

/** "5 oct 2026" (o sin año) */
export function shortDate(ymd: string, withYear = true) {
  const { y, m, d } = parts(ymd);
  return `${d} ${months[m - 1]}${withYear ? ` ${y}` : ""}`;
}

/** "octubre 2026" */
export function monthLabel(period: string) {
  const { y, m } = parts(`${period}-01`);
  return `${monthsLong[m - 1]} ${y}`;
}

/** Suma meses a una fecha "YYYY-MM-DD", ajustando el día si el mes es más corto. */
export function addMonths(ymd: string, n: number) {
  const { y, m, d } = parts(ymd);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}
