import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sign, verifySigned } from "@/lib/crypto";
import { isLocalMode } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

export const MEDIA_TYPES: Record<string, { ext: string; maxMb: number }> = {
  "image/jpeg": { ext: "jpg", maxMb: 8 },
  "image/png": { ext: "png", maxMb: 8 },
  "image/webp": { ext: "webp", maxMb: 8 },
  "video/mp4": { ext: "mp4", maxMb: 100 },
  "video/quicktime": { ext: "mov", maxMb: 100 },
};

const localDir = path.join(process.cwd(), ".data", "media");

export type UploadTicket = { id: string; uploadUrl: string; publicUrl: string; headers: Record<string, string> };

/**
 * URL firmada para que el navegador suba el archivo directo (sin pasar por la función del servidor).
 * Supabase Storage en producción; un route handler propio en modo local.
 */
export async function createUploadTicket(clientId: string, mime: string, size: number): Promise<UploadTicket> {
  const type = MEDIA_TYPES[mime];
  if (!type) throw new Error("Formato no permitido. Usa JPG, PNG, WebP, MP4 o MOV.");
  if (size > type.maxMb * 1024 * 1024) throw new Error(`El archivo pasa de ${type.maxMb} MB.`);
  const id = randomUUID();
  const file = `${clientId}/${id}.${type.ext}`;

  if (isLocalMode()) {
    const token = sign(JSON.stringify({ file, mime, exp: Date.now() + 10 * 60_000 }));
    return {
      id,
      uploadUrl: `/api/media/upload?token=${encodeURIComponent(token)}`,
      publicUrl: `/api/media/${file}`,
      headers: { "Content-Type": mime },
    };
  }
  const storage = createAdminClient().storage.from("media");
  const { data, error } = await storage.createSignedUploadUrl(file);
  if (error) throw new Error(`No se pudo preparar la subida: ${error.message}`);
  return {
    id,
    uploadUrl: data.signedUrl,
    publicUrl: storage.getPublicUrl(file).data.publicUrl,
    headers: { "Content-Type": mime, "x-upsert": "false" },
  };
}

/* ───────── modo local ───────── */

export async function saveLocalUpload(token: string, body: ArrayBuffer): Promise<void> {
  const payload = verifySigned(token);
  if (!payload) throw new Error("Token no válido");
  const { file, mime, exp } = JSON.parse(payload) as { file: string; mime: string; exp: number };
  if (exp < Date.now()) throw new Error("El enlace de subida venció");
  if (body.byteLength > (MEDIA_TYPES[mime]?.maxMb ?? 0) * 1024 * 1024) throw new Error("Archivo demasiado grande");
  const target = path.join(localDir, file);
  if (!target.startsWith(localDir)) throw new Error("Ruta no válida");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(body));
}

export async function readLocalMedia(parts: string[]): Promise<{ body: Buffer; mime: string } | null> {
  const target = path.join(localDir, ...parts);
  if (!target.startsWith(localDir + path.sep)) return null;
  const ext = path.extname(target).slice(1);
  const mime = Object.entries(MEDIA_TYPES).find(([, t]) => t.ext === ext)?.[0];
  if (!mime) return null;
  try {
    return { body: await readFile(target), mime };
  } catch {
    return null;
  }
}
