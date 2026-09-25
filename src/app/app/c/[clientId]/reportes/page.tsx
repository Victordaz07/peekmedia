import { BarChart3 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Bars, Heatmap } from "@/components/posts/insights";
import { PrintReportButton } from "@/components/posts/print-button";
import { ButtonLink, EmptyState, LoadingState, NetworkDot } from "@/components/ui";
import { networks } from "@/lib/design/tokens";
import { listAudience, listMetrics } from "@/lib/data/insights";
import { listPosts } from "@/lib/data/posts";
import { compact, longDate, todayRD } from "@/lib/format";
import { bestTime, daysAgo, heatmap, platformRows } from "@/lib/social/analytics";
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

  const plats = platformRows(rows, posts);
  const heat = heatmap(posts);
  const aud = audience.find((a) => a.platform === "instagram" && (a.ages.length || a.cities.length)) ?? audience[0];

  return (
    <div data-report className="flex flex-col gap-5">
      <div className="hidden print:block">
        <h2 className="font-display text-h2 font-bold">Reporte de {s.client.name}</h2>
        <p className="text-label">Últimos 30 días al {longDate(todayRD())} · hora de RD</p>
      </div>
      <div className="flex justify-end" data-noprint>
        <PrintReportButton />
      </div>

      <section className="flex flex-col gap-4 rounded-md bg-surface p-6">
        <h2 className="font-display text-h3 font-bold">Resumen por red · últimos 30 días</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-label">
            <caption className="sr-only">Resultados por red, últimos 30 días</caption>
            <thead>
              <tr className="border-b-[1.5px] border-ink text-caption">
                {["Red", "Seguidores", "Crecimiento", "Alcance", "Interacciones", "Posts"].map((h) => (
                  <th key={h} scope="col" className="px-2 py-2.5 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plats.map((r) => {
                const google = r.platform === "google";
                return (
                  <tr key={r.platform} className="border-b border-hairline">
                    <th scope="row" className="px-2 py-3 font-bold">
                      <span className="flex items-center gap-2">
                        <NetworkDot network={r.platform} className="size-2" />
                        {networks[r.platform].label}
                      </span>
                    </th>
                    <td className="px-2 py-3 tabular-nums">{google ? "—" : r.followers.toLocaleString("en-US")}</td>
                    <td className="px-2 py-3 tabular-nums">{google ? "—" : `${r.growth >= 0 ? "+" : ""}${r.growth}%`}</td>
                    <td className="px-2 py-3 tabular-nums">{google ? `${r.reach.toLocaleString("en-US")} vistas` : compact(r.reach)}</td>
                    <td className="px-2 py-3 tabular-nums">{google ? `${r.interactions.toLocaleString("en-US")} acciones` : r.interactions.toLocaleString("en-US")}</td>
                    <td className="px-2 py-3 tabular-nums">{r.posts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bars title="Edad de la audiencia" items={aud?.ages ?? []} />
        <Bars title="Ciudades principales" items={aud?.cities ?? []} tone="ink" />
      </div>

      <Heatmap grid={heat.grid} best={bestTime(heat.grid)} samples={heat.samples} />
    </div>
  );
}
