import { BarChart3 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Bars, FollowersChart, Heatmap, KpiRow, sourceLabel, TopPosts } from "@/components/posts/insights";
import { PrintReportButton } from "@/components/posts/print-button";
import { ButtonLink, EmptyState, LoadingState, Table, TBody, TD, TH, THead, TR, TrendPill } from "@/components/ui";
import { networks } from "@/lib/design/tokens";
import { listAudience, listMetrics } from "@/lib/data/insights";
import { listPosts } from "@/lib/data/posts";
import { compact, longDate, todayRD } from "@/lib/format";
import { bestTime, daysAgo, heatmap, kpis, platformRows, topPosts } from "@/lib/social/analytics";
import { space } from "../space";

export const metadata: Metadata = { title: "Reportes" };

export default function ReportesPage({ params, searchParams }: PageProps<"/app/c/[clientId]/reportes">) {
  return (
    <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
      <Reportes params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Reportes({ params, searchParams }: Pick<PageProps<"/app/c/[clientId]/reportes">, "params" | "searchParams">) {
  const s = await space(params, searchParams);
  const [rows, posts, audience] = await Promise.all([listMetrics(s.client.id, daysAgo(120)), listPosts(s.client.id, { hideDrafts: s.asClient }), listAudience(s.client.id)]);

  if (!rows.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Todavía no hay métricas"
        description="Cuando conectes tus redes, el sistema trae los datos cada mañana y aquí verás tu reporte."
        action={<ButtonLink href={`${s.base}/conectar${s.q}`}>Conectar cuentas</ButtonLink>}
        className="bg-surface"
      />
    );
  }

  const k = kpis(rows, posts);
  const plats = platformRows(rows, posts);
  const heat = heatmap(posts);
  const aud = audience.find((a) => a.platform === "instagram" && (a.ages.length || a.cities.length)) ?? audience[0];

  return (
    <div data-report className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-h2 font-bold">Reporte de {s.client.name}</h2>
          <p className="text-label text-muted">
            Últimos 30 días al {longDate(todayRD())} · hora de RD
          </p>
        </div>
        <PrintReportButton />
      </div>

      <KpiRow k={k} source={sourceLabel(k)} />
      <FollowersChart rows={rows} />

      <Table>
        <caption className="sr-only">Resultados por red, últimos 30 días</caption>
        <THead>
          <tr>
            <TH>Red</TH>
            <TH className="text-right">Seguidores</TH>
            <TH className="text-right">Crecimiento</TH>
            <TH className="text-right">Alcance</TH>
            <TH className="text-right">Interacciones</TH>
            <TH className="text-right">Publicaciones</TH>
          </tr>
        </THead>
        <TBody>
          {plats.map((r) => (
            <TR key={r.platform}>
              <TD className="font-semibold">{networks[r.platform].label}</TD>
              <TD className="text-right tabular-nums">{compact(r.followers)}</TD>
              <TD className="text-right">
                <TrendPill value={r.growth} />
              </TD>
              <TD className="text-right tabular-nums">{compact(r.reach)}</TD>
              <TD className="text-right tabular-nums">{compact(r.interactions)}</TD>
              <TD className="text-right tabular-nums">{r.posts}</TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bars title={`Edades${aud ? ` · ${networks[aud.platform].label}` : ""}`} items={aud?.ages ?? []} />
        <Bars title="Ciudades principales" items={aud?.cities ?? []} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Heatmap grid={heat.grid} best={bestTime(heat.grid)} samples={heat.samples} />
        <TopPosts posts={topPosts(posts, 5)} />
      </div>
    </div>
  );
}
