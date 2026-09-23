import type { Network } from "@/lib/design/tokens";
import type { MetricName, MetricRow, Post } from "./schema";

/** Todo en hora de RD (UTC−4, sin horario de verano). */
const RD_OFFSET = 4 * 3_600_000;
export const rdDate = (iso: string) => new Date(new Date(iso).getTime() - RD_OFFSET);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
export const daysAgo = (n: number, today = new Date()) => ymd(new Date(today.getTime() - RD_OFFSET - n * 86_400_000));

function sumBetween(rows: MetricRow[], metric: MetricName, from: string, to: string, platform?: Network) {
  return rows.filter((r) => r.metric === metric && r.date > from && r.date <= to && (!platform || r.platform === platform)).reduce((s, r) => s + r.value, 0);
}

/** Último valor conocido de una métrica acumulada (seguidores) en o antes de una fecha. */
function lastValue(rows: MetricRow[], metric: MetricName, platform: Network, onOrBefore: string) {
  let best: MetricRow | undefined;
  for (const r of rows) if (r.metric === metric && r.platform === platform && r.date <= onOrBefore && (!best || r.date > best.date)) best = r;
  return best?.value ?? null;
}

export const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : 0);

export function platformsIn(rows: MetricRow[]) {
  return [...new Set(rows.map((r) => r.platform))];
}

export type Kpis = {
  followers: number;
  followersDelta: number;
  reach: number;
  reachDelta: number;
  interactions: number;
  engagement: number;
  engagementDelta: number;
  published: number;
  scheduled: number;
  lastUpdate: string | null;
};

export function kpis(rows: MetricRow[], posts: Post[], today = new Date()): Kpis {
  const t = daysAgo(0, today);
  const d30 = daysAgo(30, today);
  const d60 = daysAgo(60, today);
  let followers = 0;
  let before = 0;
  for (const p of platformsIn(rows)) {
    followers += lastValue(rows, "followers", p, t) ?? 0;
    before += lastValue(rows, "followers", p, d30) ?? lastValue(rows, "followers", p, t) ?? 0;
  }
  const reach = sumBetween(rows, "reach", d30, t);
  const reachPrev = sumBetween(rows, "reach", d60, d30);
  const interactions = sumBetween(rows, "interactions", d30, t);
  const interactionsPrev = sumBetween(rows, "interactions", d60, d30);
  const engagement = reach ? Math.round((interactions / reach) * 1000) / 10 : 0;
  const engagementPrev = reachPrev ? Math.round((interactionsPrev / reachPrev) * 1000) / 10 : 0;
  const since = new Date(today.getTime() - 30 * 86_400_000).toISOString();
  return {
    followers,
    followersDelta: pct(followers, before),
    reach,
    reachDelta: pct(reach, reachPrev),
    interactions,
    engagement,
    engagementDelta: Math.round((engagement - engagementPrev) * 10) / 10,
    published: posts.filter((p) => p.status === "published" && (p.scheduledAt ?? p.createdAt) >= since).length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    lastUpdate: rows.reduce<string | null>((m, r) => (!m || r.date > m ? r.date : m), null),
  };
}

/** Serie diaria de seguidores (total o de una red) para la gráfica. */
export function followerSeries(rows: MetricRow[], platform: Network | "total", days = 90, today = new Date()) {
  const plats = platform === "total" ? platformsIn(rows) : [platform];
  const out: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgo(i, today);
    let v = 0;
    let any = false;
    for (const p of plats) {
      const x = lastValue(rows, "followers", p, date);
      if (x != null) {
        v += x;
        any = true;
      }
    }
    if (any) out.push({ date, value: v });
  }
  return out;
}

export type PlatformRow = { platform: Network; followers: number; growth: number; reach: number; interactions: number; posts: number; spark: number[] };

export function platformRows(rows: MetricRow[], posts: Post[], today = new Date()): PlatformRow[] {
  const t = daysAgo(0, today);
  const d30 = daysAgo(30, today);
  const since = new Date(today.getTime() - 30 * 86_400_000).toISOString();
  return platformsIn(rows).map((p) => {
    const now = lastValue(rows, "followers", p, t) ?? 0;
    const before = lastValue(rows, "followers", p, d30) ?? now;
    return {
      platform: p,
      followers: now,
      growth: pct(now, before),
      reach: sumBetween(rows, "reach", d30, t, p),
      interactions: sumBetween(rows, "interactions", d30, t, p),
      posts: posts.filter((x) => x.status === "published" && x.platforms.includes(p) && (x.scheduledAt ?? x.createdAt) >= since).length,
      spark: followerSeries(rows, p, 30, today).map((s) => s.value),
    };
  });
}

/** Interacciones totales de una pieza (todas sus redes). */
export function engagementOf(p: Post) {
  return p.targets.reduce((s, t) => s + (t.metrics ? t.metrics.likes + t.metrics.comments + t.metrics.shares + t.metrics.saves : 0), 0);
}

export function reachOf(p: Post) {
  return p.targets.reduce((s, t) => s + (t.metrics?.reach ?? 0), 0);
}

export function topPosts(posts: Post[], limit = 4, today = new Date()) {
  const since = new Date(today.getTime() - 30 * 86_400_000).toISOString();
  return posts
    .filter((p) => p.status === "published" && (p.scheduledAt ?? p.createdAt) >= since && reachOf(p) > 0)
    .sort((a, b) => reachOf(b) - reachOf(a))
    .slice(0, limit);
}

export const HEAT_HOURS = ["6a", "8a", "10a", "12p", "2p", "4p", "6p", "8p", "10p"];
export const HEAT_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const LONG_DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/**
 * Mejores horas: interacción promedio de lo publicado por día (Lun–Dom) y bloque de 2 h (6 a. m.–midnight).
 * Devuelve valores 0–1 y cuántas piezas lo sostienen.
 */
export function heatmap(posts: Post[]) {
  const sum = Array.from({ length: 7 }, () => Array(9).fill(0) as number[]);
  const count = Array.from({ length: 7 }, () => Array(9).fill(0) as number[]);
  let samples = 0;
  for (const p of posts) {
    if (p.status !== "published" || !p.scheduledAt) continue;
    const reach = reachOf(p);
    if (!reach) continue;
    const d = rdDate(p.scheduledAt);
    const block = Math.floor((d.getUTCHours() - 6) / 2);
    if (block < 0 || block > 8) continue;
    const dow = (d.getUTCDay() + 6) % 7;
    sum[dow][block] += engagementOf(p) / reach;
    count[dow][block]++;
    samples++;
  }
  const avg = sum.map((row, i) => row.map((v, j) => (count[i][j] ? v / count[i][j] : 0)));
  const max = Math.max(0, ...avg.flat());
  return { grid: avg.map((row) => row.map((v) => (max ? v / max : 0))), samples };
}

export function bestTime(grid: number[][]): string | null {
  let best = { v: 0, d: 0, h: 0 };
  grid.forEach((row, d) => row.forEach((v, h) => v > best.v && (best = { v, d, h })));
  if (!best.v) return null;
  const hour = 6 + best.h * 2;
  const label = hour === 12 ? "12:00 p. m." : hour > 12 ? `${hour - 12}:00 p. m.` : `${hour}:00 a. m.`;
  return `${LONG_DAYS[best.d]} a las ${label}`;
}

/** Uso del mes (hora de RD): publicado + programado, por tipo. */
export function monthUsage(posts: Post[], today = new Date()) {
  const month = ymd(rdDate(today.toISOString())).slice(0, 7);
  const inMonth = posts.filter((p) => (p.status === "published" || p.status === "scheduled") && p.scheduledAt && ymd(rdDate(p.scheduledAt)).slice(0, 7) === month);
  return {
    posts: inMonth.filter((p) => p.type === "post" || p.type === "carousel").length,
    reels: inMonth.filter((p) => p.type === "reel" || p.type === "video").length,
    stories: inMonth.filter((p) => p.type === "story").length,
  };
}

export type NewsItem = { tone: "good" | "attention" | "info"; text: string; href?: string };

/** Novedades generadas a partir de los datos. */
export function newsFeed(input: {
  rows: MetricRow[];
  posts: Post[];
  pendingApprovals: number;
  reviews: { stars: number | null; author: string }[];
  toConnect: string[];
  base: string;
  today?: Date;
}): NewsItem[] {
  const { rows, posts, pendingApprovals, reviews, toConnect, base, today = new Date() } = input;
  const items: NewsItem[] = [];
  if (pendingApprovals) items.push({ tone: "attention", text: `Tienes ${pendingApprovals} ${pendingApprovals === 1 ? "publicación" : "publicaciones"} por aprobar.`, href: `${base}/aprobaciones` });
  const k = kpis(rows, posts, today);
  const milestones = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  const before = followerSeries(rows, "total", 31, today)[0]?.value ?? 0;
  const crossed = milestones.filter((m) => before < m && k.followers >= m).pop();
  if (crossed) items.push({ tone: "good", text: `¡Pasaron los ${crossed.toLocaleString("en-US")} seguidores entre todas tus redes!` });
  if (k.followersDelta > 0) items.push({ tone: "good", text: `Tus seguidores crecieron ${k.followersDelta}% en los últimos 30 días.` });
  const top = topPosts(posts, 1, today)[0];
  if (top) items.push({ tone: "good", text: `Tu mejor publicación del mes llegó a ${reachOf(top).toLocaleString("en-US")} personas: “${top.caption.slice(0, 60)}”.` });
  const good = reviews.filter((r) => (r.stars ?? 0) >= 4);
  if (good.length) items.push({ tone: "good", text: `Recibiste ${good.length} ${good.length === 1 ? "reseña buena" : "reseñas buenas"} en Google.` });
  if (toConnect.length) items.push({ tone: "info", text: `Falta conectar: ${toConnect.join(", ")}.`, href: `${base}/conectar` });
  return items;
}
