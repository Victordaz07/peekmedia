import "server-only";
import type { Network } from "@/lib/design/tokens";
import { ayrshareName } from "@/lib/social/platforms";
import type { InboxItem, MetricRow, Post } from "@/lib/social/schema";

/**
 * Ayrshare: agregador ya auditado por TikTok, YouTube, Google, LinkedIn, Pinterest, X y Threads.
 * Cada cliente es un "perfil" (Profile-Key). Endpoints según el SDK oficial (api.ayrshare.com/api).
 * Revisa https://www.ayrshare.com/docs antes de activar en producción: los nombres de campos pueden cambiar.
 */
const BASE = "https://api.ayrshare.com/api";

export class AyrshareError extends Error {}

type Json = Record<string, unknown>;

async function call<T = Json>(path: string, opts: { method?: "GET" | "POST" | "DELETE"; body?: Json; profileKey?: string; query?: Record<string, string> } = {}): Promise<T> {
  const key = process.env.AYRSHARE_API_KEY;
  if (!key) throw new AyrshareError("Ayrshare no está configurado.");
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(opts.profileKey && { "Profile-Key": opts.profileKey }),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  const json = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok || json.status === "error") {
    const msg = (json.message as string) ?? ((json.errors as { message?: string }[] | undefined)?.[0]?.message) ?? res.statusText;
    throw new AyrshareError(`Ayrshare: ${msg}`);
  }
  return json as T;
}

/** Crea el perfil del cliente en Ayrshare y devuelve su Profile-Key. */
export async function createAyrshareProfile(title: string): Promise<string> {
  const res = await call<{ profileKey?: string }>("profiles/create-profile", { method: "POST", body: { title } });
  if (!res.profileKey) throw new AyrshareError("Ayrshare no devolvió la clave del perfil.");
  return res.profileKey;
}

/** URL de la página de Ayrshare donde el cliente conecta sus redes (requiere plan Business y llave privada). */
export async function ayrshareLinkUrl(profileKey: string): Promise<string> {
  const res = await call<{ url?: string }>("profiles/generateJWT", {
    method: "POST",
    body: {
      domain: process.env.AYRSHARE_DOMAIN,
      privateKey: (process.env.AYRSHARE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      profileKey,
      expiresIn: 30,
    },
  });
  if (!res.url) throw new AyrshareError("Ayrshare no devolvió el enlace para conectar.");
  return res.url;
}

/** Redes que el cliente ya conectó en su perfil de Ayrshare. */
export async function ayrshareActive(profileKey: string): Promise<{ platform: Network; name: string }[]> {
  const res = await call<{ activeSocialAccounts?: string[]; displayNames?: { platform: string; displayName?: string; username?: string }[] }>("user", { profileKey });
  const byApi = Object.entries(ayrshareName) as [Network, string][];
  return (res.activeSocialAccounts ?? [])
    .map((a) => byApi.find(([, n]) => n === a))
    .filter((x): x is [Network, string] => Boolean(x))
    .map(([platform, api]) => {
      const d = res.displayNames?.find((n) => n.platform === api);
      return { platform, name: d?.username ?? d?.displayName ?? "" };
    });
}

/** Publica en una red vía Ayrshare. */
export async function publishAyrshare(profileKey: string, platform: Network, post: Post): Promise<{ externalId: string; url: string | null }> {
  const api = ayrshareName[platform];
  if (!api) throw new AyrshareError("Esta red no se publica por Ayrshare.");
  const body: Json = { post: post.caption, platforms: [api] };
  if (post.media.length) body.mediaUrls = post.media.map((m) => m.url);
  if (post.media.some((m) => m.mime.startsWith("video/"))) body.isVideo = true;
  if (post.firstComment.trim()) body.firstComment = { comment: post.firstComment };
  if (platform === "youtube") body.youTubeOptions = { title: post.caption.split("\n")[0].slice(0, 100) || "Video", visibility: "public", shorts: post.type === "reel" };
  const res = await call<{ id?: string; postIds?: { platform: string; id?: string; postUrl?: string; status?: string }[]; errors?: { message?: string }[] }>("post", {
    method: "POST",
    body,
    profileKey,
  });
  const ref = res.postIds?.find((p) => p.platform === api);
  if (!ref || ref.status === "error") throw new AyrshareError(res.errors?.[0]?.message ?? "La red rechazó la publicación.");
  return { externalId: ref.id ?? res.id ?? "", url: ref.postUrl ?? null };
}

/** Seguidores y alcance de hoy por red (los nombres de métricas varían por red). */
export async function fetchAyrshareDaily(profileKey: string, platforms: Network[]): Promise<MetricRow[]> {
  const apis = platforms.map((p) => ayrshareName[p]).filter(Boolean) as string[];
  if (!apis.length) return [];
  const res = await call<Record<string, { analytics?: Record<string, unknown> }>>("analytics/social", { method: "POST", body: { platforms: apis }, profileKey });
  const date = new Date().toISOString().slice(0, 10);
  const rows: MetricRow[] = [];
  for (const p of platforms) {
    const a = res[ayrshareName[p]!]?.analytics ?? {};
    const num = (...keys: string[]) => {
      for (const k of keys) if (typeof a[k] === "number") return a[k] as number;
      return undefined;
    };
    const followers = num("followersCount", "followers_count", "subscriberCount", "follower_count", "followers");
    const reach = num("reach", "impressions", "views", "viewCount");
    const interactions = num("engagement", "engagements", "likeCount", "likes");
    if (followers !== undefined) rows.push({ platform: p, date, metric: "followers", value: followers });
    if (reach !== undefined) rows.push({ platform: p, date, metric: "reach", value: reach });
    if (interactions !== undefined) rows.push({ platform: p, date, metric: "interactions", value: interactions });
  }
  return rows;
}

/** Reseñas de Google Business. */
export async function fetchAyrshareReviews(profileKey: string, clientId: string): Promise<Omit<InboxItem, "id" | "reply" | "repliedBy" | "repliedAt">[]> {
  const res = await call<{ reviews?: { reviewId?: string; id?: string; reviewer?: { displayName?: string }; comment?: string; starRating?: number | string; createTime?: string; created?: string }[] }>(
    "reviews",
    { profileKey, query: { platform: "gmb" } },
  );
  const stars: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return (res.reviews ?? []).map((r) => {
    const id = String(r.reviewId ?? r.id ?? "");
    return {
      clientId,
      platform: "google" as const,
      kind: "review" as const,
      externalId: id,
      replyTo: id,
      author: r.reviewer?.displayName ?? "Cliente de Google",
      text: r.comment ?? "",
      stars: typeof r.starRating === "number" ? r.starRating : stars[String(r.starRating)] ?? null,
      postRef: null,
      receivedAt: r.createTime ?? r.created ?? new Date().toISOString(),
    };
  });
}

export async function replyAyrshare(profileKey: string, platform: Network, item: Pick<InboxItem, "kind" | "replyTo">, text: string) {
  const api = ayrshareName[platform];
  if (item.kind === "review") {
    await call("reviews", { method: "POST", body: { reviewId: item.replyTo, platform: "gmb", reply: text }, profileKey });
    return;
  }
  await call("comments/reply", { method: "POST", body: { commentId: item.replyTo, platforms: [api], comment: text }, profileKey });
}
