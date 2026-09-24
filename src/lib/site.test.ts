import { afterEach, describe, expect, it, vi } from "vitest";

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v as string);
  return (await import("./site")).siteUrl;
}

describe("siteUrl", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("usa la variable si es válida", async () => expect(await load({ NEXT_PUBLIC_SITE_URL: "https://peek.do/" })).toBe("https://peek.do"));
  it("agrega https si falta", async () => expect(await load({ NEXT_PUBLIC_SITE_URL: "peek.do" })).toBe("https://peek.do"));
  it("si está vacía usa el dominio de Vercel", async () =>
    expect(await load({ NEXT_PUBLIC_SITE_URL: "", VERCEL_PROJECT_PRODUCTION_URL: "peekmedia.vercel.app" })).toBe("https://peekmedia.vercel.app"));
  it("sin nada, localhost", async () => expect(await load({ NEXT_PUBLIC_SITE_URL: " ", VERCEL_PROJECT_PRODUCTION_URL: "", VERCEL_URL: "" })).toBe("http://localhost:3000"));
});
