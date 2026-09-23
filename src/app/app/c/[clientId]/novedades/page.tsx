import { Info, PartyPopper, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar, Card, CardTitle, EmptyState, LoadingState } from "@/components/ui";
import { networks } from "@/lib/design/tokens";
import { listClientNotes, listInbox, listMetrics } from "@/lib/data/insights";
import { listPosts } from "@/lib/data/posts";
import { listAccounts } from "@/lib/data/social";
import { cn } from "@/lib/cn";
import { formatDateTimeRD } from "@/lib/format";
import { daysAgo, newsFeed } from "@/lib/social/analytics";
import { space } from "../space";
import { NoteComposer, DeleteNote } from "./notes";

export const metadata: Metadata = { title: "Novedades" };

export default function NovedadesPage({ params, searchParams }: PageProps<"/app/c/[clientId]/novedades">) {
  return (
    <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
      <Novedades params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const icons = { good: PartyPopper, attention: TriangleAlert, info: Info };
const bg = { good: "bg-cyan-tint", attention: "bg-coral-tint", info: "bg-hairline" };

async function Novedades({ params, searchParams }: Pick<PageProps<"/app/c/[clientId]/novedades">, "params" | "searchParams">) {
  const s = await space(params, searchParams);
  const [rows, posts, reviews, accounts, notes] = await Promise.all([
    listMetrics(s.client.id, daysAgo(70)),
    listPosts(s.client.id, { hideDrafts: s.asClient }),
    listInbox(s.client.id, { reviewsOnly: true }),
    listAccounts(s.client.id),
    listClientNotes(s.client.id),
  ]);
  const since = new Date(new Date().getTime() - 30 * 86_400_000).toISOString();
  const feed = newsFeed({
    rows,
    posts,
    pendingApprovals: posts.filter((p) => p.status === "pending").length,
    reviews: reviews.filter((r) => r.receivedAt >= since),
    toConnect: s.client.platforms.filter((p) => !accounts.some((a) => a.platform === p && a.status === "connected")).map((p) => networks[p].label),
    base: s.base,
  });

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-h3 font-bold">Lo que pasó en tus redes</h2>
        {feed.length ? (
          <ul className="flex flex-col gap-2">
            {feed.map((n) => {
              const Icon = icons[n.tone];
              const body = (
                <>
                  <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
                  <span>{n.text}</span>
                </>
              );
              return (
                <li key={n.text}>
                  {n.href ? (
                    <Link href={`${n.href}${s.q}`} className={cn("flex items-start gap-3 rounded-item p-4 text-label hover:shadow-hover", bg[n.tone])}>
                      {body}
                    </Link>
                  ) : (
                    <p className={cn("flex items-start gap-3 rounded-item p-4 text-label", bg[n.tone])}>{body}</p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Sin novedades todavía" description="Aquí verás hitos, tus mejores publicaciones y avisos importantes." className="bg-surface" />
        )}
      </section>

      <Card className="gap-4">
        <CardTitle>Notas de tu community manager</CardTitle>
        {s.isTeam && <NoteComposer clientId={s.client.id} />}
        {notes.length ? (
          <ul className="flex flex-col gap-3">
            {notes.map((n) => (
              <li key={n.id} className="flex gap-3">
                <Avatar name={n.byName} size="sm" />
                <div className="min-w-0 flex-1 rounded-item bg-hairline/60 px-4 py-3">
                  <p className="flex items-center justify-between gap-2 text-caption font-semibold text-muted">
                    {n.byName} · {formatDateTimeRD(n.at)}
                    {s.isTeam && <DeleteNote clientId={s.client.id} noteId={n.id} />}
                  </p>
                  <p className="mt-1 text-label whitespace-pre-line">{n.text}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-label text-muted">{s.isTeam ? "Escríbele al cliente qué se hizo este mes, ideas o recordatorios." : "Tu agencia te dejará aquí notas sobre tu estrategia."}</p>
        )}
      </Card>
    </div>
  );
}
