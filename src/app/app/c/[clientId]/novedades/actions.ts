"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeam } from "@/lib/auth";
import { addClientNote, deleteClientNote } from "@/lib/data/insights";

type Result = { ok: true } | { ok: false; error: string };

/** Nota del CM para el cliente (aparece en Novedades). */
export async function addClientNoteAction(clientId: string, text: string): Promise<Result> {
  const user = await requireTeam();
  const body = z.string().trim().min(1, "Escribe la nota").max(2000).safeParse(text);
  if (!body.success) return { ok: false, error: body.error.issues[0].message };
  await addClientNote(clientId, body.data, user);
  revalidatePath(`/app/c/${clientId}`, "layout");
  return { ok: true };
}

export async function deleteClientNoteAction(clientId: string, noteId: string): Promise<Result> {
  await requireTeam();
  await deleteClientNote(noteId);
  revalidatePath(`/app/c/${clientId}`, "layout");
  return { ok: true };
}
