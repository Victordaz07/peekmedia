"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PostDrawer, type Perms } from "@/components/posts/post-drawer";
import { ButtonLink, EmptyState, NetworkDot } from "@/components/ui";
import { cn } from "@/lib/cn";
import { tones } from "@/lib/design/tokens";
import { postStatus } from "@/lib/design/tokens";
import { addMonths, longDate, monthLabel, timeRD, ymdRD } from "@/lib/format";
import { postTypeLabel } from "@/lib/social/platforms";
import type { Post } from "@/lib/social/schema";

const WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function monthGrid(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

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
  const inMonth = cells.filter((c): c is string => !!c && byDay.has(c));
  const nav = (n: number) => `${base}/calendario?mes=${addMonths(`${month}-01`, n).slice(0, 7)}${q && `&${q.slice(1)}`}`;
  const current = posts.find((p) => p.id === open) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link href={nav(-1)} aria-label="Mes anterior" className="grid size-10 place-items-center rounded-full hover:bg-surface">
            <ChevronLeft className="size-5" />
          </Link>
          <h2 className="min-w-44 text-center font-display text-h2 font-bold first-letter:uppercase">{monthLabel(month)}</h2>
          <Link href={nav(1)} aria-label="Mes siguiente" className="grid size-10 place-items-center rounded-full hover:bg-surface">
            <ChevronRight className="size-5" />
          </Link>
        </div>
        {perms.isTeam && (
          <ButtonLink href={`${base}/crear`} iconLeft={<Plus className="size-4" />}>
            Crear publicación
          </ButtonLink>
        )}
      </div>

      {/* Cuadrícula (tableta y escritorio) */}
      <div className="hidden overflow-hidden rounded-md bg-surface md:block">
        <div className="grid grid-cols-7 border-b border-hairline">
          {WEEK.map((d) => (
            <div key={d} className="px-3 py-2 text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => (
            <div
              key={day ?? `x${i}`}
              className={cn("group relative flex min-h-28 flex-col gap-1 border-hairline p-1.5", i % 7 !== 6 && "border-r", i < cells.length - 7 && "border-b", !day && "bg-hairline/50")}
            >
              {day && (
                <>
                  <span className={cn("grid size-7 place-items-center rounded-full text-caption font-bold", day === today && "bg-ink text-white")}>{Number(day.slice(8))}</span>
                  {(byDay.get(day) ?? []).map((p) => (
                    <PostChip key={p.id} post={p} onClick={() => setOpen(p.id)} />
                  ))}
                  {perms.isTeam && day >= today && (
                    <Link
                      href={`${base}/crear?fecha=${day}`}
                      aria-label={`Crear publicación el ${longDate(day)}`}
                      className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 hover:bg-hairline focus-visible:opacity-100"
                    >
                      <Plus className="size-4" />
                    </Link>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

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
  const s = postStatus[post.status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left text-caption font-semibold", tones[s.tone], large && "py-2 text-label")}
    >
      <span className="flex shrink-0 gap-0.5">
        {post.platforms.slice(0, 3).map((n) => (
          <NetworkDot key={n} network={n} className="size-2 ring-1 ring-white/70" />
        ))}
      </span>
      <span className="truncate">
        {post.scheduledAt && `${timeRD(post.scheduledAt)} · `}
        {post.caption.trim() || postTypeLabel[post.type]}
      </span>
      <span className="sr-only">— {s.label}</span>
    </button>
  );
}
