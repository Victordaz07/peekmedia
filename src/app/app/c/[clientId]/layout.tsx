import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app/shell";
import { SpaceSidebar } from "@/components/app/sidebar";
import { Skeleton } from "@/components/ui";
import { requireClientAccess } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { SpaceHeading } from "./space-heading";

export default function ClientSpaceLayout({ children, params }: LayoutProps<"/app/c/[clientId]">) {
  return (
    <AppShell sidebar={<Sidebar params={params} />}>
      <Suspense fallback={<Skeleton className="h-32 w-full rounded-md" />}>
        <SpaceHeader params={params} />
      </Suspense>
      {children}
    </AppShell>
  );
}

async function Sidebar({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <SpaceSidebar clientId={clientId} />;
}

async function SpaceHeader({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const viewer = await requireClientAccess(clientId);
  const client = await getClient(clientId);
  if (!client) notFound();
  return <SpaceHeading clientId={clientId} name={client.name} industry={client.industry} platforms={client.platforms} isTeam={viewer.kind === "team"} />;
}
