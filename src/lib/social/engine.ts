import "server-only";
import { getClient, listClientsAdmin } from "@/lib/data/clients";
import { insertInbox, upsertAudience, upsertMetrics } from "@/lib/data/insights";
import { claimForPublish, getPost, recentPublished, releasePublish, setPostStatus, updateTarget } from "@/lib/data/posts";
import { getProfileKey, listConnectedWithSecrets, setAccountError, type AccountWithSecrets } from "@/lib/data/social";
import type { Network } from "@/lib/design/tokens";
import {
  fetchAyrshareDaily,
  fetchAyrshareReviews,
  publishAyrshare,
} from "@/lib/integrations/ayrshare";
import { demoDaily, demoPublish } from "@/lib/integrations/demo";
import { fetchMetaAudience, fetchMetaComments, fetchMetaDaily, fetchMetaPostMetrics, publishMeta } from "@/lib/integrations/meta";
import { notifyPublishFailed } from "@/lib/notify";
import type { Post, PostStatus } from "./schema";

const message = (e: unknown) => (e instanceof Error ? e.message : "Error desconocido");

/** Estado general de la pieza a partir de cada red. */
export function overallStatus(targets: Post["targets"]): PostStatus {
  if (targets.some((t) => t.status === "failed")) return "failed";
  if (targets.every((t) => t.status === "published" || t.status === "manual")) return "published";
  return "scheduled";
}

async function publishTarget(post: Post, platform: Network, account: AccountWithSecrets | undefined) {
  if (!account) return { status: "failed" as const, error: "La cuenta no está conectada." };
  try {
    switch (account.mode) {
      case "manual":
        return { status: "manual" as const, error: "Acceso como socio: publícalo desde la app de la red." };
      case "demo": {
        const r = demoPublish(platform);
        return { status: "published" as const, externalId: r.externalId, url: r.url };
      }
      case "meta": {
        const r = await publishMeta(account, post);
        return { status: "published" as const, externalId: r.externalId, url: r.url };
      }
      case "ayrshare": {
        const key = await getProfileKey(post.clientId, "ayrshare");
        if (!key) return { status: "failed" as const, error: "El cliente no tiene perfil en Ayrshare. Vuelve a conectar la red." };
        const r = await publishAyrshare(key, platform, post);
        return { status: "published" as const, externalId: r.externalId, url: r.url };
      }
    }
  } catch (e) {
    return { status: "failed" as const, error: message(e) };
  }
}

/**
 * Publica en cada red pendiente. Devuelve el estado final de la pieza.
 * Primero la reserva: si otra ejecución ya la está publicando, no hace nada (evita publicarla dos veces).
 */
export async function publishPost(input: Post): Promise<PostStatus> {
  if (!(await claimForPublish(input.id))) return (await getPost(input.id, { admin: true }))?.status ?? input.status;
  try {
    // Estado fresco de cada red: lo que ya se publicó en otra ejecución no se vuelve a publicar.
    return await publishClaimed((await getPost(input.id, { admin: true })) ?? input);
  } finally {
    await releasePublish(input.id).catch((e) => console.error("[releasePublish]", e));
  }
}

async function publishClaimed(post: Post): Promise<PostStatus> {
  const accounts = await listConnectedWithSecrets(post.clientId);
  const errors: { platform: Network; error: string }[] = [];
  for (const t of post.targets) {
    if (t.status !== "scheduled") continue;
    const r = await publishTarget(post, t.platform, accounts.find((a) => a.platform === t.platform));
    const patch = {
      status: r.status,
      error: "error" in r ? (r.error ?? null) : null,
      externalId: "externalId" in r ? (r.externalId ?? null) : null,
      url: "url" in r ? (r.url ?? null) : null,
      publishedAt: r.status === "published" ? new Date().toISOString() : null,
    };
    await updateTarget(post.id, t.platform, patch);
    if (r.status === "failed") errors.push({ platform: t.platform, error: patch.error ?? "Error" });
  }
  const fresh = (await getPost(post.id, { admin: true })) ?? post;
  const status = overallStatus(fresh.targets);
  await setPostStatus(post.id, status, { admin: true });
  if (errors.length) {
    const client = await getClient(post.clientId).catch(() => null);
    await notifyPublishFailed(post, client?.name ?? "Cliente", errors).catch(() => {});
  }
  return status;
}

/* ───────── Sincronización diaria ───────── */

export type SyncReport = { clientId: string; ok: number; failed: { platform: Network; error: string }[] };

/** Trae métricas del día, audiencia, métricas por post, comentarios y reseñas de un cliente. */
export async function syncClient(clientId: string): Promise<SyncReport> {
  const report: SyncReport = { clientId, ok: 0, failed: [] };
  const accounts = await listConnectedWithSecrets(clientId);
  const profileKey = accounts.some((a) => a.mode === "ayrshare") ? await getProfileKey(clientId, "ayrshare") : null;
  const recent = (await recentPublished(30)).filter((p) => p.clientId === clientId);

  for (const acc of accounts) {
    try {
      if (acc.mode === "meta") {
        await upsertMetrics(clientId, await fetchMetaDaily(acc));
        const audience = await fetchMetaAudience(acc).catch(() => null);
        if (audience) await upsertAudience(clientId, { platform: acc.platform, ...audience });
        for (const p of recent) {
          const t = p.targets.find((x) => x.platform === acc.platform && x.externalId && x.status === "published");
          if (!t?.externalId) continue;
          const metrics = await fetchMetaPostMetrics(acc, t.externalId).catch(() => null);
          if (metrics) await updateTarget(p.id, acc.platform, { metrics });
          await insertInbox(await fetchMetaComments(acc, clientId, t.externalId, p.caption.slice(0, 80)).catch(() => []));
        }
      } else if (acc.mode === "ayrshare" && profileKey) {
        await upsertMetrics(clientId, await fetchAyrshareDaily(profileKey, [acc.platform]));
        if (acc.platform === "google") await insertInbox(await fetchAyrshareReviews(profileKey, clientId));
      } else if (acc.mode === "demo") {
        await upsertMetrics(clientId, demoDaily(clientId, acc.platform));
      }
      await setAccountError(clientId, acc.platform, null);
      report.ok++;
    } catch (e) {
      report.failed.push({ platform: acc.platform, error: message(e) });
      await setAccountError(clientId, acc.platform, message(e));
    }
  }
  return report;
}

export async function syncAllClients(): Promise<SyncReport[]> {
  const clients = (await listClientsAdmin()).filter((c) => c.status === "active" || c.status === "prospect");
  const out: SyncReport[] = [];
  for (const c of clients) out.push(await syncClient(c.id));
  return out;
}
