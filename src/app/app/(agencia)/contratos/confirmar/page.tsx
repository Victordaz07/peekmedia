import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, Card, LoadingState } from "@/components/ui";
import { getViewer, requireTeam } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { findEndRequest } from "@/lib/data/contract-end";
import { getContract } from "@/lib/data/contracts";
import { formatDateTimeRD, longDate } from "@/lib/format";
import { ConfirmEnd } from "./confirm-button";

export const metadata: Metadata = { title: "Confirmar cierre de contrato", robots: { index: false, follow: false } };

export default function ConfirmarPage({ searchParams }: PageProps<"/app/contratos/confirmar">) {
  return (
    <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
      <Confirmar searchParams={searchParams} />
    </Suspense>
  );
}

/** Abrir el enlace no cambia nada (los correos a veces abren enlaces solos): hay que tocar el botón. */
async function Confirmar({ searchParams }: Pick<PageProps<"/app/contratos/confirmar">, "searchParams">) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : "";
  if (!(await getViewer())) redirect(`/login?next=${encodeURIComponent(`/app/contratos/confirmar?t=${token}`)}`);
  const viewer = await requireTeam();
  const request = token ? await findEndRequest(token) : null;

  const stop = (title: string, text: string) => (
    <Card padding="lg" className="max-w-[640px] gap-4">
      <h1 className="font-display text-h2 font-bold">{title}</h1>
      <p className="text-body">{text}</p>
      <ButtonLink href="/app" variant="dark" className="self-start">
        Ir al inicio
      </ButtonLink>
    </Card>
  );

  if (!request || request.requestedBy !== viewer.id || viewer.role !== "owner") {
    return stop("Enlace no válido", "Este enlace no existe o no es para tu cuenta. Ábrelo con la misma cuenta de dueño que pidió el cambio.");
  }
  if (request.confirmedAt) return stop("Ya confirmado", `Este cambio se confirmó el ${formatDateTimeRD(request.confirmedAt)}.`);
  if (new Date(request.expiresAt).getTime() <= new Date().getTime()) {
    return stop("El enlace venció", "Por seguridad, el enlace dura 30 minutos y solo sirve una vez. Pídelo de nuevo desde el contrato del cliente.");
  }

  const contract = await getContract(request.contractId);
  const client = contract ? await getClient(contract.clientId) : null;
  if (!contract || !client) return stop("Contrato no encontrado", "El contrato de este enlace ya no existe.");
  const voiding = request.action === "void";

  return (
    <Card padding="lg" className="max-w-[640px] gap-5">
      <div className="flex flex-col gap-1.5">
        <span className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">Confirmación del dueño</span>
        <h1 className="font-display text-h2 font-bold">{voiding ? "Anular" : "Finalizar"} el contrato de {client.name}</h1>
      </div>
      <dl className="grid gap-3 rounded-item bg-hairline/60 p-4 text-label sm:grid-cols-[160px_1fr]">
        <dt className="font-bold">Contrato</dt>
        <dd>
          {contract.number} v{contract.version} · {contract.planName}
        </dd>
        <dt className="font-bold">{voiding ? "Qué pasa" : "Finaliza el"}</dt>
        <dd>{voiding ? "El cliente ya no podrá firmarlo." : longDate(request.endDate)}</dd>
        <dt className="font-bold">Motivo</dt>
        <dd className="whitespace-pre-line">{request.reason}</dd>
        <dt className="font-bold">Pedido</dt>
        <dd>
          {request.requestedByName} · {formatDateTimeRD(request.createdAt)}
        </dd>
      </dl>
      <p className="rounded-item bg-coral-tint px-4 py-3 text-label">
        No se puede deshacer. {voiding ? "" : "La firma y el documento firmado se conservan como respaldo. "}Se le avisará por correo a los Administradores del cliente.
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <ConfirmEnd token={token} label={voiding ? "Sí, anular el contrato" : "Sí, finalizar el contrato"} />
        <ButtonLink href={`/app/c/${client.id}/plan`} variant="ghost">
          Cancelar
        </ButtonLink>
      </div>
    </Card>
  );
}
