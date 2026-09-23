"use client";

import { ExternalLink, Pencil, RotateCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  deletePostAction,
  listApprovalsAction,
  retryPostAction,
  reviewPostAction,
} from "@/app/app/c/[clientId]/post-actions";
import { Badge, Button, ButtonLink, ConfirmDialog, Drawer, Field, NetworkChip, StatusBadge, Textarea, useToast } from "@/components/ui";
import { compact, formatDateTimeRD } from "@/lib/format";
import { postTypeLabel } from "@/lib/social/platforms";
import type { Approval, Post } from "@/lib/social/schema";
import { PostPreview } from "./post-preview";

export type Perms = { isTeam: boolean; canReview: boolean };

const actionLabel = { approve: "Aprobó", changes: "Pidió cambios", submit: "Envió a aprobación" } as const;

type Props = { post: Post | null; handle: string; perms: Perms; onClose: () => void };

/** Detalle de una publicación: vista previa, estado por red, métricas, historial y acciones según el rol. */
export function PostDrawer(props: Props) {
  if (!props.post) return <Drawer open={false} onClose={props.onClose} title="" />;
  return <PostDetail key={`${props.post.id}:${props.post.version}:${props.post.status}`} {...props} post={props.post} />;
}

function PostDetail({ post, handle, perms, onClose }: Props & { post: Post }) {
  const toast = useToast();
  const router = useRouter();
  const [history, setHistory] = useState<Approval[]>([]);
  const [comment, setComment] = useState("");
  const [asking, setAsking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    listApprovalsAction(post.id).then((h) => live && setHistory(h));
    return () => {
      live = false;
    };
  }, [post.id]);

  const reviewable = perms.canReview && (post.status === "pending" || post.status === "changes");

  function review(action: "approve" | "changes") {
    start(async () => {
      const res = await reviewPostAction(post.id, action, comment);
      if (!res.ok) return toast({ title: res.error, tone: "error" });
      toast({ title: action === "approve" ? "¡Aprobada! Se publicará en la fecha programada." : "Cambios pedidos. Tu agencia ya lo sabe.", tone: "success" });
      onClose();
      router.refresh();
    });
  }

  function retry() {
    start(async () => {
      const res = await retryPostAction(post.id);
      if (!res.ok) return toast({ title: res.error, tone: "error" });
      toast({ title: res.status === "published" ? "Publicada" : "Se reintentó; revisa el estado por red.", tone: res.status === "published" ? "success" : "default" });
      router.refresh();
    });
  }

  const metrics = post.targets.reduce(
    (acc, t) => {
      if (!t.metrics) return acc;
      acc.reach += t.metrics.reach;
      acc.likes += t.metrics.likes;
      acc.comments += t.metrics.comments;
      acc.shares += t.metrics.shares;
      acc.saves += t.metrics.saves;
      return acc;
    },
    { reach: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
  );

  return (
    <Drawer
      open
      onClose={onClose}
      title={postTypeLabel[post.type]}
      description={post.scheduledAt ? formatDateTimeRD(post.scheduledAt) : "Sin fecha"}
      footer={
        perms.isTeam && (
          <>
            {post.status !== "published" && (
              <Button variant="ghost" iconLeft={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)} className="mr-auto hover:bg-coral-tint">
                Borrar
              </Button>
            )}
            {post.status === "failed" && (
              <Button variant="outline" iconLeft={<RotateCw className="size-4" />} loading={pending} onClick={retry}>
                Reintentar
              </Button>
            )}
            {post.status !== "published" && (
              <ButtonLink href={`/app/c/${post.clientId}/crear?editar=${post.id}`} variant="dark" iconLeft={<Pencil className="size-4" />}>
                Editar
              </ButtonLink>
            )}
          </>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge kind="post" status={post.status} />
        <Badge tone="outline">v{post.version}</Badge>
      </div>
      <PostPreview handle={handle} type={post.type} caption={post.caption} media={post.media} />

      <section className="flex flex-col gap-2">
        <h3 className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">Por red</h3>
        <ul className="flex flex-col divide-y divide-hairline rounded-item bg-hairline/50 px-4">
          {post.targets.map((t) => (
            <li key={t.platform} className="flex flex-col gap-1 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <NetworkChip network={t.platform} className="border-0 p-0" />
                <span className="flex items-center gap-2">
                  {post.status !== "draft" && <StatusBadge kind="target" status={t.status} />}
                  {t.url && (
                    <a href={t.url} target="_blank" rel="noopener" aria-label="Ver en la red" className="rounded-sm p-1 hover:bg-hairline">
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </span>
              </div>
              {t.error && post.status !== "draft" && <p className="text-caption text-coral-strong">{t.error}</p>}
            </li>
          ))}
        </ul>
      </section>

      {metrics.reach > 0 && (
        <dl className="grid grid-cols-5 gap-2 rounded-item bg-sand p-3 text-center">
          {(
            [
              ["Alcance", metrics.reach],
              ["Me gusta", metrics.likes],
              ["Coment.", metrics.comments],
              ["Compart.", metrics.shares],
              ["Guard.", metrics.saves],
            ] as const
          ).map(([l, v]) => (
            <div key={l}>
              <dd className="font-display text-[17px] font-bold">{compact(v)}</dd>
              <dt className="text-eyebrow">{l}</dt>
            </div>
          ))}
        </dl>
      )}

      {post.feedback && (
        <p className="rounded-item bg-coral-tint p-3 text-label">
          <strong>Cambios pedidos:</strong> {post.feedback}
        </p>
      )}

      {reviewable && (
        <section className="flex flex-col gap-3 rounded-item ring-2 ring-coral p-4">
          {asking ? (
            <>
              <Field label="¿Qué hay que cambiar?">
                <Textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ej. El precio del latte es RD$ 250, no 225." autoFocus />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button variant="dark" loading={pending} disabled={!comment.trim()} onClick={() => review("changes")}>
                  Enviar comentario
                </Button>
                <Button variant="secondary" onClick={() => setAsking(false)}>
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button loading={pending} onClick={() => review("approve")}>
                Aprobar
              </Button>
              <Button variant="outline" onClick={() => setAsking(true)}>
                Pedir cambios
              </Button>
            </div>
          )}
        </section>
      )}

      {history.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">Historial de versiones</h3>
          <ul className="flex flex-col gap-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-item bg-hairline px-4 py-3 text-label">
                <p>
                  <strong>
                    v{h.version} · {h.byName}
                  </strong>{" "}
                  {actionLabel[h.action].toLowerCase()}
                </p>
                {h.comment && <p className="mt-1">{h.comment}</p>}
                <p className="text-caption text-muted">{formatDateTimeRD(h.at)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Borrar esta publicación?"
        description="Se quita del calendario. Si ya estaba programada, no se publicará."
        confirmLabel="Borrar"
        onConfirm={async () => {
          const res = await deletePostAction(post.id);
          if (!res.ok) return toast({ title: res.error, tone: "error" });
          toast({ title: "Publicación borrada" });
          onClose();
          router.refresh();
        }}
      />
    </Drawer>
  );
}
