import "server-only";
import { randomUUID } from "node:crypto";
import type { Network } from "@/lib/design/tokens";
import { isLocalMode } from "@/lib/env";
import { contentKey } from "@/lib/social/approval";
import type { Approval, Post, PostInput, PostMetrics, PostStatus, PostTarget, TargetStatus } from "@/lib/social/schema";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";
import { localTable } from "./local-store";

const postsT = localTable<Post>("posts");
const approvalsT = localTable<Approval>("approvals");

type TargetRow = {
  post_id: string;
  platform: Network;
  status: TargetStatus;
  external_id: string | null;
  url: string | null;
  error: string | null;
  published_at: string | null;
  metrics: PostMetrics | null;
};

type PostRow = {
  id: string;
  client_id: string;
  type: Post["type"];
  caption: string;
  first_comment: string;
  alt_text: string;
  media: Post["media"];
  platforms: Network[];
  scheduled_at: string | null;
  status: PostStatus;
  version: number;
  feedback: string | null;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  post_targets?: TargetRow[];
};

const targetFromRow = (t: TargetRow): PostTarget => ({
  platform: t.platform,
  status: t.status,
  externalId: t.external_id,
  url: t.url,
  error: t.error,
  publishedAt: t.published_at,
  metrics: t.metrics,
});

const fromRow = (r: PostRow): Post => ({
  id: r.id,
  clientId: r.client_id,
  type: r.type,
  caption: r.caption,
  firstComment: r.first_comment,
  altText: r.alt_text,
  media: r.media,
  platforms: r.platforms,
  scheduledAt: r.scheduled_at,
  status: r.status,
  version: r.version,
  feedback: r.feedback,
  createdBy: r.created_by ?? "",
  createdByName: r.created_by_name,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  targets: (r.post_targets ?? []).map(targetFromRow),
});

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "error desconocido"}`);
}

const blankTarget = (platform: Network): PostTarget => ({
  platform,
  status: "scheduled",
  externalId: null,
  url: null,
  error: null,
  publishedAt: null,
  metrics: null,
});

/** Publicaciones del cliente con su estado por red. `hideDrafts` para lo que ve el cliente. */
export async function listPosts(clientId: string, opts: { hideDrafts?: boolean } = {}): Promise<Post[]> {
  let rows: Post[];
  if (isLocalMode()) {
    rows = (await postsT.all()).filter((p) => p.clientId === clientId);
  } else {
    const { data, error } = await (await createSessionClient())
      .from("posts")
      .select("*, post_targets(*)")
      .eq("client_id", clientId)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(1000);
    if (error) fail("No se pudieron leer las publicaciones", error);
    rows = (data as PostRow[]).map(fromRow);
  }
  return opts.hideDrafts ? rows.filter((p) => p.status !== "draft") : rows;
}

export async function getPost(id: string, { admin = false } = {}): Promise<Post | null> {
  if (isLocalMode()) return (await postsT.find((p) => p.id === id)) ?? null;
  const db = admin ? createAdminClient() : await createSessionClient();
  const { data, error } = await db.from("posts").select("*, post_targets(*)").eq("id", id).maybeSingle();
  if (error) fail("No se pudo leer la publicación", error);
  return data ? fromRow(data as PostRow) : null;
}

export async function createPost(clientId: string, input: PostInput, status: PostStatus, by: { id: string; name: string }): Promise<Post> {
  const now = new Date().toISOString();
  if (isLocalMode()) {
    const post: Post = {
      id: randomUUID(),
      clientId,
      ...input,
      status,
      version: 1,
      feedback: null,
      createdBy: by.id,
      createdByName: by.name,
      createdAt: now,
      updatedAt: now,
      targets: input.platforms.map(blankTarget),
    };
    return postsT.insert(post);
  }
  const db = await createSessionClient();
  const { data, error } = await db
    .from("posts")
    .insert({
      client_id: clientId,
      type: input.type,
      caption: input.caption,
      first_comment: input.firstComment,
      alt_text: input.altText,
      media: input.media,
      platforms: input.platforms,
      scheduled_at: input.scheduledAt,
      status,
      created_by: by.id,
      created_by_name: by.name,
    })
    .select("*")
    .single();
  if (error) fail("No se pudo crear la publicación", error);
  const { error: tErr } = await db.from("post_targets").insert(input.platforms.map((platform) => ({ post_id: data.id, platform, status: "scheduled" })));
  if (tErr) fail("No se pudieron crear los destinos", tErr);
  return (await getPost(data.id))!;
}

/** Edita el contenido. Si ya había pasado por aprobación, sube la versión. */
export async function updatePost(id: string, input: PostInput, status: PostStatus): Promise<Post> {
  const current = await getPost(id);
  if (!current) throw new Error("Esa publicación no existe.");
  // Si el cliente ya vio esta pieza y cambia el contenido, es una versión nueva.
  const bump = ["pending", "changes", "approved", "scheduled"].includes(current.status) && contentKey(current) !== contentKey(input);
  const version = current.version + (bump ? 1 : 0);
  const keep = current.targets.filter((t) => input.platforms.includes(t.platform));
  const targets = input.platforms.map((p) => {
    const t = keep.find((k) => k.platform === p);
    return t && t.status === "published" ? t : blankTarget(p);
  });
  if (isLocalMode()) {
    await postsT.update(id, { ...input, status, version, feedback: status === "changes" ? current.feedback : null, targets, updatedAt: new Date().toISOString() });
    return (await getPost(id))!;
  }
  const db = await createSessionClient();
  const { error } = await db
    .from("posts")
    .update({
      type: input.type,
      caption: input.caption,
      first_comment: input.firstComment,
      alt_text: input.altText,
      media: input.media,
      platforms: input.platforms,
      scheduled_at: input.scheduledAt,
      status,
      version,
      feedback: status === "changes" ? current.feedback : null,
    })
    .eq("id", id);
  if (error) fail("No se pudo guardar la publicación", error);
  await db.from("post_targets").delete().eq("post_id", id).neq("status", "published");
  const toInsert = targets.filter((t) => t.status !== "published").map((t) => ({ post_id: id, platform: t.platform, status: "scheduled" }));
  if (toInsert.length) {
    const { error: tErr } = await db.from("post_targets").upsert(toInsert, { onConflict: "post_id,platform" });
    if (tErr) fail("No se pudieron guardar los destinos", tErr);
  }
  return (await getPost(id))!;
}

/** Una reserva vieja (la ejecución se cayó a mitad) se puede tomar de nuevo después de este tiempo. */
const PUBLISH_LOCK_MS = 15 * 60_000;

/**
 * Reserva la pieza para publicarla. Solo una ejecución a la vez la gana (cron, "Publicar ahora" o "Reintentar"),
 * con un update condicional en la base de datos. Devuelve false si otra ya la tiene.
 */
export async function claimForPublish(id: string): Promise<boolean> {
  const now = new Date();
  const stale = new Date(now.getTime() - PUBLISH_LOCK_MS).toISOString();
  if (isLocalMode()) {
    const post = (await postsT.find((p) => p.id === id)) as (Post & { publishingAt?: string | null }) | undefined;
    if (!post || !["scheduled", "failed"].includes(post.status) || (post.publishingAt && post.publishingAt > stale)) return false;
    await postsT.update(id, { publishingAt: now.toISOString() } as Partial<Post>);
    return true;
  }
  const { data, error } = await createAdminClient()
    .from("posts")
    .update({ publishing_at: now.toISOString() })
    .eq("id", id)
    .in("status", ["scheduled", "failed"])
    .or(`publishing_at.is.null,publishing_at.lt.${stale}`)
    .select("id");
  if (error) {
    // Sin la migración de la reserva todavía aplicada: se publica como antes en vez de no publicar.
    if (/publishing_at/.test(error.message)) {
      console.error("[claimForPublish] falta la columna publishing_at; aplica la migración 20260929000000", error.message);
      return true;
    }
    fail("No se pudo reservar la publicación", error);
  }
  return (data ?? []).length > 0;
}

export async function releasePublish(id: string) {
  if (isLocalMode()) {
    await postsT.update(id, { publishingAt: null } as Partial<Post>);
    return;
  }
  await createAdminClient().from("posts").update({ publishing_at: null }).eq("id", id);
}

export async function setPostStatus(id: string, status: PostStatus, { admin = false } = {}) {
  if (isLocalMode()) {
    await postsT.update(id, { status, updatedAt: new Date().toISOString() });
    return;
  }
  const db = admin ? createAdminClient() : await createSessionClient();
  const { error } = await db.from("posts").update({ status }).eq("id", id);
  if (error) fail("No se pudo actualizar la publicación", error);
}

export async function deletePost(id: string) {
  if (isLocalMode()) {
    await postsT.remove(id);
    return;
  }
  const { error } = await (await createSessionClient()).from("posts").delete().eq("id", id);
  if (error) fail("No se pudo borrar la publicación", error);
}

/* ───────── aprobaciones ───────── */

export async function listApprovals(postId: string): Promise<Approval[]> {
  if (isLocalMode()) return (await approvalsT.all()).filter((a) => a.postId === postId).sort((a, b) => b.at.localeCompare(a.at));
  const { data, error } = await (await createSessionClient())
    .from("approvals")
    .select("*")
    .eq("post_id", postId)
    .order("at", { ascending: false });
  if (error) fail("No se pudo leer el historial", error);
  return data.map((r) => ({ id: r.id, postId: r.post_id, version: r.version, action: r.action, comment: r.comment, byName: r.by_name, byUserId: r.by_user ?? "", at: r.at }));
}

export async function addApproval(a: Omit<Approval, "id" | "at">) {
  if (isLocalMode()) {
    await approvalsT.insert({ ...a, id: randomUUID(), at: new Date().toISOString() });
    return;
  }
  const { error } = await (await createSessionClient())
    .from("approvals")
    .insert({ post_id: a.postId, version: a.version, action: a.action, comment: a.comment, by_user: a.byUserId || null, by_name: a.byName });
  if (error) fail("No se pudo registrar", error);
}

/**
 * Aprobar o pedir cambios (Administrador o Aprobador del cliente). En Supabase lo decide review_post (RLS).
 * Devuelve el nuevo estado.
 */
export async function reviewPost(postId: string, action: "approve" | "changes", comment: string, by: { id: string; name: string }): Promise<PostStatus> {
  if (isLocalMode()) {
    const post = await postsT.find((p) => p.id === postId);
    if (!post || !["pending", "changes"].includes(post.status)) throw new Error("Esta pieza ya no está por aprobar.");
    if (action === "changes" && !comment.trim()) throw new Error("Cuéntanos qué hay que cambiar.");
    const next: PostStatus = action === "changes" ? "changes" : post.scheduledAt ? "scheduled" : "approved";
    await postsT.update(postId, {
      status: next,
      feedback: action === "changes" ? comment : null,
      targets: next === "scheduled" ? post.targets.map((t) => (t.status === "published" ? t : { ...t, status: "scheduled", error: null })) : post.targets,
      updatedAt: new Date().toISOString(),
    });
    await approvalsT.insert({ id: randomUUID(), postId, version: post.version, action, comment, byName: by.name, byUserId: by.id, at: new Date().toISOString() });
    return next;
  }
  const { data, error } = await (await createSessionClient()).rpc("review_post", {
    p_post_id: postId,
    p_action: action,
    p_comment: comment,
    p_by_name: by.name,
  });
  if (error) {
    if (/not pending/.test(error.message)) throw new Error("Esta pieza ya no está por aprobar.");
    if (/comment required/.test(error.message)) throw new Error("Cuéntanos qué hay que cambiar.");
    if (/not allowed/.test(error.message)) throw new Error("Tu rol no puede aprobar publicaciones.");
    fail("No se pudo registrar tu respuesta", error);
  }
  return data as PostStatus;
}

/* ───────── para los jobs (clave secreta) ───────── */

/** Publicaciones programadas cuya hora ya llegó. */
export async function duePosts(now = new Date()): Promise<Post[]> {
  if (isLocalMode()) {
    return (await postsT.all()).filter((p) => p.status === "scheduled" && p.scheduledAt && p.scheduledAt <= now.toISOString());
  }
  const { data, error } = await createAdminClient()
    .from("posts")
    .select("*, post_targets(*)")
    .eq("status", "scheduled")
    .lte("scheduled_at", now.toISOString())
    .limit(50);
  if (error) fail("No se pudieron leer las publicaciones pendientes", error);
  return (data as PostRow[]).map(fromRow);
}

export async function updateTarget(postId: string, platform: Network, patch: Partial<PostTarget>) {
  if (isLocalMode()) {
    const post = await postsT.find((p) => p.id === postId);
    if (!post) return;
    await postsT.update(postId, { targets: post.targets.map((t) => (t.platform === platform ? { ...t, ...patch } : t)) });
    return;
  }
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.externalId !== undefined) row.external_id = patch.externalId;
  if (patch.url !== undefined) row.url = patch.url;
  if (patch.error !== undefined) row.error = patch.error;
  if (patch.publishedAt !== undefined) row.published_at = patch.publishedAt;
  if (patch.metrics !== undefined) row.metrics = patch.metrics;
  const { error } = await createAdminClient().from("post_targets").update(row).eq("post_id", postId).eq("platform", platform);
  if (error) fail("No se pudo actualizar el destino", error);
}

/** Publicaciones ya publicadas de los últimos días (para traer sus métricas y comentarios). */
export async function recentPublished(days = 30): Promise<Post[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  if (isLocalMode()) return (await postsT.all()).filter((p) => p.status === "published" && (p.scheduledAt ?? p.createdAt) >= since);
  const { data, error } = await createAdminClient()
    .from("posts")
    .select("*, post_targets(*)")
    .in("status", ["published", "failed"])
    .gte("scheduled_at", since)
    .limit(500);
  if (error) fail("No se pudieron leer las publicaciones", error);
  return (data as PostRow[]).map(fromRow);
}

/** Guarda una publicación completa sin sesión (datos de demostración). */
export async function insertPostAdmin(post: Post) {
  if (isLocalMode()) {
    await postsT.insert(post);
    return;
  }
  const db = createAdminClient();
  const { error } = await db.from("posts").insert({
    id: post.id,
    client_id: post.clientId,
    type: post.type,
    caption: post.caption,
    first_comment: post.firstComment,
    alt_text: post.altText,
    media: post.media,
    platforms: post.platforms,
    scheduled_at: post.scheduledAt,
    status: post.status,
    version: post.version,
    feedback: post.feedback,
    created_by_name: post.createdByName,
    created_at: post.createdAt,
  });
  if (error) fail("No se pudo guardar la publicación", error);
  if (!post.targets.length) return;
  const { error: targetsError } = await db.from("post_targets").insert(
    post.targets.map((t) => ({
      post_id: post.id,
      platform: t.platform,
      status: t.status,
      external_id: t.externalId,
      error: t.error,
      published_at: t.publishedAt,
      metrics: t.metrics,
    })),
  );
  if (targetsError) fail("No se pudieron guardar los destinos", targetsError);
}
