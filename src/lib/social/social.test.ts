import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { parseMetaWebhook, verifyMetaSignature } from "@/lib/integrations/meta";
import { bestTime, heatmap, kpis, monthUsage, topPosts } from "./analytics";
import { dmWindowOpen } from "./inbox";
import type { MetricRow, Post, PostInput } from "./schema";
import { validatePost } from "./validate";

const input = (over: Partial<PostInput> = {}): PostInput => ({
  type: "post",
  caption: "Hola",
  firstComment: "",
  altText: "",
  media: [{ id: "m1", url: "https://x.test/a.jpg", mime: "image/jpeg", name: "a.jpg" }],
  platforms: ["instagram"],
  scheduledAt: "2026-10-01T14:00:00.000Z",
  ...over,
});

describe("validatePost", () => {
  const now = new Date("2026-09-23T12:00:00Z");
  it("acepta un post completo", () => expect(validatePost(input(), "schedule", now)).toBeNull());
  it("pide al menos una red", () => expect(validatePost(input({ platforms: [] }), "draft", now)).toMatch(/red/));
  it("respeta el límite de caracteres más bajo", () => {
    expect(validatePost(input({ platforms: ["instagram", "x"], caption: "a".repeat(300) }), "draft", now)).toMatch(/X/);
  });
  it("un borrador no necesita archivo", () => expect(validatePost(input({ media: [] }), "draft", now)).toBeNull());
  it("Instagram necesita archivo para programar", () => expect(validatePost(input({ media: [] }), "schedule", now)).toMatch(/Instagram/));
  it("las historias solo en Instagram y Facebook", () => {
    expect(validatePost(input({ type: "story", platforms: ["instagram", "linkedin"] }), "approval", now)).toMatch(/historias/);
  });
  it("carrusel con 2 o más archivos", () => expect(validatePost(input({ type: "carousel" }), "approval", now)).toMatch(/carrusel/));
  it("YouTube necesita video", () => expect(validatePost(input({ platforms: ["youtube"] }), "now", now)).toMatch(/YouTube/));
  it("no programa en el pasado", () => expect(validatePost(input({ scheduledAt: "2026-09-01T00:00:00Z" }), "schedule", now)).toMatch(/pasó/));
  it("programar exige fecha", () => expect(validatePost(input({ scheduledAt: null }), "schedule", now)).toMatch(/fecha/));
});

describe("regla de 24 h de los DM", () => {
  const now = new Date("2026-09-23T12:00:00Z").getTime();
  it("abierta dentro de 24 h", () => expect(dmWindowOpen("2026-09-22T13:00:00Z", now)).toBe(true));
  it("cerrada después de 24 h", () => expect(dmWindowOpen("2026-09-22T11:00:00Z", now)).toBe(false));
});

const post = (over: Partial<Post>): Post => ({
  id: "p",
  clientId: "c",
  type: "post",
  caption: "",
  firstComment: "",
  altText: "",
  media: [],
  platforms: ["instagram"],
  scheduledAt: null,
  status: "published",
  version: 1,
  feedback: null,
  createdBy: "u",
  createdByName: "U",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  targets: [],
  ...over,
});
const withMetrics = (reach: number, likes: number) => [
  { platform: "instagram" as const, status: "published" as const, externalId: "x", url: null, error: null, publishedAt: null, metrics: { reach, likes, comments: 0, shares: 0, saves: 0 } },
];

describe("analítica", () => {
  const today = new Date("2026-09-23T16:00:00Z");

  it("KPIs: seguidores, alcance e interacción con variación", () => {
    const rows: MetricRow[] = [
      { platform: "instagram", date: "2026-08-20", metric: "followers", value: 1000 },
      { platform: "instagram", date: "2026-09-23", metric: "followers", value: 1100 },
      { platform: "instagram", date: "2026-09-10", metric: "reach", value: 5000 },
      { platform: "instagram", date: "2026-09-10", metric: "interactions", value: 250 },
      { platform: "instagram", date: "2026-08-10", metric: "reach", value: 4000 },
      { platform: "instagram", date: "2026-08-10", metric: "interactions", value: 160 },
    ];
    const k = kpis(rows, [post({ scheduledAt: "2026-09-20T12:00:00Z" }), post({ status: "scheduled" })], today);
    expect(k.followers).toBe(1100);
    expect(k.followersDelta).toBe(10);
    expect(k.reach).toBe(5000);
    expect(k.reachDelta).toBe(25);
    expect(k.engagement).toBe(5);
    expect(k.engagementDelta).toBe(1);
    expect(k.published).toBe(1);
    expect(k.scheduled).toBe(1);
  });

  it("mapa de calor y mejor hora en hora de RD", () => {
    // Martes 22 sept 2026, 6:30 p. m. en RD = 22:30 UTC
    const posts = [post({ scheduledAt: "2026-09-22T22:30:00Z", targets: withMetrics(1000, 100) }), post({ scheduledAt: "2026-09-21T14:00:00Z", targets: withMetrics(1000, 10) })];
    const h = heatmap(posts);
    expect(h.samples).toBe(2);
    expect(h.grid[1][6]).toBe(1);
    expect(bestTime(h.grid)).toBe("martes a las 6:00 p. m.");
    expect(bestTime(heatmap([]).grid)).toBeNull();
  });

  it("uso del mes cuenta publicado y programado por tipo", () => {
    const u = monthUsage(
      [
        post({ scheduledAt: "2026-09-05T12:00:00Z" }),
        post({ type: "reel", status: "scheduled", scheduledAt: "2026-09-28T12:00:00Z" }),
        post({ type: "story", scheduledAt: "2026-09-10T12:00:00Z" }),
        post({ status: "draft", scheduledAt: "2026-09-10T12:00:00Z" }),
        post({ scheduledAt: "2026-08-31T12:00:00Z" }),
        post({ scheduledAt: "2026-10-01T02:00:00Z" }), // 30 sept 10 p. m. en RD
      ],
      today,
    );
    expect(u).toEqual({ posts: 2, reels: 1, stories: 1 });
  });

  it("mejores publicaciones por alcance", () => {
    const top = topPosts([post({ id: "a", scheduledAt: "2026-09-20T12:00:00Z", targets: withMetrics(10, 1) }), post({ id: "b", scheduledAt: "2026-09-21T12:00:00Z", targets: withMetrics(99, 1) })], 4, today);
    expect(top.map((p) => p.id)).toEqual(["b", "a"]);
  });
});

describe("webhooks de Meta", () => {
  afterEach(() => {
    delete process.env.META_APP_SECRET;
  });

  it("verifica la firma X-Hub-Signature-256", () => {
    process.env.META_APP_SECRET = "secreto";
    const body = JSON.stringify({ object: "instagram" });
    const sig = `sha256=${createHmac("sha256", "secreto").update(body).digest("hex")}`;
    expect(verifyMetaSignature(body, sig)).toBe(true);
    expect(verifyMetaSignature(`${body} `, sig)).toBe(false);
    expect(verifyMetaSignature(body, null)).toBe(false);
  });

  it("convierte comentarios de Instagram e ignora los propios", () => {
    const events = parseMetaWebhook({
      object: "instagram",
      entry: [
        {
          id: "IG1",
          time: 1790000000,
          changes: [
            { field: "comments", value: { id: "c1", text: "¡Qué rico!", from: { id: "u9", username: "ana" }, media: { id: "m1" } } },
            { field: "comments", value: { id: "c2", text: "gracias", from: { id: "IG1", username: "marca" } } },
          ],
        },
      ],
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ platform: "instagram", kind: "comment", externalId: "c1", author: "ana", postRef: "m1", accountExternalId: "IG1" });
  });

  it("ignora objetos desconocidos", () => expect(parseMetaWebhook({ object: "whatsapp_business_account" })).toEqual([]));
});
