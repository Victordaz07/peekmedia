import { randomInt } from "node:crypto";

// Sin letras ni números que se confundan (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Código personal de acceso para clientes: "XXXX-XXXX" (~40 bits). */
export function generateAccessCode() {
  const pick = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${pick()}-${pick()}`;
}

/** Acepta "abcd efgh", "ABCDEFGH" o "abcd-efgh" y lo lleva al formato del código. */
export function normalizeAccessCode(input: string) {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : input.trim();
}
