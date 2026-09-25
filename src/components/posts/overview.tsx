import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { networks, type Network } from "@/lib/design/tokens";
import { dayTimeRD, partsRD } from "@/lib/format";
import { reachOf, type NewsItem } from "@/lib/social/analytics";
import { postTypeLabel } from "@/lib/social/platforms";
import type { Post, PostStatus } from "@/lib/social/schema";

/** Piezas visuales del Resumen, iguales al prototipo de Claude Design. */

export type Tile = { label: string; value: string; pill: string; tone: "up" | "down" | "neutral" };

export function KpiTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="flex flex-col gap-2.5 rounded-md bg-surface p-5 transition-transform duration-200 hover:-translate-y-1">
          <p className="text-caption font-semibold">{t.label}</p>
          <p className="font-display text-[36px] leading-none font-bold tracking-[-0.03em] tabular-nums">{t.value}</p>
          <span
            className={cn(
              "self-start rounded-full px-2.5 py-1 text-eyebrow font-bold",
              t.tone === "up" && "bg-cyan-tint",
              t.tone === "down" && "bg-coral-tint",
              t.tone === "neutral" && "bg-sand",
            )}
          >
            {t.pill}
          </span>
        </div>
      ))}
    </div>
  );
}

const tones = ["bg-ocean text-white", "bg-cyan text-ink", "bg-sand text-ink", "bg-ink text-white"];
const toneOf = (id: string) => tones[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % tones.length];

export const platShort = (ps: Network[]) => ps.map((p) => networks[p].short).join(" ");
export const platNames = (ps: Network[]) => ps.map((p) => networks[p].label).join(", ");

export function BestPosts({ posts, hrefOf }: { posts: Post[]; hrefOf: (p: Post) => string }) {
  return (
    <section className="flex min-w-0 flex-[3_1_460px] flex-col gap-4 rounded-md bg-surface p-6">
      <h2 className="font-display text-h3 font-bold">Mejores publicaciones del mes</h2>
      {posts.length ? (
        posts.map((p) => (
          <Link key={p.id} href={hrefOf(p)} className="flex items-center gap-3.5 border-b border-hairline pb-3.5">
            <span className={cn("grid size-14 shrink-0 place-items-center rounded-[12px] text-[11px] font-bold", toneOf(p.id))}>{postTypeLabel[p.type]}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-button font-semibold">{p.caption || postTypeLabel[p.type]}</span>
              <span className="text-caption">
                {p.scheduledAt && dayTimeRD(p.scheduledAt)} · {platNames(p.platforms)}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="font-display text-[20px] font-bold tabular-nums">{compactReach(reachOf(p))}</span>
              <span className="text-eyebrow">alcance</span>
            </span>
          </Link>
        ))
      ) : (
        <p className="text-label text-muted">Cuando haya publicaciones con métricas este mes, aparecen aquí.</p>
      )}
    </section>
  );
}

function compactReach(n: number) {
  return n >= 10_000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : n.toLocaleString("en-US");
}

export const statusPill: Record<PostStatus, { label: string; className: string }> = {
  published: { label: "Publicado", className: "bg-ink text-white" },
  scheduled: { label: "Programado", className: "bg-cyan text-ink" },
  approved: { label: "Programado", className: "bg-cyan text-ink" },
  pending: { label: "Por aprobar", className: "bg-coral-tint text-ink" },
  changes: { label: "Cambios pedidos", className: "bg-coral text-ink" },
  draft: { label: "Borrador", className: "bg-sand text-ink" },
  failed: { label: "Falló", className: "bg-coral-strong text-white" },
};

export function StatusPill({ status, className }: { status: PostStatus; className?: string }) {
  const s = statusPill[status];
  return <span className={cn("rounded-full px-2 py-0.5 font-semibold", s.className, className)}>{s.label}</span>;
}

export function UpcomingPosts({ posts, hrefOf }: { posts: Post[]; hrefOf: (p: Post) => string }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-md bg-surface p-6">
      <h2 className="font-display text-h3 font-bold">Próximas publicaciones</h2>
      {posts.length ? (
        posts.map((p) => {
          const d = partsRD(p.scheduledAt!);
          return (
            <Link key={p.id} href={hrefOf(p)} className="flex items-center gap-3">
              <span className="w-12 shrink-0 rounded-[12px] bg-sand py-1.5 text-center leading-[1.1]">
                <span className="block text-[11px] font-semibold">{d.dow}</span>
                <span className="block font-display text-[20px] font-bold">{d.day}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-label font-semibold">{p.caption || postTypeLabel[p.type]}</span>
                <span className="flex items-center gap-1.5 text-eyebrow">
                  <StatusPill status={p.status} />
                  {d.time} · {platShort(p.platforms)}
                </span>
              </span>
            </Link>
          );
        })
      ) : (
        <p className="text-label text-muted">No hay nada programado todavía.</p>
      )}
    </section>
  );
}

const dot = { good: "bg-cyan", attention: "bg-coral", info: "bg-white/60" } as const;

export function NewsCard({ items, href }: { items: NewsItem[]; href: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-md bg-ink p-6 text-white">
      <h2 className="font-display text-h3 font-bold">Novedades</h2>
      {items.length ? (
        items.map((n) => (
          <p key={n.text} className="flex items-start gap-2.5 text-label leading-[1.45]">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot[n.tone])} />
            {n.text}
          </p>
        ))
      ) : (
        <p className="text-label text-white/80">Todavía no hay novedades.</p>
      )}
      <Link href={href} className="self-start text-label font-semibold text-cyan hover:text-white">
        Ver todas →
      </Link>
    </section>
  );
}

/** Aviso grande del prototipo ("Tu contrato está listo para firmar"). */
export function Banner({ title, text, action }: { title: string; text: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border-2 border-coral bg-coral-tint px-[22px] py-[18px]">
      <div className="flex flex-col gap-1">
        <p className="font-display text-[20px] font-bold">{title}</p>
        <p className="text-label">{text}</p>
      </div>
      {action}
    </div>
  );
}
