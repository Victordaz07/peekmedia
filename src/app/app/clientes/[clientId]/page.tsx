import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar, ButtonLink, LoadingState, StatusBadge } from "@/components/ui";
import { requireTeam } from "@/lib/auth";
import * as clients from "@/lib/data/clients";
import { ClientFicha } from "./ficha";

export const metadata: Metadata = { title: "Ficha del cliente" };

export default function FichaPage({ params, searchParams }: PageProps<"/app/clientes/[clientId]">) {
  return (
    <>
      <ButtonLink href="/app/clientes" variant="ghost" size="sm" className="self-start" iconLeft={<ArrowLeft className="size-4" />}>
        Clientes
      </ButtonLink>
      <Suspense fallback={<LoadingState label="Cargando ficha…" className="rounded-md bg-surface" />}>
        <Ficha params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Ficha({ params, searchParams }: Pick<PageProps<"/app/clientes/[clientId]">, "params" | "searchParams">) {
  await requireTeam();
  const { clientId } = await params;
  const { nuevo } = await searchParams;
  const client = await clients.getClient(clientId);
  if (!client) notFound();
  const [users, notes, tasks] = await Promise.all([clients.listClientUsers(clientId), clients.listNotes(clientId), clients.listTasks(clientId)]);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={client.name} color={client.avatarColor} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-display-sm font-bold tracking-[-0.04em]">{client.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-label text-muted">
              <StatusBadge kind="client" status={client.status} />
              {client.industry && <span>{client.industry}</span>}
              {client.handle && <span>· @{client.handle}</span>}
            </div>
          </div>
        </div>
        <ButtonLink href={`/app/c/${client.id}`} variant="dark" iconRight={<ExternalLink className="size-4" />}>
          Abrir espacio
        </ButtonLink>
      </header>
      {nuevo && (
        <p role="status" className="rounded-item bg-cyan-tint px-4 py-3 text-label">
          <strong>Espacio creado</strong> con un contrato en borrador. Invita a las personas del cliente en “Accesos” y envía el
          contrato desde su espacio, en “Plan y contrato”.
        </p>
      )}
      <ClientFicha client={client} users={users} notes={notes} tasks={tasks} initialTab={nuevo ? "access" : "data"} />
    </>
  );
}
