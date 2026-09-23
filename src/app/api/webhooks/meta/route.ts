import { insertInbox } from "@/lib/data/insights";
import { findAccountByExternalId } from "@/lib/data/social";
import { parseMetaWebhook, verifyMetaSignature } from "@/lib/integrations/meta";

/** Verificación de la suscripción (Meta llama con hub.challenge). */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const token = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (token && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === token) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

/** Comentarios y mensajes nuevos de Instagram y Facebook → Bandeja. La firma X-Hub-Signature-256 es obligatoria. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"))) return new Response("Firma no válida", { status: 401 });

  const events = parseMetaWebhook(JSON.parse(raw));
  const byAccount = new Map<string, string | null>();
  const items = [];
  for (const e of events) {
    const key = `${e.platform}:${e.accountExternalId}`;
    if (!byAccount.has(key)) byAccount.set(key, (await findAccountByExternalId(e.platform, e.accountExternalId))?.clientId ?? null);
    const clientId = byAccount.get(key);
    if (!clientId) continue;
    items.push({ clientId, platform: e.platform, kind: e.kind, externalId: e.externalId, replyTo: e.replyTo, author: e.author, text: e.text, stars: null, postRef: e.postRef, receivedAt: e.receivedAt });
  }
  await insertInbox(items);
  return Response.json({ received: events.length, stored: items.length });
}
