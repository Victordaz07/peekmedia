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

/** Tabla local mínima sobre un archivo JSON (solo modo local). */
export function localTable<T extends { id: string }>(name: string) {
  return {
    async all(): Promise<T[]> {
      return (await readJson<T[]>(name)) ?? [];
    },
    async find(pred: (row: T) => boolean): Promise<T | undefined> {
      return (await this.all()).find(pred);
    },
    async insert(row: T): Promise<T> {
      const rows = await this.all();
      rows.push(row);
      await writeJson(name, rows);
      return row;
    },
    async update(id: string, patch: Partial<T>): Promise<T | undefined> {
      const rows = await this.all();
      const row = rows.find((r) => r.id === id);
      if (!row) return undefined;
      Object.assign(row, patch);
      await writeJson(name, rows);
      return row;
    },
    async remove(id: string): Promise<void> {
      await writeJson(name, (await this.all()).filter((r) => r.id !== id));
    },
  };
}
