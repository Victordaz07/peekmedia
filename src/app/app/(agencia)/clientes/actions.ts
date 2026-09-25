"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { generateAccessCode } from "@/lib/access-code";
import { requireTeam } from "@/lib/auth";
import { invitationText } from "@/lib/clients/messages";
import { clientInputSchema, clientRoles, inviteSchema } from "@/lib/clients/schema";
import { contractPlans, DEFAULT_PLAN_ID } from "@/lib/contracts/catalog";
import { defaultTerms } from "@/lib/contracts/terms";
import * as clients from "@/lib/data/clients";
import { getSiteContent } from "@/lib/data/content";
import { saveContractDraft } from "@/lib/data/contracts";
import { createLoginUser, deleteLoginUser, EmailTakenError, setLoginBlocked, setLoginSecret } from "@/lib/data/identity";
import { sendMail } from "@/lib/mail";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; field?: string };

function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  return { ok: false as const, error: issue.message, field: String(issue.path[0] ?? "") };
}

const id = z.string().min(1).max(64);

/* ───────── clientes ───────── */

export async function createClientAction(input: unknown): Promise<ActionResult> {
  await requireTeam();
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const client = await clients.createClient(parsed.data);

  // Cada espacio nace con un contrato en borrador (Plan Estratégico) para ajustar y enviar.
  const plans = contractPlans((await getSiteContent()).plans);
  const plan = plans.find((p) => p.id === DEFAULT_PLAN_ID) ?? plans[0];
  if (plan) await saveContractDraft(client.id, { ...defaultTerms(plan), price: parsed.data.fee || plan.priceFrom || 1 }, plan);

  revalidatePath("/app", "layout");
  redirect(`/app/clientes/${client.id}?nuevo=1`);
}

export async function updateClientAction(clientId: string, input: unknown): Promise<ActionResult> {
  await requireTeam();
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  if (!id.safeParse(clientId).success || !(await clients.getClient(clientId))) return { ok: false, error: "Ese cliente no existe." };
  await clients.updateClient(clientId, parsed.data);
  revalidatePath("/app", "layout");
  return { ok: true };
}

/* ───────── accesos ───────── */

type Invitation = { code: string; text: string; mailed: boolean };

/** Crea la cuenta con un código propio. El código se muestra una sola vez (se guarda con hash). */
export async function inviteAction(clientId: string, input: unknown): Promise<ActionResult<Invitation>> {
  await requireTeam();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const client = await clients.getClient(clientId);
  if (!client) return { ok: false, error: "Ese cliente no existe." };

  const { name, email, role } = parsed.data;
  const code = generateAccessCode();
  let userId: string;
  try {
    userId = await createLoginUser(email, name, code);
  } catch (e) {
    if (e instanceof EmailTakenError) return { ok: false, error: e.message, field: "email" };
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo crear el acceso." };
  }
  try {
    await clients.insertClientUser({ clientId, userId, name, email, role, active: true });
  } catch (e) {
    await deleteLoginUser(userId).catch(() => {});
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar el acceso." };
  }

  const text = invitationText({ name, clientName: client.name, email, code });
  const mail = await sendMail({ to: email, subject: `Tu acceso al panel de ${client.name} · Peek Media`, text });
  revalidatePath(`/app/clientes/${clientId}`);
  return { ok: true, code, text, mailed: mail.sent };
}

async function accessOf(clientUserId: string) {
  if (!id.safeParse(clientUserId).success) return null;
  return clients.getClientUser(clientUserId);
}

export async function regenerateCodeAction(clientUserId: string): Promise<ActionResult<Invitation>> {
  await requireTeam();
  const access = await accessOf(clientUserId);
  if (!access) return { ok: false, error: "Ese acceso no existe." };
  const client = await clients.getClient(access.clientId);
  const code = generateAccessCode();
  await setLoginSecret(access.userId, code);
  await clients.updateClientUser(access.id, { codeUpdatedAt: new Date().toISOString() });
  const text = invitationText({ name: access.name, clientName: client?.name ?? "tu negocio", email: access.email, code });
  revalidatePath(`/app/clientes/${access.clientId}`);
  return { ok: true, code, text, mailed: false };
}

export async function setAccessActiveAction(clientUserId: string, active: boolean): Promise<ActionResult> {
  await requireTeam();
  const access = await accessOf(clientUserId);
  if (!access) return { ok: false, error: "Ese acceso no existe." };
  await setLoginBlocked(access.userId, !active);
  await clients.updateClientUser(access.id, { active });
  revalidatePath(`/app/clientes/${access.clientId}`);
  return { ok: true };
}

export async function setAccessRoleAction(clientUserId: string, role: string): Promise<ActionResult> {
  await requireTeam();
  const parsedRole = z.enum(clientRoles).safeParse(role);
  const access = await accessOf(clientUserId);
  if (!access || !parsedRole.success) return { ok: false, error: "Rol no válido." };
  await clients.updateClientUser(access.id, { role: parsedRole.data });
  revalidatePath(`/app/clientes/${access.clientId}`);
  return { ok: true };
}

/** Quita el acceso y borra la cuenta. Las firmas que haya hecho se conservan. */
export async function removeAccessAction(clientUserId: string): Promise<ActionResult> {
  await requireTeam();
  const access = await accessOf(clientUserId);
  if (!access) return { ok: false, error: "Ese acceso no existe." };
  await deleteLoginUser(access.userId);
  await clients.deleteClientUser(access.id).catch(() => {}); // en Supabase ya se borró en cascada
  revalidatePath(`/app/clientes/${access.clientId}`);
  return { ok: true };
}

/* ───────── notas y tareas ───────── */

const text = (max: number) => z.string().trim().min(1, "Escribe algo").max(max);

export async function addNoteAction(clientId: string, value: string): Promise<ActionResult> {
  const user = await requireTeam();
  const parsed = text(2000).safeParse(value);
  if (!parsed.success) return firstIssue(parsed.error);
  await clients.addNote(clientId, parsed.data, user);
  revalidatePath(`/app/clientes/${clientId}`);
  return { ok: true };
}

export async function deleteNoteAction(clientId: string, noteId: string): Promise<ActionResult> {
  await requireTeam();
  await clients.deleteNote(noteId);
  revalidatePath(`/app/clientes/${clientId}`);
  return { ok: true };
}

export async function addTaskAction(clientId: string, value: string): Promise<ActionResult> {
  await requireTeam();
  const parsed = text(300).safeParse(value);
  if (!parsed.success) return firstIssue(parsed.error);
  await clients.addTask(clientId, parsed.data);
  revalidatePath(`/app/clientes/${clientId}`);
  return { ok: true };
}

export async function setTaskDoneAction(clientId: string, taskId: string, done: boolean): Promise<ActionResult> {
  await requireTeam();
  await clients.setTaskDone(taskId, done);
  revalidatePath(`/app/clientes/${clientId}`);
  return { ok: true };
}

export async function deleteTaskAction(clientId: string, taskId: string): Promise<ActionResult> {
  await requireTeam();
  await clients.deleteTask(taskId);
  revalidatePath(`/app/clientes/${clientId}`);
  return { ok: true };
}
