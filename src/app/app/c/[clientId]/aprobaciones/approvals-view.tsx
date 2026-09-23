"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { PostDrawer, type Perms } from "@/components/posts/post-drawer";
import { PostPreview } from "@/components/posts/post-preview";
import { EmptyState, NetworkChip, StatusBadge } from "@/components/ui";
import { formatDateTimeRD } from "@/lib/format";
import type { Post } from "@/lib/social/schema";

const groups = [
  { status: "pending", title: "Por aprobar" },
  { status: "changes", title: "Cambios pedidos" },
  { status: "approved", title: "Aprobadas, esperando fecha" },
] as const;

export function ApprovalsView({ handle, posts, perms, roleNote, openId }: { handle: string; posts: Post[]; perms: Perms; roleNote: string | null; openId: string | null }) {
  const [open, setOpen] = useState<string | null>(openId);
  const current = posts.find((p) => p.id === open) ?? null;

  if (!posts.length) {
    return <EmptyState icon={CheckCircle2} title="Todo al día" description="No hay publicaciones esperando aprobación." className="bg-surface" />;
  }

  return (
    <div className="flex flex-col gap-6">
      {roleNote && <p className="rounded-item bg-hairline px-4 py-3 text-label">{roleNote}</p>}
      {groups.map((g) => {
        const list = posts.filter((p) => p.status === g.status);
        if (!list.length) return null;
        return (
          <section key={g.status} className="flex flex-col gap-3">
            <h2 className="font-display text-h3 font-bold">
              {g.title} <span className="text-muted">· {list.length}</span>
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setOpen(p.id)} className="flex w-full flex-col gap-3 rounded-md bg-surface p-4 text-left transition-shadow hover:shadow-hover">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge kind="post" status={p.status} />
                      <span className="text-caption font-semibold text-muted">{p.scheduledAt ? formatDateTimeRD(p.scheduledAt) : "Sin fecha"}</span>
                    </div>
                    <PostPreview handle={handle} type={p.type} caption={p.caption} media={p.media} className="pointer-events-none" />
                    <div className="flex flex-wrap gap-1.5">
                      {p.platforms.map((n) => (
                        <NetworkChip key={n} network={n} className="px-2.5 py-1 text-caption" />
                      ))}
                    </div>
                    {p.status === "pending" && perms.canReview && <span className="text-label font-bold underline decoration-coral decoration-2 underline-offset-4">Revisar y aprobar</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <PostDrawer post={current} handle={handle} perms={perms} onClose={() => setOpen(null)} />
    </div>
  );
}
