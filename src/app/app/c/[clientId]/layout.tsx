import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar, Skeleton } from "@/components/ui";
import { requireClientAccess } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { listContracts } from "@/lib/data/contracts";
import { SpaceTabs } from "./space-tabs";

export default function ClientSpaceLayout({ children, params }: LayoutProps<"/app/c/[clientId]">) {
  return (
    <>
      <Suspense fallback={<Skeleton className="h-24 w-full rounded-md" />}>
        <SpaceHeader params={params} />
      </Suspense>
      {children}
    </>
  );
}

async function SpaceHeader({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const viewer = await requireClientAccess(clientId);
  const client = await getClient(clientId);
  if (!client) notFound();
  const latest = (await listContracts(clientId)).find((c) => viewer.kind === "team" || c.status !== "draft");
  const toSign = latest?.status === "sent";

  return (
    <header className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar name={client.name} color={client.avatarColor} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-display-sm font-bold tracking-[-0.04em]">{client.name}</h1>
          <p className="truncate text-label text-muted">
            {[client.industry, client.handle && `@${client.handle}`].filter(Boolean).join(" · ") || "Espacio del cliente"}
          </p>
        </div>
      </div>
      <SpaceTabs clientId={clientId} isTeam={viewer.kind === "team"} planBadge={toSign ? 1 : 0} />
    </header>
  );
}
