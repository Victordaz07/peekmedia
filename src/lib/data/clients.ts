import "server-only";
import { randomUUID } from "node:crypto";
import type { Client, ClientInput, ClientRole, ClientUser, Note, Task } from "@/lib/clients/schema";
import { isLocalMode } from "@/lib/env";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";
import { localTable } from "./local-store";

const clientsT = localTable<Client>("clients");
const clientUsersT = localTable<ClientUser>("client-users");
const notesT = localTable<Note>("notes");
const tasksT = localTable<Task>("tasks");

/* ───────── mapeo Supabase ───────── */

type ClientRow = {
  id: string;
  name: string;
  industry: string;
  handle: string;
  avatar_color: Client["avatarColor"];
  platforms: Client["platforms"];
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  tax_id: string;
  status: Client["status"];
  fee: number | null;
  created_at: string;
};

const clientFromRow = (r: ClientRow): Client => ({
  id: r.id,
  name: r.name,
  industry: r.industry,
  handle: r.handle,
  avatarColor: r.avatar_color,
  platforms: r.platforms,
  contactName: r.contact_name,
  contactEmail: r.contact_email,
  contactPhone: r.contact_phone,
  taxId: r.tax_id,
  status: r.status,
  fee: r.fee == null ? null : Number(r.fee),
  createdAt: r.created_at,
});

const clientToRow = (c: ClientInput) => ({
  name: c.name,
  industry: c.industry,
  handle: c.handle,
  avatar_color: c.avatarColor,
  platforms: c.platforms,
  contact_name: c.contactName,
  contact_email: c.contactEmail,
  contact_phone: c.contactPhone,
  tax_id: c.taxId,
  status: c.status,
  fee: c.fee,
});

type ClientUserRow = {
  id: string;
  client_id: string;
  user_id: string;
  name: string;
  email: string;
  role: ClientRole;
  active: boolean;
  invited_at: string;
  code_updated_at: string;
};

const cuFromRow = (r: ClientUserRow): ClientUser => ({
  id: r.id,
  clientId: r.client_id,
  userId: r.user_id,
  name: r.name,
  email: r.email,
  role: r.role,
  active: r.active,
  invitedAt: r.invited_at,
  codeUpdatedAt: r.code_updated_at,
});

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "error desconocido"}`);
}

/* ───────── clientes ───────── */

export async function listClients(): Promise<Client[]> {
  if (isLocalMode()) return (await clientsT.all()).sort((a, b) => a.name.localeCompare(b.name));
  const { data, error } = await (await createSessionClient()).from("clients").select("*").order("name");
  if (error) fail("No se pudieron leer los clientes", error);
  return (data as ClientRow[]).map(clientFromRow);
}

export async function getClient(id: string): Promise<Client | null> {
  if (isLocalMode()) return (await clientsT.find((c) => c.id === id)) ?? null;
  const { data, error } = await (await createSessionClient()).from("clients").select("*").eq("id", id).maybeSingle();
  if (error) fail("No se pudo leer el cliente", error);
  return data ? clientFromRow(data as ClientRow) : null;
}

export async function createClient(input: ClientInput): Promise<Client> {
  if (isLocalMode()) return clientsT.insert({ ...input, id: randomUUID(), createdAt: new Date().toISOString() });
  const { data, error } = await (await createSessionClient()).from("clients").insert(clientToRow(input)).select("*").single();
  if (error) fail("No se pudo crear el cliente", error);
  return clientFromRow(data as ClientRow);
}

export async function updateClient(id: string, input: ClientInput): Promise<void> {
  if (isLocalMode()) {
    await clientsT.update(id, input);
    return;
  }
  const { error } = await (await createSessionClient()).from("clients").update(clientToRow(input)).eq("id", id);
  if (error) fail("No se pudo guardar el cliente", error);
}

/* ───────── accesos del cliente ───────── */

export async function listClientUsers(clientId: string): Promise<ClientUser[]> {
  if (isLocalMode()) return (await clientUsersT.all()).filter((u) => u.clientId === clientId);
  const { data, error } = await (await createSessionClient())
    .from("client_users")
    .select("*")
    .eq("client_id", clientId)
    .order("invited_at");
  if (error) fail("No se pudieron leer los accesos", error);
  return (data as ClientUserRow[]).map(cuFromRow);
}

/** Acceso de la persona que inició sesión (o null si no es de ningún cliente). */
export async function clientUserByUserId(userId: string): Promise<ClientUser | null> {
  if (isLocalMode()) return (await clientUsersT.find((u) => u.userId === userId)) ?? null;
  const { data, error } = await (await createSessionClient()).from("client_users").select("*").eq("user_id", userId).maybeSingle();
  if (error) fail("No se pudo leer el acceso", error);
  return data ? cuFromRow(data as ClientUserRow) : null;
}

export async function getClientUser(id: string): Promise<ClientUser | null> {
  if (isLocalMode()) return (await clientUsersT.find((u) => u.id === id)) ?? null;
  const { data, error } = await (await createSessionClient()).from("client_users").select("*").eq("id", id).maybeSingle();
  if (error) fail("No se pudo leer el acceso", error);
  return data ? cuFromRow(data as ClientUserRow) : null;
}

/**
 * Registra el acceso. La cuenta de login ya fue creada (identity.createLoginUser).
 * Se escribe con la clave secreta: el equipo no tiene permiso de insertar directo (así el email no se duplica entre clientes).
 */
export async function insertClientUser(u: Omit<ClientUser, "id" | "invitedAt" | "codeUpdatedAt">): Promise<ClientUser> {
  const now = new Date().toISOString();
  if (isLocalMode()) return clientUsersT.insert({ ...u, id: randomUUID(), invitedAt: now, codeUpdatedAt: now });
  const { data, error } = await createAdminClient()
    .from("client_users")
    .insert({ client_id: u.clientId, user_id: u.userId, name: u.name, email: u.email, role: u.role, active: u.active })
    .select("*")
    .single();
  if (error) fail("No se pudo guardar el acceso", error);
  return cuFromRow(data as ClientUserRow);
}

export async function updateClientUser(id: string, patch: Partial<Pick<ClientUser, "active" | "role" | "codeUpdatedAt">>) {
  if (isLocalMode()) {
    await clientUsersT.update(id, patch);
    return;
  }
  const row: Record<string, unknown> = {};
  if (patch.active !== undefined) row.active = patch.active;
  if (patch.role !== undefined) row.role = patch.role;
  if (patch.codeUpdatedAt !== undefined) row.code_updated_at = patch.codeUpdatedAt;
  const { error } = await (await createSessionClient()).from("client_users").update(row).eq("id", id);
  if (error) fail("No se pudo actualizar el acceso", error);
}

export async function deleteClientUser(id: string) {
  if (isLocalMode()) {
    await clientUsersT.remove(id);
    return;
  }
  const { error } = await (await createSessionClient()).from("client_users").delete().eq("id", id);
  if (error) fail("No se pudo quitar el acceso", error);
}

/* ───────── notas y tareas (solo equipo) ───────── */

export async function listNotes(clientId: string): Promise<Note[]> {
  if (isLocalMode()) return (await notesT.all()).filter((n) => n.clientId === clientId).reverse();
  const { data, error } = await (await createSessionClient())
    .from("notes")
    .select("id, client_id, text, by_name, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) fail("No se pudieron leer las notas", error);
  return data.map((r) => ({ id: r.id, clientId: r.client_id, text: r.text, by: r.by_name, at: r.created_at }));
}

export async function addNote(clientId: string, text: string, by: { id: string; name: string }) {
  if (isLocalMode()) {
    await notesT.insert({ id: randomUUID(), clientId, text, by: by.name, at: new Date().toISOString() });
    return;
  }
  const { error } = await (await createSessionClient())
    .from("notes")
    .insert({ client_id: clientId, text, by_user: by.id === "local" ? null : by.id, by_name: by.name });
  if (error) fail("No se pudo guardar la nota", error);
}

export async function deleteNote(id: string) {
  if (isLocalMode()) {
    await notesT.remove(id);
    return;
  }
  const { error } = await (await createSessionClient()).from("notes").delete().eq("id", id);
  if (error) fail("No se pudo borrar la nota", error);
}

export async function listTasks(clientId: string): Promise<Task[]> {
  if (isLocalMode()) return (await tasksT.all()).filter((t) => t.clientId === clientId);
  const { data, error } = await (await createSessionClient())
    .from("tasks")
    .select("id, client_id, text, done, created_at")
    .eq("client_id", clientId)
    .order("created_at");
  if (error) fail("No se pudieron leer las tareas", error);
  return data.map((r) => ({ id: r.id, clientId: r.client_id, text: r.text, done: r.done, createdAt: r.created_at }));
}

export async function addTask(clientId: string, text: string) {
  if (isLocalMode()) {
    await tasksT.insert({ id: randomUUID(), clientId, text, done: false, createdAt: new Date().toISOString() });
    return;
  }
  const { error } = await (await createSessionClient()).from("tasks").insert({ client_id: clientId, text });
  if (error) fail("No se pudo guardar la tarea", error);
}

export async function setTaskDone(id: string, done: boolean) {
  if (isLocalMode()) {
    await tasksT.update(id, { done });
    return;
  }
  const { error } = await (await createSessionClient()).from("tasks").update({ done }).eq("id", id);
  if (error) fail("No se pudo actualizar la tarea", error);
}

export async function deleteTask(id: string) {
  if (isLocalMode()) {
    await tasksT.remove(id);
    return;
  }
  const { error } = await (await createSessionClient()).from("tasks").delete().eq("id", id);
  if (error) fail("No se pudo borrar la tarea", error);
}
