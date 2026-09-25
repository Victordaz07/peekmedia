import { PlugZap } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { GrowthCard, type GrowthSeries } from "@/components/posts/growth-card";
import { Banner, BestPosts, KpiTiles, NewsCard, UpcomingPosts, type Tile } from "@/components/posts/overview";
import { ButtonLink, LoadingState, NetworkChip } from "@/components/ui";
import { isClientAdmin } from "@/lib/auth";
import { money } from "@/lib/content/helpers";
import { listContracts } from "@/lib/data/contracts";
import { listInbox, listMetrics } from "@/lib/data/insights";
import { listPosts } from "@/lib/data/posts";
import { listAccounts } from "@/lib/data/social";
import { networks, type Network } from "@/lib/design/tokens";
import { compact } from "@/lib/format";
import { daysAgo, followerSeries, kpis, newsFeed, platformRows, topPosts } from "@/lib/social/analytics";
import type { MetricRow } from "@/lib/social/schema";
import { space } from "./space";

export const metadata: Metadata = { title: "Resumen" };

export default function ResumenPage({ params, searchParams }: PageProps<"/app/c/[clientId]">) {
  return (
    <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
      <Resumen params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const sign = (n: number) => (n >= 0 ? "+" : "");
const since30 = () => daysAgo(30);
const sumPlat = (rows: MetricRow[], p: Network, metric: MetricRow["metric"]) =>
  rows.filter((r) => r.platform === p && r.metric === metric && r.date > since30()).reduce((s, r) => s + r.value, 0);

async function Resumen({ params, searchParams }: Pick<PageProps<"/app/c/[clientId]">, "params" | "searchParams">) {
  const s = await space(params, searchParams);
  const { client, viewer, asClient, base, q } = s;
  const [contracts, rows, posts, accounts, reviews] = await Promise.all([
    listContracts(client.id),
    listMetrics(client.id, daysAgo(120)),
    listPosts(client.id, { hideDrafts: asClient }),
    listAccounts(client.id),
    asClient ? Promise.resolve([]) : listInbox(client.id, { reviewsOnly: true }),
  ]);
  const current = asClient ? contracts.find((c) => c.status !== "draft") : contracts[0];
  const withQ = (path: string, extra = "") => `${base}${path}${extra ? `?${extra}` : ""}${q ? `${extra ? "&" : "?"}${q.slice(1)}` : ""}`;

  const k = rows.length ? kpis(rows, posts) : null;
  const plats = platformRows(rows, posts);
  const tiles: Tile[] = k
    ? [
        { label: "Seguidores totales", value: compact(k.followers), pill: `${sign(k.followersDelta)}${k.followersDelta}% vs. mes anterior`, tone: k.followersDelta >= 0 ? "up" : "down" },
        { label: "Alcance", value: compact(k.reach), pill: `${sign(k.reachDelta)}${k.reachDelta}% vs. mes anterior`, tone: k.reachDelta >= 0 ? "up" : "down" },
        { label: "Interacción", value: `${k.engagement.toFixed(1)}%`, pill: `${sign(k.engagementDelta)}${k.engagementDelta} pts vs. mes anterior`, tone: k.engagementDelta >= 0 ? "up" : "down" },
        { label: "Publicaciones", value: String(k.published), pill: `${k.scheduled} programadas`, tone: "neutral" },
        ...(client.platforms.includes("google") && plats.some((p) => p.platform === "google")
          ? [{ label: "Vistas en Google", value: sumPlat(rows, "google", "reach").toLocaleString("en-US"), pill: `${sumPlat(rows, "google", "interactions").toLocaleString("en-US")} acciones`, tone: "neutral" as const }]
          : []),
        ...(client.platforms.includes("youtube") && plats.some((p) => p.platform === "youtube")
          ? [{ label: "Vistas en YouTube", value: sumPlat(rows, "youtube", "reach").toLocaleString("en-US"), pill: `${sumPlat(rows, "youtube", "interactions").toLocaleString("en-US")} interacciones`, tone: "neutral" as const }]
          : []),
      ]
    : [];

  // Google Business no tiene seguidores: queda fuera de la gráfica, como en el prototipo.
  const followerPlats = plats.filter((p) => p.platform !== "google");
  const series: GrowthSeries[] = [
    { key: "total", points: followerSeries(rows.filter((r) => r.platform !== "google"), "total", 90) },
    ...followerPlats.map((p) => ({ key: p.platform, points: followerSeries(rows, p.platform, 90) })),
  ];
  const cards = followerPlats.map((p) => ({ platform: p.platform, followers: p.followers, gain30: p.spark.length ? p.spark.at(-1)! - p.spark[0] : 0, spark: p.spark }));

  const now = new Date().toISOString();
  const upcoming = posts
    .filter((p) => p.scheduledAt && p.scheduledAt >= now && p.status !== "published")
    .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!))
    .slice(0, 4);
  const since = new Date(new Date().getTime() - 30 * 86_400_000).toISOString();
  const news = newsFeed({
    rows,
    posts,
    pendingApprovals: posts.filter((p) => p.status === "pending").length,
    reviews: reviews.filter((r) => r.receivedAt >= since),
    toConnect: client.platforms.filter((p) => !accounts.some((a) => a.platform === p && a.status === "connected")).map((p) => networks[p].label),
    base,
  }).slice(0, 3);

  return (
    <>
      {asClient && current?.status === "sent" && (
        <Banner
          title="Tu contrato está listo para firmar"
          text={`${current.planName} · ${money(current.price)} al mes. ${isClientAdmin(viewer) || viewer.kind === "team" ? "Revísalo y fírmalo desde tu panel, sin papeles." : "Lo firma un Administrador de tu negocio."}`}
          action={
            <ButtonLink href={withQ("/plan")} className="font-bold">
              Ver mi contrato →
            </ButtonLink>
          }
        />
      )}
      {!asClient && current?.status === "draft" && (
        <Banner
          title="El contrato está en borrador"
          text="El cliente no lo ve hasta que lo envíes para firma."
          action={
            <ButtonLink href={withQ("/plan")} className="font-bold">
              Ir a Plan y contrato →
            </ButtonLink>
          }
        />
      )}

      {k ? (
        <KpiTiles tiles={tiles} />
      ) : (
        <div className="flex flex-col gap-4 rounded-md bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex max-w-xl flex-col gap-1">
              <h2 className="font-display text-h3 font-bold">{asClient ? "Conecta tus redes para ver tus números" : "Este cliente todavía no tiene métricas"}</h2>
              <p className="text-label text-muted">
                Cuando {asClient ? "conectes" : "conecte"} las cuentas, el sistema trae cada mañana seguidores, alcance, interacción y las mejores publicaciones.
              </p>
            </div>
            <ButtonLink href={withQ("/conectar")} iconLeft={<PlugZap className="size-4" />}>
              Conectar cuentas
            </ButtonLink>
          </div>
          <div className="flex flex-wrap gap-2">
            {client.platforms.map((p) => (
              <NetworkChip key={p} network={p} />
            ))}
          </div>
        </div>
      )}

      {series[0].points.length > 1 && <GrowthCard series={series} cards={cards} />}

      <div className="flex flex-wrap items-start gap-5">
        <BestPosts posts={topPosts(posts, 4)} hrefOf={(p) => withQ("/calendario", `post=${p.id}`)} />
        <div className="flex min-w-0 flex-[2_1_300px] flex-col gap-5">
          <UpcomingPosts posts={upcoming} hrefOf={(p) => withQ(p.status === "pending" ? "/aprobaciones" : "/calendario", `post=${p.id}`)} />
          <NewsCard items={news} href={withQ("/novedades")} />
        </div>
      </div>
    </>
  );
}
