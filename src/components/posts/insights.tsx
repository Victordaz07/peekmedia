import { CircleDashed, Clapperboard, GalleryHorizontal, Image as ImageIcon, Video } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardTitle, KpiCard, LineChart, NetworkChip, Sparkline, TrendPill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { networks, type Network } from "@/lib/design/tokens";
import { compact, formatDateTimeRD, shortDate } from "@/lib/format";
import { engagementOf, followerSeries, HEAT_DAYS, HEAT_HOURS, reachOf, type Kpis, type PlatformRow } from "@/lib/social/analytics";
import { postTypeLabel } from "@/lib/social/platforms";
import type { MetricRow, Post } from "@/lib/social/schema";

export function KpiRow({ k, source }: { k: Kpis; source: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-4">
      <KpiCard label="Seguidores" value={compact(k.followers)} delta={k.followersDelta} definition="Suma de seguidores de todas las redes conectadas. Variación contra hace 30 días." source={source} />
      <KpiCard label="Alcance (30 días)" value={compact(k.reach)} delta={k.reachDelta} definition="Cuentas únicas que vieron tu contenido, por red y sumadas." source={source} />
      <KpiCard
        label="Interacción"
        value={`${k.engagement.toFixed(1)}%`}
        delta={k.engagementDelta}
        definition="Interacciones (me gusta, comentarios, compartidos y guardados) entre alcance. Variación en puntos."
        source={source}
      />
      <KpiCard label="Publicaciones (30 días)" value={String(k.published)} deltaLabel={`${k.scheduled} programadas`} definition="Piezas publicadas en los últimos 30 días." source="Peek Media" />
    </div>
  );
}

export function sourceLabel(k: Kpis) {
  return k.lastUpdate ? `Datos de las redes · al ${shortDate(k.lastUpdate, false)}` : "Sin datos todavía";
}

export function FollowersChart({ rows, days = 90 }: { rows: MetricRow[]; days?: number }) {
  const series = followerSeries(rows, "total", days);
  if (series.length < 2) return null;
  const first = series[0].value;
  const last = series.at(-1)!.value;
  return (
    <Card className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Seguidores · últimos {days} días</CardTitle>
        <span className="font-display text-h3 font-bold tabular-nums">{compact(last)}</span>
      </div>
      <LineChart
        data={series.map((s) => ({ label: shortDate(s.date, false), value: s.value }))}
        summary={`Los seguidores pasaron de ${compact(first)} a ${compact(last)} en ${days} días.`}
      />
    </Card>
  );
}

export function PlatformCards({ rows }: { rows: PlatformRow[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => (
        <Card key={r.platform} className="gap-3">
          <div className="flex items-center justify-between gap-2">
            <NetworkChip network={r.platform} className="border-0 p-0" />
            <TrendPill value={r.growth} />
          </div>
          <p className="font-display text-h2 font-bold tabular-nums">
            {compact(r.followers)} <span className="text-label font-semibold text-muted">seguidores</span>
          </p>
          {r.spark.length > 1 && <Sparkline values={r.spark} label={`Tendencia de seguidores en ${networks[r.platform].label}`} />}
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Mini label="Alcance" value={compact(r.reach)} />
            <Mini label="Interacc." value={compact(r.interactions)} />
            <Mini label="Posts" value={String(r.posts)} />
          </dl>
        </Card>
      ))}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-item bg-hairline/60 py-2">
      <dd className="font-display text-[17px] font-bold tabular-nums">{value}</dd>
      <dt className="text-eyebrow">{label}</dt>
    </div>
  );
}

export function TopPosts({ posts, title = "Mejores publicaciones del mes" }: { posts: Post[]; title?: string }) {
  if (!posts.length) return null;
  return (
    <Card className="gap-4">
      <CardTitle>{title}</CardTitle>
      <ol className="flex flex-col divide-y divide-hairline">
        {posts.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink font-display text-label font-bold text-white">{i + 1}</span>
            {p.media[0] && !p.media[0].mime.startsWith("video/") ? (
              // eslint-disable-next-line @next/next/no-img-element -- miniatura del archivo publicado
              <img src={p.media[0].url} alt="" className="size-12 shrink-0 rounded-sm object-cover" />
            ) : (
              <TypeThumb type={p.type} />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-label font-semibold">{p.caption || postTypeLabel[p.type]}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-caption text-muted">
                {p.scheduledAt && formatDateTimeRD(p.scheduledAt)} · {p.platforms.map((n) => networks[n].label).join(", ")}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-label font-bold tabular-nums">{compact(reachOf(p))}</p>
              <p className="text-eyebrow text-muted">{compact(engagementOf(p))} interacc.</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

const typeIcon = { post: ImageIcon, carousel: GalleryHorizontal, reel: Clapperboard, story: CircleDashed, video: Video };

function TypeThumb({ type }: { type: Post["type"] }) {
  const Icon = typeIcon[type];
  return (
    <span className="grid size-12 shrink-0 place-items-center rounded-sm bg-ocean text-white">
      <Icon aria-hidden className="size-5" />
      <span className="sr-only">{postTypeLabel[type]}</span>
    </span>
  );
}

/** Mapa de calor de mejores horas: intensidad en cian. */
export function Heatmap({ grid, best, samples }: { grid: number[][]; best: string | null; samples: number }) {
  return (
    <Card className="gap-4">
      <CardTitle>Mejores horas para publicar</CardTitle>
      {samples < 5 ? (
        <p className="text-label text-muted">Con 5 publicaciones o más con métricas te mostramos qué días y horas le funcionan mejor a tu audiencia.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] table-fixed border-separate border-spacing-1 text-center text-eyebrow">
              <caption className="sr-only">Interacción promedio por día y hora (hora de RD)</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-10" />
                  {HEAT_HOURS.map((h) => (
                    <th key={h} scope="col" className="font-semibold text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((row, d) => (
                  <tr key={HEAT_DAYS[d]}>
                    <th scope="row" className="text-left font-semibold text-muted">
                      {HEAT_DAYS[d]}
                    </th>
                    {row.map((v, h) => (
                      <td key={h} className="h-8 rounded-sm bg-hairline p-0" title={`${Math.round(v * 100)}%`}>
                        <span className="block size-full rounded-sm bg-cyan" style={{ opacity: v ? 0.15 + v * 0.85 : 0 }} />
                        <span className="sr-only">{Math.round(v * 100)}%</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {best && (
            <p className="text-label">
              Tu mejor momento: <strong>{best}</strong>
            </p>
          )}
        </>
      )}
    </Card>
  );
}

export function Bars({ title, items, className }: { title: string; items: { label: string; value: number }[]; className?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <Card className={cn("gap-3", className)}>
      <CardTitle>{title}</CardTitle>
      {items.length ? (
        <ul className="flex flex-col gap-2.5">
          {items.map((i) => (
            <li key={i.label} className="flex flex-col gap-1">
              <span className="flex justify-between text-label">
                <span>{i.label}</span>
                <span className="font-semibold tabular-nums">{i.value}%</span>
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-hairline">
                <span className="block h-full rounded-full bg-cyan" style={{ width: `${(i.value / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-label text-muted">Instagram comparte estos datos cuando la cuenta pasa de 100 seguidores.</p>
      )}
    </Card>
  );
}

export const networkList = (ns: Network[]) => ns.map((n) => networks[n].label).join(", ");
