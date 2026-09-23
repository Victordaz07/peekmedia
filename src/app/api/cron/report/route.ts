import { cronAllowed } from "@/lib/cron";
import { listClientsAdmin } from "@/lib/data/clients";
import { listMetricsAdmin } from "@/lib/data/insights";
import { recentPublished } from "@/lib/data/posts";
import { notifyMonthlyReport } from "@/lib/notify";
import { kpis, reachOf, topPosts } from "@/lib/social/analytics";

/** El día 1 de cada mes avisa a cada cliente que su reporte está listo, con un resumen. */
export async function GET(request: Request) {
  if (!cronAllowed(request)) return new Response("No autorizado", { status: 401 });
  const since = new Date(Date.now() - 65 * 86_400_000).toISOString().slice(0, 10);
  const posts = await recentPublished(31);
  const sent = [];
  for (const c of (await listClientsAdmin()).filter((x) => x.status === "active")) {
    const rows = await listMetricsAdmin(c.id, since);
    const mine = posts.filter((p) => p.clientId === c.id);
    if (!rows.length && !mine.length) continue;
    const k = kpis(rows, mine);
    const top = topPosts(mine, 1)[0];
    const summary = [
      `Seguidores: ${k.followers.toLocaleString("en-US")} (${k.followersDelta >= 0 ? "+" : ""}${k.followersDelta}% en 30 días)`,
      `Alcance del mes: ${k.reach.toLocaleString("en-US")} personas`,
      `Publicaciones: ${k.published}`,
      ...(top ? [`Mejor publicación: “${top.caption.slice(0, 60)}” (${reachOf(top).toLocaleString("en-US")} de alcance)`] : []),
    ];
    await notifyMonthlyReport(c.id, c.name, summary);
    sent.push(c.id);
  }
  return Response.json({ sent });
}
