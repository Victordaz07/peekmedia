import { useId } from "react";
import { cn } from "@/lib/cn";

export type Point = { label: string; value: number };

function scale(values: number[], width: number, height: number, pad: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values.map((v, i) => [pad + i * step, pad + (height - pad * 2) * (1 - (v - min) / span)] as const);
}

function toPath(points: readonly (readonly [number, number])[]) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
}

/**
 * Gráfica de línea (seguidores a 90 días): área cian al 16% y línea de 3px.
 * SVG puro, escala al ancho del contenedor. `summary` describe la tendencia para lectores de pantalla.
 */
export function LineChart({
  data,
  summary,
  height = 220,
  className,
}: {
  data: Point[];
  summary: string;
  height?: number;
  className?: string;
}) {
  const id = useId();
  const width = 640;
  if (data.length < 2) return null;
  const pts = scale(data.map((d) => d.value), width, height, 8);
  const line = toPath(pts);
  const area = `${line} L${pts.at(-1)![0]} ${height} L${pts[0][0]} ${height} Z`;
  const ticks = [0, Math.floor((data.length - 1) / 2), data.length - 1];
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-labelledby={`${id}-d`} className="h-[220px] w-full">
        <desc id={`${id}-d`}>{summary}</desc>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={width} y1={height * f} y2={height * f} className="stroke-hairline" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} className="fill-cyan/16" />
        <path d={line} fill="none" className="stroke-cyan" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption aria-hidden className="flex justify-between text-eyebrow text-muted">
        {ticks.map((i) => (
          <span key={i}>{data[i].label}</span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Mini tendencia para las cards por red. */
export function Sparkline({ values, className, label }: { values: number[]; className?: string; label: string }) {
  if (values.length < 2) return null;
  const pts = scale(values, 120, 36, 3);
  return (
    <svg viewBox="0 0 120 36" role="img" aria-label={label} className={cn("h-9 w-[120px]", className)}>
      <path d={toPath(pts)} fill="none" className="stroke-cyan" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
