import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ isLocalMode: () => false }));

const { cronAllowed } = await import("./cron");
const req = (auth?: string) => new Request("https://x.test/api/cron/publish", { headers: auth ? { authorization: auth } : {} });

describe("cronAllowed", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("acepta la clave exacta", () => {
    vi.stubEnv("CRON_SECRET", "abc123");
    expect(cronAllowed(req("Bearer abc123"))).toBe(true);
  });

  it("tolera espacios o saltos de línea pegados por error", () => {
    vi.stubEnv("CRON_SECRET", "abc123\n");
    expect(cronAllowed(req("Bearer  abc123 "))).toBe(true);
  });

  it("rechaza otra clave o sin encabezado", () => {
    vi.stubEnv("CRON_SECRET", "abc123");
    expect(cronAllowed(req("Bearer abc124"))).toBe(false);
    expect(cronAllowed(req("abc123"))).toBe(false);
    expect(cronAllowed(req())).toBe(false);
  });
});
