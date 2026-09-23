import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { requireTeam } from "@/lib/auth";
import { listLeads } from "@/lib/data/leads";
import { LeadsBoard } from "./leads-board";

export const metadata: Metadata = { title: "Prospectos" };

export default function ProspectosPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-display-sm font-bold tracking-[-0.04em]">Prospectos</h1>
        <p className="max-w-[60ch] text-body text-muted">
          Cada cotización del sitio llega aquí, aunque la persona no termine de enviar el WhatsApp.
        </p>
      </header>
      <Suspense fallback={<LoadingState label="Cargando prospectos…" className="rounded-md bg-surface" />}>
        <Leads />
      </Suspense>
    </>
  );
}

async function Leads() {
  await requireTeam();
  const leads = await listLeads();
  return <LeadsBoard initial={leads} />;
}
