import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { aiReady } from "@/lib/ai/claude";
import { listPosts } from "@/lib/data/posts";
import { todayRD } from "@/lib/format";
import { space } from "../space";
import { CalendarView } from "./calendar-view";
import { MonthPlanner } from "./month-planner";

export const metadata: Metadata = { title: "Calendario" };

/** "Plan del mes con Claude" investiga fechas y tendencias: puede tardar. */
export const maxDuration = 300;

export default function CalendarioPage({ params, searchParams }: PageProps<"/app/c/[clientId]/calendario">) {
  return (
    <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
      <Calendario params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Calendario({ params, searchParams }: Pick<PageProps<"/app/c/[clientId]/calendario">, "params" | "searchParams">) {
  const s = await space(params, searchParams);
  const today = todayRD();
  const mes = s.one("mes");
  const month = mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : today.slice(0, 7);
  const posts = await listPosts(s.client.id, { hideDrafts: s.asClient });
  return (
    <div className="flex flex-col gap-4">
      {s.isTeam && month >= today.slice(0, 7) && <MonthPlanner key={month} clientId={s.client.id} month={month} ready={aiReady()} />}
      <CalendarView
        clientId={s.client.id}
        handle={s.client.handle}
        posts={posts}
        month={month}
        today={today}
        q={s.q}
        perms={{ isTeam: s.isTeam, canReview: s.canReview }}
        openId={s.one("post") ?? null}
      />
    </div>
  );
}
