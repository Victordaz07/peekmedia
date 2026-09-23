import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Network } from "@/lib/design/tokens";
import type { InboxItem, MetricRow, Post, PostMetrics } from "@/lib/social/schema";
import { metaGraph, oauthRedirect } from "./config";

/**
 * Meta Graph API (Instagram profesional + Páginas de Facebook), con "Facebook Login para empresas".
 * Los tokens de página que salen de un token de usuario de larga duración no vencen.
 */

export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_manage_engagement",
  "pages_messaging",
  "read_insights",
  "business_management",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
  "instagram_manage_insights",
  "instagram_manage_messages",
].join(",");

export class MetaError extends Error {}

type Json = Record<string, unknown>;

async function graph<T = Json>(path: string, opts: { token: string; method?: "GET" | "POST" | "DELETE"; params?: Record<string, string | number | boolean | undefined> } ): Promise<T> {
  const url = new URL(`${metaGraph()}/${path.replace(/^\//, "")}`);
  const body = new URLSearchParams();
  const target = opts.method === "POST" ? body : url.searchParams;
  for (const [k, v] of Object.entries(opts.params ?? {})) if (v !== undefined) target.set(k, String(v));
  if (opts.token) target.set("access_token", opts.token);
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    body: opts.method === "POST" ? body : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => ({}))) as Json & { error?: { message?: string; code?: number } };
  if (!res.ok || json.error) {
    const e = json.error;
    const expired = e?.code === 190;
    throw new MetaError(expired ? "El acceso a Meta venció o fue revocado. Vuelve a conectar la cuenta." : `Meta: ${e?.message ?? res.statusText}`);
  }
  return json as T;
}

/* ───────── OAuth ───────── */

export function metaAuthUrl(state: string) {
  const u = new URL(`https://www.facebook.com/${process.env.META_GRAPH_VERSION ?? "v23.0"}/dialog/oauth`);
  u.searchParams.set("client_id", process.env.META_APP_ID!);
  u.searchParams.set("redirect_uri", oauthRedirect("meta"));
  u.searchParams.set("state", state);
  u.searchParams.set("scope", META_SCOPES);
  u.searchParams.set("response_type", "code");
  return u.toString();
}

export type MetaPage = { id: string; name: string; token: string; ig: { id: string; username: string } | null };

/** Cambia el code por un token de usuario de larga duración y lista las páginas con su Instagram. */
export async function exchangeMetaCode(code: string): Promise<{ userToken: string; pages: MetaPage[] }> {
  const app = { client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET! };
  const short = await graph<{ access_token: string }>("oauth/access_token", {
    token: "",
    params: { ...app, redirect_uri: oauthRedirect("meta"), code },
  });
  const long = await graph<{ access_token: string }>("oauth/access_token", {
    token: "",
    params: { ...app, grant_type: "fb_exchange_token", fb_exchange_token: short.access_token },
  });
  const res = await graph<{ data: { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }[] }>(
    "me/accounts",
    { token: long.access_token, params: { fields: "id,name,access_token,instagram_business_account{id,username}", limit: 100 } },
  );
  return {
    userToken: long.access_token,
    pages: res.data.map((p) => ({
      id: p.id,
      name: p.name,
      token: p.access_token,
      ig: p.instagram_business_account ? { id: p.instagram_business_account.id, username: p.instagram_business_account.username ?? "" } : null,
    })),
  };
}

/* ───────── Publicar ───────── */

type Account = { platform: Network; externalId: string; accessToken: string | null; meta: Record<string, unknown> };
export type PublishResult = { externalId: string; url: string | null };

const isVideo = (mime: string) => mime.startsWith("video/");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForContainer(id: string, token: string) {
  for (let i = 0; i < 20; i++) {
    const s = await graph<{ status_code?: string }>(id, { token, params: { fields: "status_code" } });
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new MetaError("Instagram no pudo procesar el archivo. Revisa el formato del video.");
    await sleep(3000);
  }
  throw new MetaError("Instagram tardó demasiado en procesar el video. Se reintentará.");
}

async function publishInstagram(acc: Account, post: Post): Promise<PublishResult> {
  const token = acc.accessToken!;
  const ig = acc.externalId;
  const media = post.media;
  if (!media.length) throw new MetaError("Instagram necesita una imagen o un video.");
  const caption = post.caption;
  let creationId: string;

  if (post.type === "carousel" && media.length > 1) {
    const children: string[] = [];
    for (const m of media.slice(0, 10)) {
      const c = await graph<{ id: string }>(`${ig}/media`, {
        token,
        method: "POST",
        params: isVideo(m.mime) ? { media_type: "VIDEO", video_url: m.url, is_carousel_item: true } : { image_url: m.url, is_carousel_item: true },
      });
      if (isVideo(m.mime)) await waitForContainer(c.id, token);
      children.push(c.id);
    }
    creationId = (await graph<{ id: string }>(`${ig}/media`, { token, method: "POST", params: { media_type: "CAROUSEL", children: children.join(","), caption } })).id;
  } else {
    const m = media[0];
    const video = isVideo(m.mime);
    const params: Record<string, string | undefined> =
      post.type === "story"
        ? { media_type: "STORIES", ...(video ? { video_url: m.url } : { image_url: m.url }) }
        : video
          ? { media_type: "REELS", video_url: m.url, caption }
          : { image_url: m.url, caption, alt_text: post.altText || undefined };
    creationId = (await graph<{ id: string }>(`${ig}/media`, { token, method: "POST", params })).id;
    if (video) await waitForContainer(creationId, token);
  }

  const published = await graph<{ id: string }>(`${ig}/media_publish`, { token, method: "POST", params: { creation_id: creationId } });
  const info = await graph<{ permalink?: string }>(published.id, { token, params: { fields: "permalink" } }).catch(() => ({ permalink: undefined }));
  if (post.firstComment.trim() && post.type !== "story") {
    await graph(`${published.id}/comments`, { token, method: "POST", params: { message: post.firstComment } }).catch(() => {});
  }
  return { externalId: published.id, url: info.permalink ?? null };
}

async function publishFacebook(acc: Account, post: Post): Promise<PublishResult> {
  const token = acc.accessToken!;
  const page = acc.externalId;
  const media = post.media;
  let id: string;

  if (media.length && isVideo(media[0].mime)) {
    id = (await graph<{ id: string }>(`${page}/videos`, { token, method: "POST", params: { file_url: media[0].url, description: post.caption } })).id;
  } else if (media.length === 1) {
    id = (await graph<{ post_id?: string; id: string }>(`${page}/photos`, { token, method: "POST", params: { url: media[0].url, caption: post.caption } })).post_id ?? "";
  } else if (media.length > 1) {
    const photos: string[] = [];
    for (const m of media.slice(0, 10)) {
      photos.push((await graph<{ id: string }>(`${page}/photos`, { token, method: "POST", params: { url: m.url, published: false } })).id);
    }
    const params: Record<string, string> = { message: post.caption };
    photos.forEach((p, i) => (params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: p })));
    id = (await graph<{ id: string }>(`${page}/feed`, { token, method: "POST", params })).id;
  } else {
    id = (await graph<{ id: string }>(`${page}/feed`, { token, method: "POST", params: { message: post.caption } })).id;
  }
  if (post.firstComment.trim() && id) {
    await graph(`${id}/comments`, { token, method: "POST", params: { message: post.firstComment } }).catch(() => {});
  }
  return { externalId: id, url: id ? `https://www.facebook.com/${id}` : null };
}

export async function publishMeta(acc: Account, post: Post): Promise<PublishResult> {
  if (!acc.accessToken) throw new MetaError("Falta el acceso de Meta. Vuelve a conectar la cuenta.");
  return acc.platform === "instagram" ? publishInstagram(acc, post) : publishFacebook(acc, post);
}

/* ───────── Métricas ───────── */

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Métricas del día anterior (o del día indicado) de una cuenta. */
export async function fetchMetaDaily(acc: Account, day = new Date(Date.now() - 86_400_000)): Promise<MetricRow[]> {
  const token = acc.accessToken!;
  const date = ymd(day);
  const since = Math.floor(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) / 1000);
  const until = since + 86_400;
  const rows: MetricRow[] = [];
  const push = (metric: MetricRow["metric"], value: unknown) => {
    if (typeof value === "number") rows.push({ platform: acc.platform, date, metric, value });
  };

  if (acc.platform === "instagram") {
    const profile = await graph<{ followers_count?: number }>(acc.externalId, { token, params: { fields: "followers_count" } });
    push("followers", profile.followers_count);
    const ins = await graph<{ data: { name: string; total_value?: { value: number } }[] }>(`${acc.externalId}/insights`, {
      token,
      params: { metric: "reach,total_interactions,profile_views", period: "day", metric_type: "total_value", since, until },
    });
    for (const m of ins.data) {
      const map = { reach: "reach", total_interactions: "interactions", profile_views: "profile_views" } as const;
      const key = map[m.name as keyof typeof map];
      if (key) push(key, m.total_value?.value);
    }
  } else {
    const page = await graph<{ followers_count?: number; fan_count?: number }>(acc.externalId, { token, params: { fields: "followers_count,fan_count" } });
    push("followers", page.followers_count ?? page.fan_count);
    const ins = await graph<{ data: { name: string; values: { value: number }[] }[] }>(`${acc.externalId}/insights`, {
      token,
      params: { metric: "page_impressions_unique,page_post_engagements", period: "day", since, until },
    });
    for (const m of ins.data) {
      const v = m.values.at(-1)?.value;
      if (m.name === "page_impressions_unique") push("reach", v);
      if (m.name === "page_post_engagements") push("interactions", v);
    }
  }
  return rows;
}

/** Edades y ciudades de los seguidores de Instagram (cuentas con 100+ seguidores). */
export async function fetchMetaAudience(acc: Account) {
  if (acc.platform !== "instagram") return null;
  const token = acc.accessToken!;
  const breakdown = async (by: "age" | "city") => {
    const res = await graph<{ data: { total_value?: { breakdowns?: { results?: { dimension_values: string[]; value: number }[] }[] } }[] }>(
      `${acc.externalId}/insights`,
      { token, params: { metric: "follower_demographics", period: "lifetime", metric_type: "total_value", breakdown: by } },
    );
    const results = res.data[0]?.total_value?.breakdowns?.[0]?.results ?? [];
    return results
      .map((r) => ({ label: r.dimension_values[0].split(",")[0], value: r.value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };
  return { ages: (await breakdown("age")).sort((a, b) => a.label.localeCompare(b.label)), cities: await breakdown("city") };
}

export async function fetchMetaPostMetrics(acc: Account, externalId: string): Promise<PostMetrics | null> {
  const token = acc.accessToken!;
  if (acc.platform === "instagram") {
    const ins = await graph<{ data: { name: string; values: { value: number }[] }[] }>(`${externalId}/insights`, {
      token,
      params: { metric: "reach,likes,comments,shares,saved" },
    });
    const v = (n: string) => ins.data.find((d) => d.name === n)?.values[0]?.value ?? 0;
    return { reach: v("reach"), likes: v("likes"), comments: v("comments"), shares: v("shares"), saves: v("saved") };
  }
  const p = await graph<{ likes?: { summary?: { total_count: number } }; comments?: { summary?: { total_count: number } }; shares?: { count: number } }>(externalId, {
    token,
    params: { fields: "likes.summary(true).limit(0),comments.summary(true).limit(0),shares" },
  });
  const reach = await graph<{ data: { values: { value: number }[] }[] }>(`${externalId}/insights`, { token, params: { metric: "post_impressions_unique" } })
    .then((r) => r.data[0]?.values[0]?.value ?? 0)
    .catch(() => 0);
  return { reach, likes: p.likes?.summary?.total_count ?? 0, comments: p.comments?.summary?.total_count ?? 0, shares: p.shares?.count ?? 0, saves: 0 };
}

/** Comentarios recientes de una publicación (respaldo si los webhooks no llegan). */
export async function fetchMetaComments(acc: Account, clientId: string, externalId: string, postRef: string): Promise<Omit<InboxItem, "id" | "reply" | "repliedBy" | "repliedAt">[]> {
  const token = acc.accessToken!;
  if (acc.platform === "instagram") {
    const res = await graph<{ data: { id: string; text: string; username?: string; timestamp: string }[] }>(`${externalId}/comments`, {
      token,
      params: { fields: "id,text,username,timestamp", limit: 50 },
    });
    return res.data.map((c) => ({ clientId, platform: "instagram", kind: "comment", externalId: c.id, replyTo: c.id, author: c.username ?? "Instagram", text: c.text, stars: null, postRef, receivedAt: c.timestamp }));
  }
  const res = await graph<{ data: { id: string; message: string; from?: { name: string }; created_time: string }[] }>(`${externalId}/comments`, {
    token,
    params: { fields: "id,message,from,created_time", limit: 50 },
  });
  return res.data.map((c) => ({ clientId, platform: "facebook", kind: "comment", externalId: c.id, replyTo: c.id, author: c.from?.name ?? "Facebook", text: c.message, stars: null, postRef, receivedAt: c.created_time }));
}

/** Responder un comentario o un mensaje directo (DM: solo dentro de 24 h del último mensaje). */
export async function replyMeta(acc: Account, item: Pick<InboxItem, "kind" | "replyTo">, text: string) {
  const token = acc.accessToken!;
  if (item.kind === "dm") {
    await graph("me/messages", {
      token,
      method: "POST",
      params: { recipient: JSON.stringify({ id: item.replyTo }), message: JSON.stringify({ text }), messaging_type: "RESPONSE" },
    });
    return;
  }
  await graph(acc.platform === "instagram" ? `${item.replyTo}/replies` : `${item.replyTo}/comments`, { token, method: "POST", params: { message: text } });
}

/* ───────── Webhooks ───────── */

export function verifyMetaSignature(rawBody: string, header: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const given = header.slice(7);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export type WebhookEvent = {
  platform: "instagram" | "facebook";
  accountExternalId: string;
  kind: "comment" | "dm";
  externalId: string;
  replyTo: string;
  author: string;
  text: string;
  postRef: string | null;
  receivedAt: string;
};

type WebhookBody = {
  object?: string;
  entry?: {
    id: string;
    time?: number;
    changes?: { field: string; value: Record<string, unknown> }[];
    messaging?: { sender?: { id: string }; recipient?: { id: string }; timestamp?: number; message?: { mid?: string; text?: string; is_echo?: boolean } }[];
  }[];
};

/** Convierte el cuerpo de un webhook de Meta en mensajes para la bandeja. Ignora lo que no es comentario ni DM entrante. */
export function parseMetaWebhook(body: WebhookBody): WebhookEvent[] {
  const platform = body.object === "instagram" ? "instagram" : body.object === "page" ? "facebook" : null;
  if (!platform) return [];
  const out: WebhookEvent[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      if (platform === "instagram" && change.field === "comments") {
        const from = v.from as { id?: string; username?: string } | undefined;
        if (from?.id === entry.id) continue; // nuestro propio comentario
        out.push({
          platform,
          accountExternalId: entry.id,
          kind: "comment",
          externalId: String(v.id),
          replyTo: String(v.id),
          author: from?.username ?? "Instagram",
          text: String(v.text ?? ""),
          postRef: (v.media as { id?: string } | undefined)?.id ?? null,
          receivedAt: new Date((entry.time ?? Date.now() / 1000) * 1000).toISOString(),
        });
      }
      if (platform === "facebook" && change.field === "feed" && v.item === "comment" && v.verb === "add") {
        const from = v.from as { id?: string; name?: string } | undefined;
        if (from?.id === entry.id) continue;
        out.push({
          platform,
          accountExternalId: entry.id,
          kind: "comment",
          externalId: String(v.comment_id),
          replyTo: String(v.comment_id),
          author: from?.name ?? "Facebook",
          text: String(v.message ?? ""),
          postRef: v.post_id ? String(v.post_id) : null,
          receivedAt: v.created_time ? new Date(Number(v.created_time) * 1000).toISOString() : new Date().toISOString(),
        });
      }
    }
    for (const m of entry.messaging ?? []) {
      if (!m.message?.text || m.message.is_echo || !m.sender?.id || !m.message.mid) continue;
      out.push({
        platform,
        accountExternalId: entry.id,
        kind: "dm",
        externalId: m.message.mid,
        replyTo: m.sender.id,
        author: platform === "instagram" ? "Mensaje de Instagram" : "Mensaje de Messenger",
        text: m.message.text,
        postRef: null,
        receivedAt: new Date(m.timestamp ?? Date.now()).toISOString(),
      });
    }
  }
  return out;
}
