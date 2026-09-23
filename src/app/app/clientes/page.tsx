import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink, LoadingState } from "@/components/ui";
import { requireTeam } from "@/lib/auth";
import { listClients } from "@/lib/data/clients";
import { ClientsBoard } from "./clients-board";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-display-sm font-bold tracking-[-0.04em]">Clientes</h1>
          <p className="max-w-[60ch] text-body text-muted">Cada cliente tiene su espacio aislado, su contrato y sus accesos.</p>
        </div>
        <ButtonLink href="/app/clientes/nuevo" iconLeft={<Plus className="size-4" />}>
          Nuevo cliente
        </ButtonLink>
      </header>
      <Suspense fallback={<LoadingState label="Cargando clientes…" className="rounded-md bg-surface" />}>
        <Clients />
      </Suspense>
    </>
  );
}

async function Clients() {
  await requireTeam();
  return <ClientsBoard clients={await listClients()} />;
}
