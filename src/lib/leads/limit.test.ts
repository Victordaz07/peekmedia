import { describe, expect, it } from "vitest";
import { quoteLimitReached } from "./limit";

const now = Date.parse("2026-09-24T12:00:00Z");
const ago = (min: number) => new Date(now - min * 60 * 1000).toISOString();

describe("quoteLimitReached", () => {
  it("deja pasar a un visitante nuevo", () => {
    expect(quoteLimitReached([], now)).toBe(false);
  });

  it("frena el cuarto envío en 10 minutos", () => {
    expect(quoteLimitReached([ago(1), ago(2)], now)).toBe(false);
    expect(quoteLimitReached([ago(1), ago(2), ago(9)], now)).toBe(true);
  });

  it("no cuenta los envíos de hace más de 10 minutos para el límite corto", () => {
    expect(quoteLimitReached([ago(11), ago(20), ago(30)], now)).toBe(false);
  });

  it("frena el envío 11 del día", () => {
    const ten = Array.from({ length: 10 }, (_, i) => ago(30 + i * 60));
    expect(quoteLimitReached(ten, now)).toBe(true);
    expect(quoteLimitReached(ten.slice(1), now)).toBe(false);
  });

  it("olvida lo de ayer", () => {
    expect(quoteLimitReached(Array.from({ length: 12 }, () => ago(25 * 60)), now)).toBe(false);
  });
});
