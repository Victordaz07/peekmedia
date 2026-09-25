import { describe, expect, it } from "vitest";
import { approvalBlocker } from "./approval";

const base = { type: "post" as const, caption: "Hola", firstComment: "", altText: "", media: [], platforms: ["instagram" as const], version: 2, status: "scheduled" as const };

describe("approvalBlocker", () => {
  it("deja programar lo que nunca se mandó al cliente", () => {
    expect(approvalBlocker({ intent: "schedule", post: base, next: { ...base, caption: "Otro" }, approvals: [] })).toBeNull();
  });
  it("deja programar la versión que el cliente aprobó, aunque cambie la fecha", () => {
    expect(approvalBlocker({ intent: "schedule", post: base, next: base, approvals: [{ action: "approve", version: 2 }, { action: "submit", version: 2 }] })).toBeNull();
  });
  it("bloquea si el equipo cambió el contenido aprobado", () => {
    expect(approvalBlocker({ intent: "now", post: base, next: { ...base, caption: "Cambiado" }, approvals: [{ action: "approve", version: 2 }] })).toMatch(/Cambiaste el contenido/);
  });
  it("bloquea si el cliente pidió cambios o no ha respondido", () => {
    expect(approvalBlocker({ intent: "schedule", post: base, next: base, approvals: [{ action: "changes", version: 2 }, { action: "approve", version: 1 }] })).toMatch(/pidió cambios/);
    expect(approvalBlocker({ intent: "schedule", post: base, next: base, approvals: [{ action: "submit", version: 2 }] })).toMatch(/todavía no aprueba/);
  });
  it("una pieza pendiente o marcada aprobada sin registro del cliente no se programa", () => {
    expect(approvalBlocker({ intent: "schedule", post: { ...base, status: "pending" }, next: base, approvals: [] })).toMatch(/todavía no aprueba/);
    expect(approvalBlocker({ intent: "now", post: { ...base, status: "approved" }, next: base, approvals: [] })).toMatch(/todavía no aprueba/);
  });
  it("una aprobación de una versión anterior no sirve", () => {
    expect(approvalBlocker({ intent: "schedule", post: base, next: base, approvals: [{ action: "submit", version: 2 }, { action: "approve", version: 1 }] })).toMatch(/todavía no aprueba/);
  });
  it("guardar borrador o enviar a aprobación siempre se puede", () => {
    expect(approvalBlocker({ intent: "draft", post: base, next: { ...base, caption: "x" }, approvals: [{ action: "approve", version: 2 }] })).toBeNull();
    expect(approvalBlocker({ intent: "approval", post: base, next: { ...base, caption: "x" }, approvals: [{ action: "approve", version: 2 }] })).toBeNull();
  });
});
