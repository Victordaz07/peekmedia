import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink, Card, LoadingState } from "@/components/ui";
import { requireTeam } from "@/lib/auth";
import { emptyClient } from "@/lib/clients/schema";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default function NuevoClientePage({ searchParams }: PageProps<"/app/clientes/nuevo">) {
  return (
    <>
      <ButtonLink href="/app/clientes" variant="ghost" size="sm" className="self-start" iconLeft={<ArrowLeft className="size-4" />}>
        Clientes
      </ButtonLink>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-display-sm font-bold tracking-[-0.04em]">Nuevo cliente</h1>
        <p className="max-w-[60ch] text-body text-muted">
          Se crea su espacio con un contrato en borrador. Después invitas a las personas del cliente y le envías el contrato.
        </p>
      </header>
      <Card padding="lg">
        <Suspense fallback={<LoadingState />}>
          <Guarded searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function Guarded({ searchParams }: Pick<PageProps<"/app/clientes/nuevo">, "searchParams">) {
  await requireTeam();
  // Desde un prospecto: /app/clientes/nuevo?negocio=…&contacto=…
  const { negocio, contacto } = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 80) : "");
  const fromLead = one(negocio) || one(contacto);
  return (
    <ClientForm
      initial={fromLead ? { ...emptyClient, name: one(negocio) || one(contacto), contactName: one(contacto), status: "prospect" } : emptyClient}
    />
  );
}
