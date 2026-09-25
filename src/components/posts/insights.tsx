import { Card, CardTitle } from "@/components/ui";
import { cn } from "@/lib/cn";
import { HEAT_DAYS, HEAT_HOURS } from "@/lib/social/analytics";

/** Mapa de calor de mejores horas (más oscuro = más activa), como el prototipo. */
export function Heatmap({ grid, best, samples }: { grid: number[][]; best: string | null; samples: number }) {
  return (
    <Card className="gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle>Mejores horas para publicar</CardTitle>
        <p className="text-label">Cuándo está conectada tu audiencia (más oscuro = más activa).</p>
      </div>
      {samples < 5 ? (
        <p className="text-label text-muted">Con 5 publicaciones o más con métricas te mostramos qué días y horas le funcionan mejor a tu audiencia.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] table-fixed border-separate border-spacing-1.5 text-center text-caption">
              <caption className="sr-only">Interacción promedio por día y hora (hora de RD)</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-12" />
                  {HEAT_HOURS.map((h) => (
                    <th key={h} scope="col" className="font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((row, d) => (
                  <tr key={HEAT_DAYS[d]}>
                    <th scope="row" className="text-left font-bold">
                      {HEAT_DAYS[d]}
                    </th>
                    {row.map((v, h) => (
                      <td key={h} className="h-[30px] rounded-sm bg-hairline p-0" title={`${Math.round(v * 100)}%`}>
                        <span className="block size-full rounded-sm bg-ocean" style={{ opacity: 0.18 + v * 0.8 }} />
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

export function Bars({ title, items, className, tone = "cyan" }: { title: string; items: { label: string; value: number }[]; className?: string; tone?: "cyan" | "ink" }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <Card className={cn("gap-3", className)}>
      <CardTitle>{title}</CardTitle>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((i) => (
            <li key={i.label} className="grid grid-cols-[minmax(0,110px)_1fr_44px] items-center gap-3 text-label">
              <span className="truncate">{i.label}</span>
              <span className="h-3 overflow-hidden rounded-full bg-sand">
                <span className={cn("block h-full rounded-full", tone === "cyan" ? "bg-cyan" : "bg-ink")} style={{ width: `${(i.value / Math.max(max, 100)) * 100}%` }} />
              </span>
              <span className="text-right font-bold tabular-nums">{i.value}%</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-label text-muted">Instagram comparte estos datos cuando la cuenta pasa de 100 seguidores.</p>
      )}
    </Card>
  );
}
