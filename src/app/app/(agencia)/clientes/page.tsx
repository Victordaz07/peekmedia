import type { Metadata } from "next";
import { Suspense } from "react";
import { KpiTiles } from "@/components/posts/overview";
import { LoadingState } from "@/components/ui";
import { requireTeam } from "@/lib/auth";
import { money } from "@/lib/content/helpers";
import { listClients } from "@/lib/data/clients";
import { ClientsSplit } from "./clients-split";

export const metadata: Metadata = { title: "Gestión de clientes" };

export default function ClientesPage() {
  return (
    <>
      <header className="flex flex-col gap-2.5">
        <p className="text-caption font-semibold tracking-[0.12em] uppercase">Gestión de clientes</p>
        <h1 className="font-display text-display-sm leading-[0.95] font-bold tracking-[-0.04em]">Tus clientes</h1>
      </header>
      <Suspense fallback={<LoadingState label="Cargando clientes…" className="rounded-md bg-surface" />}>
        <Clients />
      </Suspense>
    </>
  );
}

async function Clients() {
  await requireTeam();
  const clients = await listClients();
  const count = (s: string) => clients.filter((c) => c.status === s).length;
  const mrr = clients.filter((c) => c.status === "active").reduce((sum, c) => sum + (c.fee ?? 0), 0);
  return (
    <ClientsSplit clients={clients} selectedId={null}>
      <KpiTiles
        tiles={[
          { label: "Activos", value: String(count("active")), pill: "Con espacio abierto", tone: "up" },
          { label: "Prospectos", value: String(count("prospect")), pill: "Por cerrar", tone: "neutral" },
          { label: "Pausados", value: String(count("paused")), pill: "Sin publicar", tone: "neutral" },
          { label: "Ingreso mensual", value: money(mrr), pill: "Clientes activos", tone: "neutral" },
        ]}
      />
      <p className="rounded-md bg-surface p-8 text-center text-body">Elige un cliente de la lista para ver su ficha y sus accesos.</p>
    </ClientsSplit>
  );
}
