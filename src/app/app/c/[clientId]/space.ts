import "server-only";
import { notFound } from "next/navigation";
import { requireClientAccess } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";

/** Lo común de cada página del espacio: acceso, cliente y si se ve como cliente (?vista=cliente). */
export async function space(params: Promise<{ clientId: string }>, searchParams?: Promise<Record<string, string | string[] | undefined>>) {
  const { clientId } = await params;
  const sp = (await searchParams) ?? {};
  const viewer = await requireClientAccess(clientId);
  const client = await getClient(clientId);
  if (!client) notFound();
  const preview = viewer.kind === "team" && sp.vista === "cliente";
  const asClient = viewer.kind === "client" || preview;
  const base = `/app/c/${clientId}`;
  const q = preview ? "?vista=cliente" : "";
  const canReview = viewer.kind === "client" && (viewer.role === "admin" || viewer.role === "approver");
  const canManage = viewer.kind === "team" || viewer.role === "admin";
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return { viewer, client, preview, asClient, base, q, canReview, canManage, isTeam: viewer.kind === "team" && !preview, one };
}
