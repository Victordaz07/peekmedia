"use client";

import { Pencil, Printer } from "lucide-react";
import { useState } from "react";
import { Button, Card, CardTitle, EmptyState, StatusBadge, UsageBar } from "@/components/ui";
import { money } from "@/lib/content/helpers";
import { deliverableKeys, deliverableLabel, type ContractPlan, type DeliverableKey } from "@/lib/contracts/catalog";
import { contractEnd, nextPayment, type Agency, type ContractSection, type ScheduleRow } from "@/lib/contracts/document";
import type { Contract, ContractTerms, PlanRequest } from "@/lib/contracts/schema";
import { longDate, shortDate, todayRD } from "@/lib/format";
import { ContractEditor } from "./contract-editor";
import { ContractPaper } from "./contract-paper";
import { HistoryCard, PaymentsCard, RequestsCard, UpgradeCard } from "./side-cards";
import { SignPanel } from "./sign-panel";

/** team: el equipo edita · client: la persona del cliente · preview: el equipo viendo como cliente */
export type PlanMode = "team" | "client" | "preview";

export type HistoryItem = Pick<Contract, "id" | "version" | "planName" | "status" | "signedAt" | "sentAt">;

export function PlanView(props: {
  mode: PlanMode;
  canSign: boolean;
  isClientAdmin: boolean;
  client: { id: string; name: string; contactName: string };
  agency: Agency;
  current: Contract | null;
  sections: ContractSection[];
  history: HistoryItem[];
  catalog: ContractPlan[];
  requests: PlanRequest[];
  schedule: ScheduleRow[];
  editorInitial: ContractTerms | null;
  /** Uso del mes en curso (publicado + programado) y redes conectadas. */
  usage: Partial<Record<DeliverableKey, number>>;
}) {
  const { mode, current, catalog, client } = props;
  const isTeam = mode === "team";
  const [editing, setEditing] = useState<ContractTerms | null>(null);

  const startEdit = (patch?: Partial<ContractTerms>) => {
    if (!props.editorInitial) return;
    setEditing({ ...props.editorInitial, ...patch });
    requestAnimationFrame(() => document.getElementById("editor")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  if (!current && !isTeam) {
    return (
      <EmptyState
        title="Tu contrato aparece aquí"
        description="Cuando tu agencia te lo envíe, lo revisas y lo firmas desde esta página, sin papeles."
        className="bg-surface"
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {mode === "preview" && (
        <p className="rounded-item bg-cyan-tint px-4 py-3 text-label">
          <strong>Vista previa:</strong> así ve esta página un Administrador del cliente. Los botones no hacen cambios.
        </p>
      )}

      {current ? <Hero contract={current} usage={props.usage} /> : <NoContract onCreate={() => startEdit()} />}

      {isTeam && editing && (
        <ContractEditor
          clientId={client.id}
          catalog={catalog}
          initial={editing}
          signed={current?.status === "signed"}
          onDone={() => setEditing(null)}
        />
      )}

      {current && (
        <div className="flex flex-wrap items-center gap-3" data-noprint>
          <Button
            variant="dark"
            iconLeft={<Printer className="size-4" />}
            onClick={() => {
              document.body.classList.add("print-contract");
              window.print();
              document.body.classList.remove("print-contract");
            }}
          >
            Imprimir o guardar PDF
          </Button>
          {isTeam && !editing && (
            <Button variant="outline" iconLeft={<Pencil className="size-4" />} onClick={() => startEdit()}>
              Editar plan y condiciones
            </Button>
          )}
        </div>
      )}

      {current && (
        <div className="flex flex-wrap items-start gap-5">
          <ContractPaper contract={current} sections={props.sections} agency={props.agency} client={client} showDraftNotice={isTeam} />
          <div className="flex min-w-0 flex-[2_1_320px] flex-col gap-5" data-noprint>
            {current.status === "sent" && (props.canSign || mode === "preview") && (
              <SignPanel contractId={current.id} preview={mode === "preview"} defaultName={client.contactName} />
            )}
            <WaitingNote mode={mode} status={current.status} isClientAdmin={props.isClientAdmin} />
            <UpgradeCard
              mode={mode}
              clientId={client.id}
              current={current}
              catalog={catalog}
              requests={props.requests}
              isClientAdmin={props.isClientAdmin}
              onPrepare={(patch) => startEdit(patch)}
            />
            <RequestsCard mode={mode} requests={props.requests} catalog={catalog} />
            <PaymentsCard mode={mode} clientId={client.id} schedule={props.schedule} />
            <HistoryCard history={props.history} />
          </div>
        </div>
      )}
    </div>
  );
}

function Hero({ contract: c, usage }: { contract: Contract; usage: Partial<Record<DeliverableKey, number>> }) {
  const today = todayRD();
  const end = contractEnd(c);
  const renewal = c.status === "signed" && end < today;
  return (
    <div className="flex flex-wrap items-stretch gap-5" data-noprint>
      <Card variant="ink" className="min-w-0 flex-[2_1_420px] gap-5 p-[26px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-eyebrow font-bold tracking-[0.12em] uppercase">Plan contratado</span>
            <span className="font-display text-h1 leading-none font-bold tracking-[-0.03em]">{c.planName}</span>
          </div>
          <StatusBadge kind="contract" status={c.status} />
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-3">
          <Fact label="Inversión mensual" value={money(c.price)} />
          <Fact label="Inicio" value={longDate(c.startDate)} />
          {renewal ? (
            <Fact label="Renovación" value={`Mes a mes desde ${shortDate(end, false)}`} />
          ) : (
            <Fact label="Vigente hasta" value={shortDate(end)} />
          )}
          {c.status === "signed" && <Fact label="Próximo pago" value={shortDate(nextPayment(c, today), false)} />}
        </dl>
        {c.extras.length + c.addons.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {[...c.extras, ...c.addons].map((x) => (
              <li key={x} className="rounded-full bg-white/12 px-3 py-1.5 text-caption font-semibold">
                {x}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="min-w-0 flex-[1_1_300px] gap-3">
        <div className="flex flex-col gap-0.5">
          <CardTitle>Qué incluye cada mes</CardTitle>
          <p className="text-caption text-muted">Uso de este mes: lo publicado y lo programado.</p>
        </div>
        <div className="flex flex-col gap-3">
          {deliverableKeys
            .filter((k) => usage[k] !== undefined && c.deliverables[k] > 0)
            .map((k) => (
              <UsageBar key={k} label={deliverableLabel[k]} used={usage[k]!} total={c.deliverables[k]} />
            ))}
        </div>
        <dl className="flex flex-col divide-y divide-hairline">
          {deliverableKeys
            .filter((k) => usage[k] === undefined || c.deliverables[k] === 0)
            .map((k) => (
              <div key={k} className="flex items-baseline justify-between gap-3 py-2 text-label">
                <dt>{deliverableLabel[k]}</dt>
                <dd className="font-display text-[18px] font-bold tabular-nums">{c.deliverables[k]}</dd>
              </div>
            ))}
        </dl>
      </Card>
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

function NoContract({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="Este cliente no tiene contrato"
      description="Prepara el contrato con el plan, el precio y los entregables; después lo envías para firma."
      action={<Button onClick={onCreate}>Preparar contrato</Button>}
      className="bg-surface"
    />
  );
}

function WaitingNote({ mode, status, isClientAdmin }: { mode: PlanMode; status: Contract["status"]; isClientAdmin: boolean }) {
  const text =
    mode === "team" && status === "sent"
      ? "Esperando la firma del cliente. Lo verá como pendiente apenas entre a su panel."
      : mode === "team" && status === "draft"
        ? "Este contrato está en borrador. El cliente no lo ve hasta que lo envíes para firma."
        : mode === "client" && status === "sent" && !isClientAdmin
          ? "Tu contrato está pendiente de firma por un Administrador de tu negocio."
          : null;
  if (!text) return null;
  return <p className="rounded-md bg-surface p-5 text-label">{text}</p>;
}
