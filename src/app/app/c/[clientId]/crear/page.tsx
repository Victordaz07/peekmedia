import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { aiReady } from "@/lib/ai/claude";
import { getPost, listPosts } from "@/lib/data/posts";
import { listAccounts } from "@/lib/data/social";
import { bestTime, heatmap } from "@/lib/social/analytics";
import { space } from "../space";
import { Composer } from "./composer";

export const metadata: Metadata = { title: "Crear publicación" };

/** El copiloto de Claude investiga y escribe: puede tardar más de un minuto. */
export const maxDuration = 300;

export default function CrearPage({ params, searchParams }: PageProps<"/app/c/[clientId]/crear">) {
  return (
    <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
      <Crear params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Crear({ params, searchParams }: Pick<PageProps<"/app/c/[clientId]/crear">, "params" | "searchParams">) {
  const s = await space(params, searchParams);
  if (!s.isTeam) redirect(`${s.base}/calendario${s.q}`);
  const editId = s.one("editar");
  const post = editId ? await getPost(editId) : null;
  if (editId && (!post || post.clientId !== s.client.id)) notFound();
  if (post?.status === "published") redirect(`${s.base}/calendario?post=${post.id}`);
  const fecha = s.one("fecha");
  const [posts, accounts] = await Promise.all([listPosts(s.client.id), listAccounts(s.client.id)]);

  return (
    <Composer
      clientId={s.client.id}
      handle={s.client.handle}
      networks={s.client.platforms}
      connected={Object.fromEntries(accounts.map((a) => [a.platform, a.status === "connected" ? a.mode : null]))}
      best={bestTime(heatmap(posts).grid)}
      post={post}
      date={fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null}
      aiReady={aiReady()}
    />
  );
}
