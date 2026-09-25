"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, requireTeam } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { createUploadTicket, type UploadTicket } from "@/lib/data/media";
import * as posts from "@/lib/data/posts";
import { notifyApprovalRequested, notifyReviewed } from "@/lib/notify";
import { publishPost } from "@/lib/social/engine";
import { approvalBlocker } from "@/lib/social/approval";
import { postInputSchema, type PostStatus } from "@/lib/social/schema";
import { validatePost, type Intent } from "@/lib/social/validate";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const id = z.string().min(1).max(64);
const intents = z.enum(["draft", "approval", "schedule", "now"]);

const statusFor: Record<Intent, PostStatus> = { draft: "draft", approval: "pending", schedule: "scheduled", now: "scheduled" };

function refresh(clientId: string) {
  revalidatePath(`/app/c/${clientId}`, "layout");
}

/** Crear o editar una publicación (solo equipo). "now" la publica en el momento. */
export async function savePostAction(clientId: string, postId: string | null, input: unknown, intent: Intent): Promise<Result<{ id: string; status: PostStatus }>> {
  const user = await requireTeam();
  const client = id.safeParse(clientId).success ? await getClient(clientId) : null;
  if (!client || !intents.safeParse(intent).success) return { ok: false, error: "Solicitud no válida." };
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = { ...parsed.data, scheduledAt: intent === "now" ? new Date().toISOString() : parsed.data.scheduledAt };
  if (data.platforms.some((p) => !client.platforms.includes(p))) return { ok: false, error: "Este cliente no maneja una de esas redes." };
  const problem = validatePost(data, intent);
  if (problem) return { ok: false, error: problem };

  let post;
  if (postId) {
    const current = await posts.getPost(postId);
    if (!current || current.clientId !== clientId) return { ok: false, error: "Esa publicación no existe." };
    if (current.status === "published") return { ok: false, error: "Ya se publicó: no se puede editar. Duplícala para hacer otra." };
    // Lo que el cliente no aprobó no se programa ni se publica.
    const blocker = approvalBlocker({ intent, post: current, next: data, approvals: await posts.listApprovals(postId) });
    if (blocker) return { ok: false, error: blocker };
    post = await posts.updatePost(postId, data, statusFor[intent]);
  } else {
    post = await posts.createPost(clientId, data, statusFor[intent], user);
  }

  if (intent === "approval") {
    await posts.addApproval({ postId: post.id, version: post.version, action: "submit", comment: "", byName: user.name, byUserId: user.id });
    await notifyApprovalRequested(post, client.name).catch(() => {});
  }
  let status = post.status;
  if (intent === "now") status = await publishPost(post);
  refresh(clientId);
  return { ok: true, id: post.id, status };
}

export async function deletePostAction(postId: string): Promise<Result> {
  await requireTeam();
  const post = id.safeParse(postId).success ? await posts.getPost(postId) : null;
  if (!post) return { ok: false, error: "Esa publicación no existe." };
  if (post.status === "published") return { ok: false, error: "Ya se publicó en las redes; bórrala desde cada red." };
  await posts.deletePost(postId);
  refresh(post.clientId);
  return { ok: true };
}

/** Reintenta las redes que fallaron (equipo). */
export async function retryPostAction(postId: string): Promise<Result<{ status: PostStatus }>> {
  await requireTeam();
  const post = id.safeParse(postId).success ? await posts.getPost(postId) : null;
  if (!post || post.status !== "failed") return { ok: false, error: "No hay nada que reintentar." };
  for (const t of post.targets) if (t.status === "failed") await posts.updateTarget(post.id, t.platform, { status: "scheduled", error: null });
  const status = await publishPost((await posts.getPost(postId))!);
  refresh(post.clientId);
  return { ok: true, status };
}

/** Aprobar o pedir cambios: Administrador o Aprobador del cliente. */
export async function reviewPostAction(postId: string, action: "approve" | "changes", comment: string): Promise<Result<{ status: PostStatus }>> {
  const viewer = await getViewer();
  if (!viewer || viewer.kind !== "client" || !["admin", "approver"].includes(viewer.role)) return { ok: false, error: "Tu rol no puede aprobar publicaciones." };
  const post = id.safeParse(postId).success ? await posts.getPost(postId) : null;
  if (!post || post.clientId !== viewer.clientId) return { ok: false, error: "Esa publicación no existe." };
  const text = z.string().trim().max(2000).safeParse(comment);
  if (!text.success) return { ok: false, error: "El comentario es muy largo." };
  try {
    const status = await posts.reviewPost(postId, action, text.data, viewer);
    const client = await getClient(post.clientId);
    await notifyReviewed(post, client?.name ?? "El cliente", action, viewer.name, text.data).catch(() => {});
    refresh(post.clientId);
    return { ok: true, status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo registrar tu respuesta." };
  }
}

export async function listApprovalsAction(postId: string) {
  const viewer = await getViewer();
  const post = viewer && id.safeParse(postId).success ? await posts.getPost(postId) : null;
  if (!post || (viewer!.kind === "client" && (viewer!.clientId !== post.clientId || post.status === "draft"))) return [];
  return posts.listApprovals(postId);
}

/** URL firmada para subir un archivo directo al almacenamiento (equipo). */
export async function createUploadAction(clientId: string, mime: string, size: number): Promise<Result<{ ticket: UploadTicket }>> {
  await requireTeam();
  if (!id.safeParse(clientId).success || !(await getClient(clientId))) return { ok: false, error: "Ese cliente no existe." };
  try {
    return { ok: true, ticket: await createUploadTicket(clientId, mime, size) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo preparar la subida." };
  }
}
