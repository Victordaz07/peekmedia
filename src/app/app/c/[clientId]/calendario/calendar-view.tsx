"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PostDrawer, type Perms } from "@/components/posts/post-drawer";
import { platShort, statusPill } from "@/components/posts/overview";
import { EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";
import { addMonths, longDate, monthLabel, partsRD, ymdRD } from "@/lib/format";
import { postTypeLabel } from "@/lib/social/platforms";
import type { Post } from "@/lib/social/schema";

const WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Semanas completas del mes (con los días del mes anterior y el siguiente, como el prototipo). */
function monthGrid(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1, 1 + i - lead));
    return { day: d.toISOString().slice(0, 10), inMonth: i >= lead && i < lead + days };
  });
}

const LEGEND = (["published", "scheduled", "pending", "changes", "draft"] as const).map((k) => statusPill[k]);

export function CalendarView({
  clientId,
  handle,
  posts,
  month,
  today,
  q,
  perms,
  openId,
}: {
  clientId: string;
  handle: string;
  posts: Post[];
  month: string;
  today: string;
  q: string;
  perms: Perms;
  openId: string | null;
}) {
  const [open, setOpen] = useState<string | null>(openId);
  const base = `/app/c/${clientId}`;
  const byDay = new Map<string, Post[]>();
  const undated: Post[] = [];
  for (const p of posts) {
    if (!p.scheduledAt) {
      undated.push(p);
      continue;
    }
    const d = ymdRD(p.scheduledAt);
    byDay.set(d, [...(byDay.get(d) ?? []), p]);
  }
  for (const list of byDay.values()) list.sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
  const cells = monthGrid(month);
  const inMonth = cells.filter((c) => c.inMonth && byDay.has(c.day)).map((c) => c.day);
  const nav = (n: number) => `${base}/calendario?mes=${addMonths(`${month}-01`, n).slice(0, 7)}${q && `&${q.slice(1)}`}`;
  const current = posts.find((p) => p.id === open) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Cuadrícula (tableta y escritorio) */}
      <section className="flex flex-col gap-4 rounded-md bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link href={nav(-1)} aria-label="Mes anterior" className="grid size-[38px] place-items-center rounded-full border-[1.5px] border-line bg-surface hover:border-ink/40">
              <ChevronLeft className="size-4" />
            </Link>
            <h2 className="min-w-[200px] text-center font-display text-[26px] font-bold">{monthLabel(month)}</h2>
            <Link href={nav(1)} aria-label="Mes siguiente" className="grid size-[38px] place-items-center rounded-full border-[1.5px] border-line bg-surface hover:border-ink/40">
              <ChevronRight className="size-4" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LEGEND.map((l) => (
              <span key={l.label} className={cn("rounded-full px-2.5 py-1 text-eyebrow font-semibold", l.className)}>
                {l.label}
              </span>
            ))}
          </div>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <div className="grid min-w-[720px] grid-cols-7 gap-1.5">
            {WEEK.map((d) => (
              <div key={d} className="px-2 py-1 text-eyebrow font-bold">
                {d}
              </div>
            ))}
            {cells.map(({ day, inMonth: current }) => {
              const canAdd = perms.isTeam && day >= today;
              return (
                <div
                  key={day}
                  className={cn(
                    "flex min-h-[118px] flex-col gap-1 rounded-[12px] border-[1.5px] p-2",
                    current ? "bg-surface" : "bg-sand/50 opacity-55",
                    day === today ? "border-coral" : "border-hairline",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-bold">{Number(day.slice(8))}</span>
                    {canAdd && (
                      <Link href={`${base}/crear?fecha=${day}`} aria-label={`Crear publicación el ${longDate(day)}`} className="px-0.5 text-[16px] leading-none hover:text-coral-strong">
                        +
                      </Link>
                    )}
                  </div>
                  {(byDay.get(day) ?? []).map((p) => (
                    <PostChip key={p.id} post={p} onClick={() => setOpen(p.id)} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Agenda (móvil) */}
      <div className="flex flex-col gap-3 md:hidden">
        {inMonth.length === 0 && <EmptyState title="Nada en este mes" description={perms.isTeam ? "Toca “Crear publicación” para empezar." : "Tu agencia está preparando el contenido."} className="bg-surface" />}
        {inMonth.map((day) => (
          <section key={day} className="flex flex-col gap-2 rounded-md bg-surface p-4">
            <h3 className={cn("text-label font-bold", day === today && "text-ink underline decoration-cyan decoration-2 underline-offset-4")}>{longDate(day)}</h3>
            {byDay.get(day)!.map((p) => (
              <PostChip key={p.id} post={p} onClick={() => setOpen(p.id)} large />
            ))}
          </section>
        ))}
      </div>

      {perms.isTeam && undated.length > 0 && (
        <section className="flex flex-col gap-2 rounded-md bg-surface p-4">
          <h3 className="text-label font-bold">Borradores sin fecha</h3>
          <div className="flex flex-wrap gap-2">
            {undated.map((p) => (
              <PostChip key={p.id} post={p} onClick={() => setOpen(p.id)} large />
            ))}
          </div>
        </section>
      )}

      <PostDrawer post={current} handle={handle} perms={perms} onClose={() => setOpen(null)} />
    </div>
  );
}

function PostChip({ post, onClick, large }: { post: Post; onClick: () => void; large?: boolean }) {
  const s = statusPill[post.status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full min-w-0 flex-col gap-0.5 rounded-[8px] px-[7px] py-[5px] text-left text-[11px] leading-[1.3]", s.className, large && "px-3 py-2 text-caption")}
    >
      <span className="font-bold">
        {post.scheduledAt ? `${partsRD(post.scheduledAt).time} · ` : ""}
        {platShort(post.platforms)}
      </span>
      <span className="truncate">{post.caption.trim() || postTypeLabel[post.type]}</span>
      <span className="sr-only">— {s.label}</span>
    </button>
  );
}
