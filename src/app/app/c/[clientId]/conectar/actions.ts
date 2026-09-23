"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, requireTeam, type Viewer } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import * as social from "@/lib/data/social";
import { networkIds, type Network } from "@/lib/design/tokens";
import { ayrshareActive, ayrshareLinkUrl, createAyrshareProfile } from "@/lib/integrations/ayrshare";
import { integrations } from "@/lib/integrations/config";
import { connectDemo } from "@/lib/integrations/demo";
import type { MetaPage } from "@/lib/integrations/meta";
import { connectMetaPage } from "@/lib/social/connect";
import { syncClient } from "@/lib/social/engine";
import { manualAccess, providerOf } from "@/lib/social/platforms";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const network = z.enum(networkIds as [Network, ...Network[]]);

/** Equipo o Administrador de ese cliente. */
async function canManage(clientId: string): Promise<Viewer | null> {
  const v = await getViewer();
  if (!v) return null;
  if (v.kind === "team") return v;
  return v.clientId === clientId && v.role === "admin" ? v : null;
}

async function load(clientId: string, platform: string) {
  const p = network.safeParse(platform);
  const client = await getClient(clientId);
  if (!p.success || !client || !client.platforms.includes(p.data)) return null;
  return { client, platform: p.data };
}

const refresh = (clientId: string) => revalidatePath(`/app/c/${clientId}`, "layout");

export type ConnectStep =
  | { kind: "redirect"; url: string }
  | { kind: "external"; url: string; steps: string[] }
  | { kind: "done"; message: string };

/**
 * "Conectar con [red]". Según lo configurado:
 * Meta por OAuth · Ayrshare con su página de enlace · acceso como socio (manual) · demo (solo modo local).
 */
export async function startConnectAction(clientId: string, platform: string): Promise<Result<{ step: ConnectStep }>> {
  const viewer = await canManage(clientId);
  const loaded = viewer && (await load(clientId, platform));
  if (!loaded) return { ok: false, error: "No puedes conectar esta red." };
  const { client, platform: net } = loaded;
  const cfg = integrations();
  const provider = providerOf[net];

  try {
    if (provider === "meta" && cfg.meta) {
      return { ok: true, step: { kind: "redirect", url: `/oauth/start/meta?client=${client.id}` } };
    }
    if (provider === "ayrshare" && cfg.ayrshare) {
      let key = await social.getProfileKey(client.id, "ayrshare");
      if (!key) {
        key = await createAyrshareProfile(`${client.name} · Peek Media`);
        await social.saveProfileKey(client.id, "ayrshare", key);
      }
      await social.upsertAccount({ clientId: client.id, platform: net, mode: "ayrshare", status: "waiting" });
      refresh(client.id);
      if (cfg.ayrshareLinking) {
        return {
          ok: true,
          step: {
            kind: "external",
            url: await ayrshareLinkUrl(key),
            steps: ["Se abrió la página segura de conexión.", `Toca ${net === "google" ? "Google Business" : "la red"} y entra con la cuenta del negocio.`, "Acepta los permisos y vuelve aquí.", "Toca “Ya lo hice”."],
          },
        };
      }
      return {
        ok: true,
        step: { kind: "external", url: "https://app.ayrshare.com/", steps: ["El equipo de Peek conecta esta red desde el panel de Ayrshare, en el perfil del cliente.", "Cuando esté lista, toca “Ya lo hice”."] },
      };
    }
    if (cfg.demo) {
      await connectDemo(client.id, client.name, net);
      refresh(client.id);
      return { ok: true, step: { kind: "done", message: "Conectada en modo demo con datos de ejemplo." } };
    }
    const manual = manualAccess[net];
    if (!manual) return { ok: false, error: "Esta red todavía no se puede conectar: falta configurar su integración." };
    await social.upsertAccount({ clientId: client.id, platform: net, mode: "manual", status: "waiting" });
    refresh(client.id);
    return { ok: true, step: { kind: "external", url: manual.url, steps: manual.steps(cfg.metaBusinessId || "(pídeselo a tu agencia)") } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo iniciar la conexión." };
  }
}

/** "Ya lo hice": Ayrshare se verifica al momento; el acceso manual queda en verificación del equipo. */
export async function markDoneAction(clientId: string, platform: string): Promise<Result<{ message: string }>> {
  const viewer = await canManage(clientId);
  const loaded = viewer && (await load(clientId, platform));
  if (!loaded) return { ok: false, error: "No puedes cambiar esta conexión." };
  const { client, platform: net } = loaded;
  const current = (await social.listAccounts(client.id)).find((a) => a.platform === net);
  if (!current) return { ok: false, error: "Primero toca “Conectar”." };

  if (current.mode === "ayrshare") {
    const key = await social.getProfileKey(client.id, "ayrshare");
    const active = key ? await ayrshareActive(key).catch(() => []) : [];
    const found = active.find((a) => a.platform === net);
    if (!found) return { ok: false, error: "Todavía no vemos la cuenta conectada. Termina el paso en la otra pestaña y vuelve a intentar." };
    await social.upsertAccount({ clientId: client.id, platform: net, mode: "ayrshare", status: "connected", accountName: found.name });
    refresh(client.id);
    return { ok: true, message: "¡Conectada!" };
  }
  await social.upsertAccount({ clientId: client.id, platform: net, mode: "manual", status: "verifying" });
  refresh(client.id);
  return { ok: true, message: "Listo. Tu agencia confirmará el acceso en breve." };
}

/** El equipo confirma que recibió el acceso como socio. */
export async function confirmManualAction(clientId: string, platform: string, accountName: string): Promise<Result> {
  await requireTeam();
  const loaded = await load(clientId, platform);
  const name = z.string().trim().min(2, "Escribe el usuario o la página").max(100).safeParse(accountName);
  if (!loaded) return { ok: false, error: "Red no válida." };
  if (!name.success) return { ok: false, error: name.error.issues[0].message };
  await social.upsertAccount({ clientId, platform: loaded.platform, mode: "manual", status: "connected", accountName: name.data });
  refresh(clientId);
  return { ok: true };
}

/** "Quitar acceso": borra la conexión y sus tokens. */
export async function disconnectAction(clientId: string, platform: string): Promise<Result> {
  const viewer = await canManage(clientId);
  const loaded = viewer && (await load(clientId, platform));
  if (!loaded) return { ok: false, error: "No puedes quitar esta conexión." };
  await social.removeAccount(clientId, loaded.platform);
  refresh(clientId);
  return { ok: true };
}

/** Si la persona administra varias páginas de Facebook, elige cuál es la del negocio. */
export async function choosePageAction(clientId: string, pendingId: string, pageId: string): Promise<Result> {
  const viewer = await canManage(clientId);
  const client = viewer && (await getClient(clientId));
  if (!client) return { ok: false, error: "No autorizado." };
  const pages = await social.takePending<MetaPage[]>(pendingId, clientId);
  const page = pages?.find((p) => p.id === pageId);
  if (!page) return { ok: false, error: "La conexión venció. Vuelve a tocar “Conectar”." };
  await connectMetaPage(client, page);
  refresh(clientId);
  return { ok: true };
}

/** Traer métricas, comentarios y reseñas ahora (equipo). */
export async function syncNowAction(clientId: string): Promise<Result<{ synced: number; failed: string[] }>> {
  await requireTeam();
  const report = await syncClient(clientId);
  refresh(clientId);
  return { ok: true, synced: report.ok, failed: report.failed.map((f) => `${f.platform}: ${f.error}`) };
}
