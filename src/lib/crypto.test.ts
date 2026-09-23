import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, sign, verifySigned } from "./crypto";

describe("cifrado de tokens", () => {
  it("cifra y descifra", () => {
    const enc = encryptSecret("EAAB-token-secreto");
    expect(enc).not.toContain("EAAB");
    expect(decryptSecret(enc)).toBe("EAAB-token-secreto");
  });

  it("cada cifrado usa un IV distinto", () => {
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
  });

  it("rechaza un texto manipulado", () => {
    const enc = encryptSecret("hola");
    const parts = enc.split(".");
    parts[3] = Buffer.from("chao").toString("base64");
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });
});

describe("firmas HMAC", () => {
  it("verifica lo firmado y rechaza cambios", () => {
    const token = sign("cliente-1");
    expect(verifySigned(token)).toBe("cliente-1");
    const mac = token.split(".")[1];
    expect(verifySigned(`${Buffer.from("cliente-2").toString("base64url")}.${mac}`)).toBeNull();
    expect(verifySigned("basura")).toBeNull();
  });
});
