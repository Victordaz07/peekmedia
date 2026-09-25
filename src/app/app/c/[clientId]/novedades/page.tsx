import { MessageSquareText, PlugZap, TrendingUp, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, LoadingState } from "@/components/ui";
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

const icons = { good: TrendingUp, attention: TriangleAlert, info: PlugZap, note: MessageSquareText };
const bg = { good: "bg-cyan-tint", attention: "bg-coral text-ink", info: "bg-coral-tint", note: "bg-sand" };
const meta = { good: "Últimos 30 días", attention: "Pendiente", info: "Pendiente" };

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

  const items = [
    ...feed.map((n) => ({ key: n.text, tone: n.tone, text: n.text, meta: meta[n.tone], href: n.href, noteId: null as string | null, at: "" })),
    ...notes.map((n) => ({ key: n.id, tone: "note" as const, text: n.text, meta: `${n.byName} · ${formatDateTimeRD(n.at)}`, href: undefined, noteId: n.id, at: n.at })),
  ];

  return (
    <>
      {s.isTeam && <NoteComposer clientId={s.client.id} />}
      {items.length ? (
        <ul className="flex flex-col rounded-md bg-surface px-6 py-2">
          {items.map((n) => {
            const Icon = icons[n.tone];
            const body = (
              <>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", bg[n.tone])}>
                  <Icon aria-hidden className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-button font-bold whitespace-pre-line">{n.text}</span>
                  <span className="text-caption">{n.meta}</span>
                </span>
              </>
            );
            return (
              <li key={n.key} className="flex items-start gap-3 border-b border-hairline py-4 last:border-0">
                {n.href ? (
                  <Link href={`${n.href}${s.q}`} className="flex flex-1 items-start gap-3.5 hover:text-coral-strong">
                    {body}
                  </Link>
                ) : (
                  <div className="flex flex-1 items-start gap-3.5">{body}</div>
                )}
                {s.isTeam && n.noteId && <DeleteNote clientId={s.client.id} noteId={n.noteId} />}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Sin novedades todavía" description="Aquí verás hitos, tus mejores publicaciones, avisos y las notas de tu community manager." className="bg-surface" />
      )}
    </>
  );
}
