import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadingState, NetworkDot } from "@/components/ui";
import { networks } from "@/lib/design/tokens";
import { requireTeam } from "@/lib/auth";
import * as clients from "@/lib/data/clients";
import { ClientsSplit } from "../clients-split";
import { ClientFicha } from "./ficha";

export const metadata: Metadata = { title: "Ficha del cliente" };

export default function FichaPage({ params, searchParams }: PageProps<"/app/clientes/[clientId]">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando ficha…" className="rounded-md bg-surface" />}>
      <Ficha params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Ficha({ params, searchParams }: Pick<PageProps<"/app/clientes/[clientId]">, "params" | "searchParams">) {
  await requireTeam();
  const { clientId } = await params;
  const { nuevo } = await searchParams;
  const client = await clients.getClient(clientId);
  if (!client) notFound();
  const [all, users, notes, tasks] = await Promise.all([clients.listClients(), clients.listClientUsers(clientId), clients.listNotes(clientId), clients.listTasks(clientId)]);

  return (
    <>
      <header className="flex flex-col gap-2.5">
        <p className="text-caption font-semibold tracking-[0.12em] uppercase">Gestión de clientes</p>
        <h1 className="font-display text-display-sm leading-[0.95] font-bold tracking-[-0.04em]">{client.name}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          {client.industry && <span className="mr-1.5 text-label">{client.industry}</span>}
          {client.platforms.map((p) => (
            <span key={p} className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-[5px] text-eyebrow font-semibold">
              <NetworkDot network={p} className="size-2" />
              {networks[p].label}
            </span>
          ))}
        </div>
      </header>
      {nuevo && (
        <p role="status" className="rounded-item bg-cyan-tint px-4 py-3 text-label">
          <strong>Espacio creado</strong> con un contrato en borrador. Invita a las personas del cliente en “Accesos” y envía el
          contrato desde su espacio, en “Plan y contrato”.
        </p>
      )}
      <ClientsSplit clients={all} selectedId={client.id}>
        <ClientFicha client={client} users={users} notes={notes} tasks={tasks} initialTab={nuevo ? "access" : "data"} />
      </ClientsSplit>
    </>
  );
}
