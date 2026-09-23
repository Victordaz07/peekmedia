import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

// Almacén de archivos para el modo local (sin Supabase). No apto para producción ni para Vercel.
const dir = path.join(process.cwd(), ".data");

export async function readJson<T>(name: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path.join(dir, `${name}.json`), "utf8")) as T;
  } catch {
    return null;
  }
}

export async function writeJson(name: string, value: unknown) {
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${name}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2));
  await rename(tmp, file);
}
