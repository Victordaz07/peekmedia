import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { listPosts } from "@/lib/data/posts";
import { space } from "../space";
import { ApprovalsView } from "./approvals-view";

export const metadata: Metadata = { title: "Aprobaciones" };

export default function AprobacionesPage({ params, searchParams }: PageProps<"/app/c/[clientId]/aprobaciones">) {
  return (
    <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
      <Aprobaciones params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Aprobaciones({ params, searchParams }: Pick<PageProps<"/app/c/[clientId]/aprobaciones">, "params" | "searchParams">) {
  const s = await space(params, searchParams);
  const posts = (await listPosts(s.client.id, { hideDrafts: true })).filter((p) => ["pending", "changes", "approved"].includes(p.status));
  return (
    <ApprovalsView
      handle={s.client.handle}
      posts={posts}
      perms={{ isTeam: s.isTeam, canReview: s.canReview }}
      roleNote={s.asClient && !s.canReview ? "Tu rol es de solo lectura: un Administrador o Aprobador de tu negocio aprueba las publicaciones." : null}
      openId={s.one("post") ?? null}
    />
  );
}
