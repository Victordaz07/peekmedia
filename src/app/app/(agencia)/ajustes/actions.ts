"use server";

import { revalidatePath } from "next/cache";
import { requireTeam } from "@/lib/auth";
import { purgeDemo } from "@/lib/data/demo";
import { DemoAlreadyLoadedError, seedDemo, type DemoAccess } from "@/lib/demo/seed";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function requireOwner() {
  const user = await requireTeam();
  return user.role === "owner" ? user : null;
}

/** Carga los clientes de ejemplo para enseñar el panel funcionando. Solo el dueño. */
export async function loadDemoAction(): Promise<Result<{ accesses: DemoAccess[] }>> {
  const owner = await requireOwner();
  if (!owner) return { ok: false, error: "Solo el dueño de la cuenta puede cargar la demostración." };
  try {
    const { accesses } = await seedDemo(owner);
    revalidatePath("/app", "layout");
    return { ok: true, accesses };
  } catch (e) {
    console.error("[loadDemo]", e);
    if (e instanceof DemoAlreadyLoadedError) return { ok: false, error: e.message };
    // Si algo falló a medias, se limpia lo que alcanzó a crearse para poder intentarlo otra vez.
    await purgeDemo().catch((err) => console.error("[loadDemo:cleanup]", err));
    revalidatePath("/app", "layout");
    return { ok: false, error: `No se pudo cargar la demostración: ${e instanceof Error ? e.message : "error desconocido"}` };
  }
}

/** Borra todo lo de demostración (clientes de ejemplo, sus accesos y prospectos de ejemplo). Solo el dueño. */
export async function clearDemoAction(): Promise<Result<{ clients: number; leads: number }>> {
  const owner = await requireOwner();
  if (!owner) return { ok: false, error: "Solo el dueño de la cuenta puede borrar la demostración." };
  try {
    const removed = await purgeDemo();
    revalidatePath("/app", "layout");
    return { ok: true, ...removed };
  } catch (e) {
    console.error("[clearDemo]", e);
    return { ok: false, error: `No se pudo borrar la demostración: ${e instanceof Error ? e.message : "error desconocido"}` };
  }
}
