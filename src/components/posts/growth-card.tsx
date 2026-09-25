"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { networks, type Network } from "@/lib/design/tokens";
import { compact, shortDate } from "@/lib/format";

export type GrowthSeries = { key: "total" | Network; points: { date: string; value: number }[] };
export type GrowthCardItem = { platform: Network; followers: number; gain30: number; spark: number[] };

const W = 600;
const H = 200;

function paths(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * W, 190 - ((v - min) / span) * 170] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return { line, area: `${line} L${W} ${H} L0 ${H} Z`, min, max };
}

function spark(values: number[]) {
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  return values.map((v, i) => `${i ? "L" : "M"}${((i / Math.max(1, values.length - 1)) * 120).toFixed(1)} ${(33 - ((v - min) / span) * 30).toFixed(1)}`).join(" ");
}

const netColor: Record<Network, string> = {
  instagram: "var(--color-net-instagram)",
  facebook: "var(--color-net-facebook)",
  tiktok: "var(--color-net-tiktok)",
  youtube: "var(--color-net-youtube)",
  google: "var(--color-net-google)",
  linkedin: "var(--color-net-linkedin)",
  threads: "var(--color-net-threads)",
  x: "var(--color-net-x)",
  pinterest: "var(--color-net-pinterest)",
};

/** "Crecimiento de seguidores" del prototipo: total o por red, con una tarjeta por red debajo. */
export function GrowthCard({ series, cards, days = 90 }: { series: GrowthSeries[]; cards: GrowthCardItem[]; days?: number }) {
  const [tab, setTab] = useState<GrowthSeries["key"]>("total");
  const current = series.find((s) => s.key === tab) ?? series[0];
  if (!current || current.points.length < 2) return null;
  const values = current.points.map((p) => p.value);
  const { line, area, min, max } = paths(values);
  const gain = values.at(-1)! - values[0];
  const idx = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (current.points.length - 1)));

  return (
    <section className="flex flex-col gap-5 rounded-md bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-h3 font-bold">Crecimiento de seguidores</h2>
          <p className="text-label">
            {gain >= 0 ? "+" : ""}
            {Math.round(gain).toLocaleString("en-US")} seguidores en {days} días
          </p>
        </div>
        <div role="group" aria-label="Red" className="flex flex-wrap gap-1.5">
          {series.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={tab === s.key}
              onClick={() => setTab(s.key)}
              className={cn("rounded-full px-3.5 py-2 text-caption font-semibold transition-colors", tab === s.key ? "bg-ink text-white" : "bg-sand hover:bg-[#b0b0b0]")}
            >
              {s.key === "total" ? "Total" : networks[s.key].label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-stretch gap-3">
        <div className="flex min-w-12 flex-col justify-between pt-1 pb-[22px] text-right text-eyebrow tabular-nums">
          <span>{compact(max)}</span>
          <span>{compact((max + min) / 2)}</span>
          <span>{compact(min)}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[220px] w-full" role="img" aria-label={`Seguidores de ${compact(values[0])} a ${compact(values.at(-1)!)} en ${days} días`}>
            {[20, 105, 190].map((y) => (
              <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="var(--color-hairline)" strokeWidth="1" />
            ))}
            <path d={area} fill="rgb(33 196 214 / 0.16)" />
            <path d={line} fill="none" stroke="var(--color-cyan)" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
          <div className="flex justify-between text-eyebrow">
            {idx.map((i) => (
              <span key={i}>{shortDate(current.points[i].date, false)}</span>
            ))}
          </div>
        </div>
      </div>
      {cards.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3">
          {cards.map((c) => (
            <div key={c.platform} className="flex flex-col gap-2 rounded-[16px] border-[1.5px] border-hairline p-3.5">
              <div className="flex items-center gap-2 text-caption font-semibold">
                <span className="size-2 rounded-full" style={{ background: netColor[c.platform] }} />
                {networks[c.platform].label}
              </div>
              <div className="flex items-end justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-display text-[24px] font-bold tabular-nums">{c.followers.toLocaleString("en-US")}</span>
                  <span className="text-eyebrow font-semibold">
                    {c.gain30 >= 0 ? "+" : ""}
                    {c.gain30.toLocaleString("en-US")} en 30 días
                  </span>
                </div>
                {c.spark.length > 1 && (
                  <svg viewBox="0 0 120 36" preserveAspectRatio="none" className="h-9 w-[90px]" aria-hidden>
                    <path d={spark(c.spark)} fill="none" stroke={netColor[c.platform]} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
