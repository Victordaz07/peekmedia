import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { listInbox } from "@/lib/data/insights";
import { space } from "../space";
import { InboxView } from "./inbox-view";

export const metadata: Metadata = { title: "Bandeja" };

export default function BandejaPage({ params, searchParams }: PageProps<"/app/c/[clientId]/bandeja">) {
  return (
    <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
      <Bandeja params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Bandeja({ params, searchParams }: Pick<PageProps<"/app/c/[clientId]/bandeja">, "params" | "searchParams">) {
  const s = await space(params, searchParams);
  if (!s.isTeam) redirect(`${s.base}${s.q}`);
  const items = await listInbox(s.client.id);
  return <InboxView clientId={s.client.id} items={items} networks={s.client.platforms} now={new Date().getTime()} />;
}
