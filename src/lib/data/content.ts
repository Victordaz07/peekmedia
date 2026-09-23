import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { defaultContent } from "@/lib/content/defaults";
import { contentKeys, siteContentSchema, type ContentKey, type SiteContent } from "@/lib/content/schema";
import { isLocalMode } from "@/lib/env";
import { createPublicClient, createSessionClient } from "@/lib/supabase/server";
import { readJson, writeJson } from "./local-store";

export const SITE_CONTENT_TAG = "site-content";

type Rows = Partial<Record<ContentKey, unknown>>;

/** Mezcla lo guardado sobre los valores por defecto, grupo por grupo. Un grupo inválido vuelve al default. */
export function mergeContent(rows: Rows): SiteContent {
  const out = structuredClone(defaultContent) as Record<ContentKey, unknown>;
  for (const key of contentKeys) {
    if (rows[key] === undefined) continue;
    const parsed = siteContentSchema.shape[key].safeParse(rows[key]);
    if (parsed.success) out[key] = parsed.data;
    else console.warn(`[content] "${key}" guardado no es válido; se usa el valor por defecto.`);
  }
  return out as SiteContent;
}

async function readRows(): Promise<Rows> {
  if (isLocalMode()) return (await readJson<Rows>("site-content")) ?? {};
  const { data, error } = await createPublicClient().from("site_content").select("key, value");
  if (error) throw new Error(`No se pudo leer el contenido: ${error.message}`);
  return Object.fromEntries(data.map((r) => [r.key, r.value]));
}

/** Contenido del sitio, cacheado hasta que el CMS guarde (updateTag). */
export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheTag(SITE_CONTENT_TAG);
  cacheLife("days");
  return mergeContent(await readRows());
}

/** Lectura sin caché para el editor. */
export async function getSiteContentFresh(): Promise<SiteContent> {
  return mergeContent(await readRows());
}

/** Guarda el contenido completo. En Supabase, RLS exige que quien guarda sea del equipo. */
export async function saveSiteContent(content: SiteContent, userId: string) {
  if (isLocalMode()) {
    await writeJson("site-content", content);
    return;
  }
  const supabase = await createSessionClient();
  const now = new Date().toISOString();
  const rows = contentKeys.map((key) => ({ key, value: content[key], updated_at: now, updated_by: userId }));
  const { error } = await supabase.from("site_content").upsert(rows);
  if (error) throw new Error(`No se pudo guardar: ${error.message}`);
}
