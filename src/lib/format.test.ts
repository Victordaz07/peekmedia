import { describe, expect, it } from "vitest";
import { formatDateTimeRD } from "./format";

describe("formatDateTimeRD", () => {
  it("usa la hora de RD (UTC−4)", () => {
    expect(formatDateTimeRD("2026-09-23T09:54:29.086Z")).toBe("23 sept, 5:54 a. m.");
    expect(formatDateTimeRD("2026-01-01T02:05:00Z")).toBe("31 dic, 10:05 p. m.");
    expect(formatDateTimeRD("2026-06-10T16:00:00Z")).toBe("10 jun, 12:00 p. m.");
  });
});
