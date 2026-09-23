import { BarChart3, FileSignature } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink, Card, CardTitle, EmptyState, LoadingState, NetworkChip, StatusBadge } from "@/components/ui";
import { isClientAdmin, requireClientAccess } from "@/lib/auth";
import { money } from "@/lib/content/helpers";
import { nextPayment } from "@/lib/contracts/document";
import { getClient } from "@/lib/data/clients";
import { listContracts, listPlanRequests } from "@/lib/data/contracts";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Resumen" };

export default function ResumenPage({ params, searchParams }: PageProps<"/app/c/[clientId]">) {
  return (
    <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
      <Resumen params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Resumen({ params, searchParams }: Pick<PageProps<"/app/c/[clientId]">, "params" | "searchParams">) {
  const { clientId } = await params;
  const { vista } = await searchParams;
  const viewer = await requireClientAccess(clientId);
  const asClient = viewer.kind === "client" || vista === "cliente";
  const client = (await getClient(clientId))!;
  const all = await listContracts(clientId);
  const current = asClient ? all.find((c) => c.status !== "draft") : all[0];
  const pending = (await listPlanRequests(clientId)).filter((r) => r.status === "pending");
  const planHref = `/app/c/${clientId}/plan${vista === "cliente" ? "?vista=cliente" : ""}`;
  const canSign = isClientAdmin(viewer);

  return (
    <div className="flex flex-col gap-5">
      {asClient && current?.status === "sent" && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md bg-coral-tint p-5">
          <div className="flex items-start gap-3">
            <FileSignature aria-hidden className="mt-1 size-5 shrink-0" />
            <div>
              <p className="font-display text-h3 font-bold">Tu contrato está listo para firmar</p>
              <p className="text-label">
                {current.planName} · {money(current.price)} al mes.{" "}
                {canSign || viewer.kind === "team" ? "Revísalo y fírmalo desde tu panel, sin papeles." : "Lo firma un Administrador de tu negocio."}
              </p>
            </div>
          </div>
          <ButtonLink href={planHref}>Revisar y firmar</ButtonLink>
        </div>
      )}
      {!asClient && current?.status === "draft" && (
        <p className="rounded-item bg-hairline px-4 py-3 text-label">
          El contrato está en <strong>borrador</strong>: el cliente no lo ve hasta que lo envíes desde{" "}
          <a href={planHref} className="font-semibold underline decoration-cyan decoration-2 underline-offset-4">
            Plan y contrato
          </a>
          .
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {current ? (
          <Card variant="ink" className="gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-eyebrow font-bold tracking-[0.12em] uppercase">Plan contratado</span>
                <span className="font-display text-h1 leading-none font-bold tracking-[-0.03em]">{current.planName}</span>
              </div>
              <StatusBadge kind="contract" status={current.status} />
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              <Fact label="Inversión mensual" value={money(current.price)} />
              {current.status === "signed" && <Fact label="Próximo pago" value={shortDate(nextPayment(current), false)} />}
              <Fact label="Publicaciones al mes" value={String(current.deliverables.posts)} />
            </dl>
            <ButtonLink href={planHref} variant="primary" size="sm" className="self-start">
              Ver plan y contrato
            </ButtonLink>
          </Card>
        ) : (
          <EmptyState
            icon={FileSignature}
            title={asClient ? "Tu contrato aparece aquí" : "Este cliente no tiene contrato"}
            description={asClient ? "Cuando tu agencia te lo envíe, lo revisas y lo firmas desde aquí." : "Prepara uno desde Plan y contrato."}
            className="bg-surface"
          />
        )}

        <Card className="gap-4">
          <CardTitle>Redes</CardTitle>
          <div className="flex flex-wrap gap-2">
            {client.platforms.map((p) => (
              <NetworkChip key={p} network={p} />
            ))}
          </div>
          <p className="text-label text-muted">
            Pronto vas a poder conectarlas desde aquí para ver seguidores, alcance y tus mejores publicaciones.
          </p>
        </Card>
      </div>

      {pending.length > 0 && (
        <Card className="gap-3">
          <CardTitle>Solicitudes pendientes</CardTitle>
          <ul className="flex flex-col gap-2 text-label">
            {pending.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <span>{r.type === "plan" ? `Cambio de plan (${r.target})` : `Agregar: ${r.target}`}</span>
                <StatusBadge kind="request" status={r.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <EmptyState
        icon={BarChart3}
        title="Las métricas llegan cuando conectemos tus redes"
        description="Aquí verás seguidores, alcance, interacción y tus mejores publicaciones del mes, con la hora de la última actualización."
        className="bg-surface"
      />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-eyebrow">{label}</dt>
      <dd className="font-display text-[20px] font-bold">{value}</dd>
    </div>
  );
}
