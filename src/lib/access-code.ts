import { randomInt } from "node:crypto";

// Sin letras ni números que se confundan (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Código personal de acceso para clientes: "XXXX-XXXX-XXXX" (~59 bits). Los de 8 caracteres ya entregados siguen sirviendo. */
export function generateAccessCode() {
  const pick = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${pick()}-${pick()}-${pick()}`;
}

/** Acepta "abcd efgh ijkl", "ABCDEFGHIJKL" o con guiones (y los códigos viejos de 8) y lo lleva al formato del código. */
export function normalizeAccessCode(input: string) {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length === 12) return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
  if (raw.length === 8) return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  return input.trim();
}
