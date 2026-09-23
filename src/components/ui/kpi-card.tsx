import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TrendPill } from "./badge";
import { Skeleton } from "./spinner";

/**
 * KPI con variación, definición (tooltip) y fuente + hora de actualización:
 * en producción cada número debe decir de dónde sale.
 */
export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  definition,
  source,
  loading,
  className,
}: {
  label: string;
  value?: ReactNode;
  /** Variación en % contra el período anterior. */
  delta?: number;
  /** Texto en lugar de la variación, p. ej. "3 programadas". */
  deltaLabel?: ReactNode;
  /** Cómo se calcula, p. ej. "Interacciones / alcance". */
  definition?: string;
  /** Fuente y última actualización, p. ej. "Instagram · hace 2 h". */
  source?: ReactNode;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 basis-44 flex-col gap-3 rounded-md bg-surface p-5", className)} aria-busy={loading || undefined}>
      <div className="flex items-center gap-1.5 text-caption font-semibold text-muted">
        {label}
        {definition && (
          <span className="group relative inline-flex">
            <button type="button" aria-label={`Qué es ${label}`} className="rounded-full text-muted hover:text-ink">
              <Info aria-hidden className="size-3.5" />
            </button>
            <span
              role="tooltip"
              className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-2 w-52 -translate-x-1/2 rounded-sm bg-ink px-3 py-2 text-caption font-medium text-white opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
            >
              {definition}
            </span>
          </span>
        )}
      </div>
      {loading ? (
        <>
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-5 w-16" />
        </>
      ) : (
        <>
          <p className="font-display text-[32px] leading-none font-bold tracking-[-0.03em] tabular-nums">{value ?? "—"}</p>
          <div className="flex flex-wrap items-center gap-2">
            {delta !== undefined && <TrendPill value={delta} />}
            {deltaLabel && <span className="rounded-full bg-sand px-2 py-0.5 text-caption font-bold">{deltaLabel}</span>}
          </div>
        </>
      )}
      {source && !loading && <p className="mt-auto text-eyebrow text-muted">{source}</p>}
    </div>
  );
}
