import "server-only";
import { randomUUID } from "node:crypto";
import type { Network } from "@/lib/design/tokens";
import { isLocalMode } from "@/lib/env";
import type { Audience, ClientNote, InboxItem, MetricRow } from "@/lib/social/schema";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";
import { localTable, writeJson } from "./local-store";

type LocalMetric = MetricRow & { id: string; clientId: string };
const metricsT = localTable<LocalMetric>("metrics");
const audienceT = localTable<Audience & { id: string; clientId: string }>("audience");
const inboxT = localTable<InboxItem>("inbox");
const notesT = localTable<ClientNote>("client-notes");

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "error desconocido"}`);
}

/* ───────── métricas ───────── */

export async function listMetrics(clientId: string, sinceDate: string): Promise<MetricRow[]> {
  if (isLocalMode()) {
    return (await metricsT.all())
      .filter((m) => m.clientId === clientId && m.date >= sinceDate)
      .map(({ platform, date, metric, value }) => ({ platform, date, metric, value }));
  }
  const { data, error } = await (await createSessionClient())
    .from("metrics_daily")
    .select("platform, date, metric, value")
    .eq("client_id", clientId)
    .gte("date", sinceDate)
    .order("date")
    .limit(10000);
  if (error) fail("No se pudieron leer las métricas", error);
  return data.map((r) => ({ platform: r.platform, date: r.date, metric: r.metric, value: Number(r.value) }));
}

/** Guarda o reemplaza métricas diarias (jobs y demo). */
export async function upsertMetrics(clientId: string, rows: MetricRow[]) {
  if (!rows.length) return;
  if (isLocalMode()) {
    const all = await metricsT.all();
    const key = (m: MetricRow) => `${m.platform}|${m.date}|${m.metric}`;
    const incoming = new Map(rows.map((r) => [key(r), r]));
    const kept = all.filter((m) => !(m.clientId === clientId && incoming.has(key(m))));
    await writeJson("metrics", [...kept, ...rows.map((r) => ({ ...r, id: randomUUID(), clientId }))]);
    return;
  }
  const { error } = await createAdminClient()
    .from("metrics_daily")
    .upsert(rows.map((r) => ({ client_id: clientId, ...r })), { onConflict: "client_id,platform,date,metric" });
  if (error) fail("No se pudieron guardar las métricas", error);
}

export async function listAudience(clientId: string): Promise<Audience[]> {
  if (isLocalMode()) return (await audienceT.all()).filter((a) => a.clientId === clientId).map(({ platform, ages, cities, updatedAt }) => ({ platform, ages, cities, updatedAt }));
  const { data, error } = await (await createSessionClient()).from("audience").select("*").eq("client_id", clientId);
  if (error) fail("No se pudo leer la audiencia", error);
  return data.map((r) => ({ platform: r.platform, ages: r.ages, cities: r.cities, updatedAt: r.updated_at }));
}

export async function upsertAudience(clientId: string, a: Omit<Audience, "updatedAt">) {
  const updatedAt = new Date().toISOString();
  if (isLocalMode()) {
    const existing = await audienceT.find((x) => x.clientId === clientId && x.platform === a.platform);
    if (existing) await audienceT.update(existing.id, { ...a, updatedAt });
    else await audienceT.insert({ ...a, id: randomUUID(), clientId, updatedAt });
    return;
  }
  const { error } = await createAdminClient().from("audience").upsert({ client_id: clientId, platform: a.platform, ages: a.ages, cities: a.cities, updated_at: updatedAt });
  if (error) fail("No se pudo guardar la audiencia", error);
}

/* ───────── bandeja ───────── */

type InboxRow = {
  id: string;
  client_id: string;
  platform: Network;
  kind: InboxItem["kind"];
  external_id: string;
  reply_to: string;
  author: string;
  text: string;
  stars: number | null;
  post_ref: string | null;
  received_at: string;
  reply: string | null;
  replied_by: string | null;
  replied_at: string | null;
};

const inboxFromRow = (r: InboxRow): InboxItem => ({
  id: r.id,
  clientId: r.client_id,
  platform: r.platform,
  kind: r.kind,
  externalId: r.external_id,
  replyTo: r.reply_to,
  author: r.author,
  text: r.text,
  stars: r.stars,
  postRef: r.post_ref,
  receivedAt: r.received_at,
  reply: r.reply,
  repliedBy: r.replied_by,
  repliedAt: r.replied_at,
});

export async function listInbox(clientId: string, opts: { reviewsOnly?: boolean } = {}): Promise<InboxItem[]> {
  let items: InboxItem[];
  if (isLocalMode()) {
    items = (await inboxT.all()).filter((i) => i.clientId === clientId);
  } else {
    const { data, error } = await (await createSessionClient())
      .from("inbox_items")
      .select("*")
      .eq("client_id", clientId)
      .order("received_at", { ascending: false })
      .limit(300);
    if (error) fail("No se pudo leer la bandeja", error);
    items = (data as InboxRow[]).map(inboxFromRow);
  }
  items.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  return opts.reviewsOnly ? items.filter((i) => i.kind === "review") : items;
}

export async function getInboxItem(id: string): Promise<InboxItem | null> {
  if (isLocalMode()) return (await inboxT.find((i) => i.id === id)) ?? null;
  const { data } = await (await createSessionClient()).from("inbox_items").select("*").eq("id", id).maybeSingle();
  return data ? inboxFromRow(data as InboxRow) : null;
}

/** Guarda mensajes nuevos (webhooks y sincronización). Ignora los que ya existen. */
export async function insertInbox(items: Omit<InboxItem, "id" | "reply" | "repliedBy" | "repliedAt">[]) {
  if (!items.length) return 0;
  if (isLocalMode()) {
    const all = await inboxT.all();
    let n = 0;
    for (const it of items) {
      if (all.some((x) => x.platform === it.platform && x.externalId === it.externalId)) continue;
      await inboxT.insert({ ...it, id: randomUUID(), reply: null, repliedBy: null, repliedAt: null });
      n++;
    }
    return n;
  }
  const { data, error } = await createAdminClient()
    .from("inbox_items")
    .upsert(
      items.map((i) => ({
        client_id: i.clientId,
        platform: i.platform,
        kind: i.kind,
        external_id: i.externalId,
        reply_to: i.replyTo,
        author: i.author,
        text: i.text,
        stars: i.stars,
        post_ref: i.postRef,
        received_at: i.receivedAt,
      })),
      { onConflict: "platform,external_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) fail("No se pudo guardar la bandeja", error);
  return data?.length ?? 0;
}

export async function markReplied(id: string, reply: string, by: string) {
  const repliedAt = new Date().toISOString();
  if (isLocalMode()) {
    await inboxT.update(id, { reply, repliedBy: by, repliedAt });
    return;
  }
  const { error } = await (await createSessionClient()).from("inbox_items").update({ reply, replied_by: by, replied_at: repliedAt }).eq("id", id);
  if (error) fail("No se pudo guardar la respuesta", error);
}

/* ───────── notas del CM al cliente ───────── */

export async function listClientNotes(clientId: string): Promise<ClientNote[]> {
  if (isLocalMode()) return (await notesT.all()).filter((n) => n.clientId === clientId).sort((a, b) => b.at.localeCompare(a.at));
  const { data, error } = await (await createSessionClient())
    .from("client_notes")
    .select("id, client_id, text, by_name, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) fail("No se pudieron leer las novedades", error);
  return data.map((r) => ({ id: r.id, clientId: r.client_id, text: r.text, byName: r.by_name, at: r.created_at }));
}

export async function addClientNote(clientId: string, text: string, by: { id: string; name: string }) {
  if (isLocalMode()) {
    await notesT.insert({ id: randomUUID(), clientId, text, byName: by.name, at: new Date().toISOString() });
    return;
  }
  const { error } = await (await createSessionClient()).from("client_notes").insert({ client_id: clientId, text, by_user: by.id, by_name: by.name });
  if (error) fail("No se pudo publicar la nota", error);
}

export async function deleteClientNote(id: string) {
  if (isLocalMode()) {
    await notesT.remove(id);
    return;
  }
  const { error } = await (await createSessionClient()).from("client_notes").delete().eq("id", id);
  if (error) fail("No se pudo borrar la nota", error);
}

/** Métricas sin sesión (jobs). */
export async function listMetricsAdmin(clientId: string, sinceDate: string): Promise<MetricRow[]> {
  if (isLocalMode()) return listMetrics(clientId, sinceDate);
  const { data, error } = await createAdminClient()
    .from("metrics_daily")
    .select("platform, date, metric, value")
    .eq("client_id", clientId)
    .gte("date", sinceDate)
    .limit(10000);
  if (error) fail("No se pudieron leer las métricas", error);
  return data.map((r) => ({ platform: r.platform, date: r.date, metric: r.metric, value: Number(r.value) }));
}
