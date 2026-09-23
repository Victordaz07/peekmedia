import "server-only";
import { randomUUID } from "node:crypto";
import { insertInbox, upsertAudience, upsertMetrics } from "@/lib/data/insights";
import { insertPostAdmin, listPosts } from "@/lib/data/posts";
import { upsertAccount } from "@/lib/data/social";
import { networks, type Network } from "@/lib/design/tokens";
import type { MetricRow, Post, PostMetrics } from "@/lib/social/schema";

/**
 * Conexiones de demostración (solo modo local): permiten probar métricas, calendario, bandeja y reportes
 * sin cuentas reales. Nunca se activan con Supabase.
 */

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fecha en hora de RD, como la usa la analítica. */
const day = (offset: number) => new Date(Date.now() - 4 * 3_600_000 - offset * 86_400_000).toISOString().slice(0, 10);

export function demoHandle(clientName: string) {
  return clientName.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "").slice(0, 20) || "cliente";
}

/** Serie estable: el valor de cada día depende de cuántos días faltan para hoy, no de cuántos se piden. */
function demoMetrics(clientId: string, platform: Network, from: number, to = 1): MetricRow[] {
  const r = rng(clientId + platform);
  const base = Math.round(400 + r() * 6000);
  const growth = 2 + r() * 10;
  const rows: MetricRow[] = [];
  for (let i = from; i >= to; i--) {
    const t = 90 - i;
    const followers = Math.round(base + t * growth + Math.sin(t / 6) * base * 0.01);
    const reach = Math.round(followers * (0.25 + r() * 0.35));
    rows.push(
      { platform, date: day(i), metric: "followers", value: followers },
      { platform, date: day(i), metric: "reach", value: reach },
      { platform, date: day(i), metric: "interactions", value: Math.round(reach * (0.03 + r() * 0.05)) },
      { platform, date: day(i), metric: "profile_views", value: Math.round(reach * 0.04) },
    );
  }
  return rows;
}

const names = ["María Fernández", "José Peña", "Carla Rosario", "Luis Almonte", "Ana Jiménez", "Pedro Castillo", "Yohanna Reyes"];
const comments = ["¿Cuál es el horario del fin de semana?", "¿Precio, por favor?", "Me encantó, ¡felicidades!", "¿Dónde están ubicados exactamente?", "Excelente, los recomiendo siempre."];
const dms = ["Hola, quisiera más información.", "¿Aceptan tarjeta de crédito?", "¿Cómo hago una reserva?"];
const reviews = ["Muy buena atención, volveré.", "Todo excelente, recomendados.", "El lugar es bonito pero tardaron un poco."];
const captions = ["Conoce lo nuevo de esta semana.", "Detrás de cámaras de nuestro equipo.", "Preguntas que siempre nos hacen.", "Una promo que no te puedes perder.", "Tips rápidos para ti."];

/** Conecta una red en modo demo y llena 90 días de historia. */
export async function connectDemo(clientId: string, clientName: string, platform: Network) {
  const handle = demoHandle(clientName);
  await upsertAccount({ clientId, platform, mode: "demo", status: "connected", externalId: `demo-${platform}`, accountName: `@${handle} (demo)`, accessToken: null });
  await upsertMetrics(clientId, demoMetrics(clientId, platform, 90));
  const r = rng(clientId + platform + "extra");

  if (platform === "instagram") {
    await upsertAudience(clientId, {
      platform,
      ages: [
        { label: "18-24", value: 18 },
        { label: "25-34", value: 38 },
        { label: "35-44", value: 24 },
        { label: "45-54", value: 13 },
        { label: "55+", value: 7 },
      ],
      cities: [
        { label: "Santo Domingo", value: 54 },
        { label: "Santiago", value: 17 },
        { label: "Punta Cana", value: 9 },
        { label: "La Romana", value: 6 },
        { label: "San Pedro", value: 5 },
      ],
    });
  }

  const now = Date.now();
  const inbox =
    platform === "google"
      ? reviews.map((text, i) => ({ kind: "review" as const, text, stars: 5 - (i === 2 ? 2 : 0), i }))
      : [
          ...comments.slice(0, 3).map((text, i) => ({ kind: "comment" as const, text, stars: null, i })),
          ...(platform === "instagram" || platform === "facebook" ? dms.slice(0, 2).map((text, i) => ({ kind: "dm" as const, text, stars: null, i: i + 3 })) : []),
        ];
  await insertInbox(
    inbox.map(({ kind, text, stars, i }) => ({
      clientId,
      platform,
      kind,
      externalId: `demo-${clientId}-${platform}-${kind}-${i}`,
      replyTo: `demo-${i}`,
      author: names[Math.floor(r() * names.length)],
      text,
      stars,
      postRef: kind === "comment" ? captions[i % captions.length] : null,
      receivedAt: new Date(now - (i * 5 + 1) * 3_600_000 * r()).toISOString(),
    })),
  );

  // Algunas publicaciones ya publicadas con métricas (una sola vez por cliente).
  const existing = await listPosts(clientId);
  if (!existing.some((p) => p.createdByName === "Demo")) {
    for (let i = 0; i < 6; i++) {
      const when = new Date(now - (3 + i * 4) * 86_400_000);
      when.setUTCHours(13 + Math.floor(r() * 10), 0, 0, 0);
      const metrics: PostMetrics = {
        reach: Math.round(800 + r() * 4000),
        likes: Math.round(40 + r() * 300),
        comments: Math.round(r() * 40),
        shares: Math.round(r() * 30),
        saves: Math.round(r() * 50),
      };
      const post: Post = {
        id: randomUUID(),
        clientId,
        type: i % 3 === 0 ? "reel" : i % 3 === 1 ? "carousel" : "post",
        caption: captions[i % captions.length],
        firstComment: "",
        altText: "",
        media: [],
        platforms: [platform],
        scheduledAt: when.toISOString(),
        status: "published",
        version: 1,
        feedback: null,
        createdBy: "",
        createdByName: "Demo",
        createdAt: when.toISOString(),
        updatedAt: when.toISOString(),
        targets: [{ platform, status: "published", externalId: `demo-${i}`, url: null, error: null, publishedAt: when.toISOString(), metrics }],
      };
      await insertPostAdmin(post);
    }
  }
}

/** Métricas de hoy para una cuenta demo (sincronización diaria). */
export function demoDaily(clientId: string, platform: Network): MetricRow[] {
  return demoMetrics(clientId, platform, 0, 0);
}

export function demoPublish(platform: Network) {
  return { externalId: `demo-${randomUUID().slice(0, 8)}`, url: null, label: networks[platform].label };
}
