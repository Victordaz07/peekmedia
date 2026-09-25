"use server";

import { updateTag } from "next/cache";
import { requireTeam } from "@/lib/auth";
import { siteContentSchema } from "@/lib/content/schema";
import { saveSiteContent, SITE_CONTENT_TAG } from "@/lib/data/content";

export type SaveResult = { ok: true } | { ok: false; error: string; path?: (string | number)[] };

export async function saveContent(input: unknown): Promise<SaveResult> {
  const user = await requireTeam();
  const parsed = siteContentSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, path: issue.path as (string | number)[] };
  }
  try {
    await saveSiteContent(parsed.data, user.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar." };
  }
  // El sitio público muestra el cambio en la próxima visita.
  updateTag(SITE_CONTENT_TAG);
  return { ok: true };
}
