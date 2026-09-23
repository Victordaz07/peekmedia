import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { isClientAdmin, requireClientAccess } from "@/lib/auth";
import { getAgency } from "@/lib/contracts/agency";
import { contractPlans, DEFAULT_PLAN_ID } from "@/lib/contracts/catalog";
import { contractSections, paymentSchedule, type ContractSection } from "@/lib/contracts/document";
import { defaultTerms, termsOf } from "@/lib/contracts/terms";
import { getClient } from "@/lib/data/clients";
import { getSiteContent } from "@/lib/data/content";
import { listContracts, listPayments, listPlanRequests } from "@/lib/data/contracts";
import { listPosts } from "@/lib/data/posts";
import { listAccounts } from "@/lib/data/social";
import { monthUsage } from "@/lib/social/analytics";
import { PlanView, type PlanMode } from "./plan-view";

export const metadata: Metadata = { title: "Plan y contrato" };

export default function PlanPage({ params, searchParams }: PageProps<"/app/c/[clientId]/plan">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando contrato…" className="rounded-md bg-surface" />}>
      <Plan params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Plan({ params, searchParams }: Pick<PageProps<"/app/c/[clientId]/plan">, "params" | "searchParams">) {
  const { clientId } = await params;
  const { vista } = await searchParams;
  const viewer = await requireClientAccess(clientId);
  const mode: PlanMode = viewer.kind === "client" ? "client" : vista === "cliente" ? "preview" : "team";

  const client = await getClient(clientId);
  if (!client) notFound();
  const [all, requests, payments, content, agency, posts, accounts] = await Promise.all([
    listContracts(clientId),
    listPlanRequests(clientId),
    listPayments(clientId),
    getSiteContent(),
    getAgency(),
    listPosts(clientId, { hideDrafts: true }),
    listAccounts(clientId),
  ]);
  const usage = { ...monthUsage(posts), networks: accounts.filter((a) => a.status === "connected").length };

  // El cliente nunca ve borradores (RLS ya los oculta en Supabase; aquí también, por si acaso).
  const versions = mode === "team" ? all : all.filter((c) => c.status !== "draft");
  const current = versions[0] ?? null;
  const catalog = contractPlans(content.plans);

  // Firmado: se muestra el texto exacto que se firmó. Si no, se genera con los datos actuales.
  const sections: ContractSection[] = current
    ? current.signature
      ? (JSON.parse(current.signature.document) as { sections: ContractSection[] }).sections
      : contractSections(current, client, agency)
    : [];
  const signed = versions.find((c) => c.status === "signed");
  const fallbackPlan = catalog.find((p) => p.id === DEFAULT_PLAN_ID) ?? catalog[0];

  return (
    <PlanView
      mode={mode}
      canSign={isClientAdmin(viewer) && current?.status === "sent"}
      isClientAdmin={isClientAdmin(viewer)}
      client={{ id: client.id, name: client.name, contactName: client.contactName }}
      agency={agency}
      current={current}
      sections={sections}
      history={versions.slice(1).map((c) => ({ id: c.id, version: c.version, planName: c.planName, status: c.status, signedAt: c.signedAt, sentAt: c.sentAt }))}
      catalog={catalog}
      requests={requests}
      schedule={signed ? paymentSchedule(signed, payments) : []}
      usage={usage}
      editorInitial={current ? termsOf(current) : fallbackPlan ? defaultTerms(fallbackPlan) : null}
    />
  );
}
