"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reviewPostAction } from "@/app/app/c/[clientId]/post-actions";
import { platNames, statusPill } from "@/components/posts/overview";
import { PostDrawer, type Perms } from "@/components/posts/post-drawer";
import { Button, buttonStyles, EmptyState, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dayTimeRD } from "@/lib/format";
import { postTypeLabel } from "@/lib/social/platforms";
import type { Post } from "@/lib/social/schema";

const order = { pending: 0, changes: 1, approved: 2 } as Record<string, number>;
const tones = ["bg-cyan text-ink", "bg-ocean text-white", "bg-ink text-white"];

/** Tarjetas de aprobación del prototipo: bloque de color con el formato, fecha, redes, texto y acciones. */
export function ApprovalsView({ handle, posts, perms, roleNote, openId }: { handle: string; posts: Post[]; perms: Perms; roleNote: string | null; openId: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState<{ id: string; asking: boolean } | null>(openId ? { id: openId, asking: false } : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const current = posts.find((p) => p.id === open?.id) ?? null;
  const list = [...posts].sort((a, b) => order[a.status] - order[b.status] || (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));

  if (!posts.length) {
    return <EmptyState icon={CheckCircle2} title="Todo al día" description="No hay publicaciones esperando aprobación." className="bg-surface" />;
  }

  function approve(id: string) {
    setBusy(id);
    start(async () => {
      const res = await reviewPostAction(id, "approve", "");
      setBusy(null);
      if (!res.ok) return toast({ title: res.error, tone: "error" });
      toast({ title: "¡Aprobada! Se publicará en la fecha programada.", tone: "success" });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {roleNote && <p className="rounded-item bg-surface px-4 py-3 text-label">{roleNote}</p>}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
        {list.map((p, i) => {
          const pill = statusPill[p.status];
          const cover = p.media.find((m) => m.mime.startsWith("image/"));
          const reviewable = perms.canReview && (p.status === "pending" || p.status === "changes");
          return (
            <li key={p.id} className="flex flex-col overflow-hidden rounded-md bg-surface">
              <button
                type="button"
                onClick={() => setOpen({ id: p.id, asking: false })}
                className={cn("relative flex aspect-[4/3] items-end justify-between gap-2 bg-cover bg-center p-4 text-left", !cover && tones[i % tones.length])}
                style={cover ? { backgroundImage: `url(${cover.url})` } : undefined}
                aria-label={`Ver ${postTypeLabel[p.type]}`}
              >
                <span className={cn("font-display text-h3 font-bold", cover && "rounded-sm bg-ink/70 px-2 text-white")}>{postTypeLabel[p.type]}</span>
                <span className={cn("rounded-full px-2.5 py-1 text-eyebrow font-bold", pill.className)}>{pill.label}</span>
              </button>
              <div className="flex flex-1 flex-col gap-3 p-[18px]">
                <p className="text-caption font-bold">
                  {p.scheduledAt ? dayTimeRD(p.scheduledAt) : "Sin fecha"} · {platNames(p.platforms)}
                </p>
                <p className="line-clamp-3 text-button">{p.caption || postTypeLabel[p.type]}</p>
                {p.feedback && p.status === "changes" && <p className="rounded-sm bg-coral-tint px-3 py-2 text-caption">“{p.feedback}”</p>}
                <div className="mt-auto flex gap-2">
                  {reviewable ? (
                    <>
                      <Button variant="dark" className="flex-1" loading={busy === p.id} onClick={() => approve(p.id)}>
                        Aprobar
                      </Button>
                      <Button variant="outline" className="flex-1 border-line" onClick={() => setOpen({ id: p.id, asking: true })}>
                        Pedir cambios
                      </Button>
                    </>
                  ) : perms.isTeam ? (
                    <>
                      <Button variant="dark" className="flex-1" onClick={() => setOpen({ id: p.id, asking: false })}>
                        Ver detalle
                      </Button>
                      <Link href={`/app/c/${p.clientId}/crear?editar=${p.id}`} className={buttonStyles({ variant: "outline", className: "flex-1 border-line" })}>
                        Editar
                      </Link>
                    </>
                  ) : (
                    <Button variant="dark" className="flex-1" onClick={() => setOpen({ id: p.id, asking: false })}>
                      Ver detalle
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <PostDrawer post={current} handle={handle} perms={perms} asking={open?.asking} onClose={() => setOpen(null)} />
    </div>
  );
}
