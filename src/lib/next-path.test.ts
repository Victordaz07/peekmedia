import { describe, expect, it } from "vitest";
import { safeNext } from "./next-path";

describe("safeNext", () => {
  it("acepta rutas del panel", () => {
    expect(safeNext("/app/contratos/confirmar?t=abc_123")).toBe("/app/contratos/confirmar?t=abc_123");
    expect(safeNext("/app/c/123/plan")).toBe("/app/c/123/plan");
  });
  it("rechaza otros dominios y rutas fuera del panel", () => {
    for (const bad of ["//evil.com/app/", "/\\evil.com", "https://evil.com/app/x", "/login", "/app", "/app/../login", " /app/x", 42, null]) {
      expect(safeNext(bad)).toBeNull();
    }
  });
});
