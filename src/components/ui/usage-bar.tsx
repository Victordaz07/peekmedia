import { cn } from "@/lib/cn";

/** Uso del mes contra lo contratado. Se pone coral al llegar al 100%. */
export function UsageBar({ label, used, total, className }: { label: string; used: number; total: number; className?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const full = total > 0 && used >= total;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-label">
        <span>{label}</span>
        <span className="font-bold tabular-nums">
          {used} de {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.min(used, total)}
        className="h-2 overflow-hidden rounded-full bg-sand"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-reveal", full ? "bg-coral" : "bg-cyan")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
