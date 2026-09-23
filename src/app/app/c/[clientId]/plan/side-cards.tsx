"use client";

import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, Card, CardDescription, CardTitle, StatusBadge, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { money } from "@/lib/content/helpers";
import { ADDONS, type ContractPlan } from "@/lib/contracts/catalog";
import type { ScheduleRow } from "@/lib/contracts/document";
import type { Contract, ContractTerms, PlanRequest } from "@/lib/contracts/schema";
import { formatDateTimeRD, monthLabel, shortDate, todayRD } from "@/lib/format";
import { requestChangeAction, resolveRequestAction, setPaymentAction } from "./actions";
import type { HistoryItem, PlanMode } from "./plan-view";

function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return toast({ title: res.error ?? "No se pudo completar", tone: "error" });
      if (success) toast({ title: success, tone: "success" });
      router.refresh();
    });
  return { pending, run };
}

/* ───────── Mejora tu plan ───────── */

export function UpgradeCard({
  mode,
  clientId,
  current,
  catalog,
  requests,
  isClientAdmin,
  onPrepare,
}: {
  mode: PlanMode;
  clientId: string;
  current: Contract;
  catalog: ContractPlan[];
  requests: PlanRequest[];
  isClientAdmin: boolean;
  onPrepare: (patch: Partial<ContractTerms>) => void;
}) {
  const { pending, run } = useAction();
  const currentFrom = catalog.find((p) => p.id === current.planId)?.priceFrom ?? 0;
  const upgrades = catalog.filter((p) => p.priceFrom > currentFrom);
  const addons = ADDONS.filter((a) => !current.addons.includes(a));
  const isPending = (type: PlanRequest["type"], target: string) =>
    requests.some((r) => r.status === "pending" && r.type === type && r.target === target);
  const canRequest = mode === "client" && isClientAdmin;

  function onPlan(p: ContractPlan) {
    if (mode === "team") return onPrepare({ planId: p.id, deliverables: { ...p.deliverables }, price: Math.max(p.priceFrom, current.price) });
    if (canRequest) run(() => requestChangeAction(clientId, "plan", p.id), "Solicitud enviada. Tu agencia te contactará para ajustar el contrato.");
  }

  function onAddon(a: (typeof ADDONS)[number]) {
    if (mode === "team") return onPrepare({ addons: [...current.addons, a] as ContractTerms["addons"] });
    if (canRequest) run(() => requestChangeAction(clientId, "addon", a), "Solicitud enviada.");
  }

  return (
    <Card className="gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle>Mejora tu plan</CardTitle>
        {mode !== "team" && !isClientAdmin && <CardDescription>Solo un Administrador de tu negocio puede solicitar cambios.</CardDescription>}
      </div>
      {upgrades.length === 0 ? (
        <p className="text-label">Ya tienes nuestro plan más completo.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {upgrades.map((p) => {
            const requested = isPending("plan", p.id);
            return (
              <li key={p.id} className="flex flex-col gap-2.5 rounded-item border-[1.5px] border-hairline p-4 transition-transform duration-250 hover:-translate-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-[19px] font-bold">{p.name}</span>
                  <span className="text-caption font-bold whitespace-nowrap">desde {money(p.priceFrom)}/mes</span>
                </div>
                <p className="text-caption">
                  {p.deliverables.posts} publicaciones, {p.deliverables.reels} reels y {p.deliverables.stories} historias al mes
                  {p.extras.length ? ` · ${p.extras.slice(0, 2).join(" · ")}` : ""}
                </p>
                <Button
                  size="sm"
                  variant={requested ? "secondary" : "primary"}
                  className="self-start"
                  disabled={pending || requested || (mode !== "team" && !canRequest)}
                  iconLeft={requested ? <Check className="size-4" /> : undefined}
                  onClick={() => onPlan(p)}
                >
                  {mode === "team" ? "Preparar este plan" : requested ? "Solicitud enviada" : "Solicitar este plan"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {addons.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-caption font-semibold">Agregar un servicio</p>
          <div className="flex flex-wrap gap-1.5">
            {addons.map((a) => {
              const requested = isPending("addon", a);
              return (
                <button
                  key={a}
                  type="button"
                  disabled={pending || requested || (mode !== "team" && !canRequest)}
                  onClick={() => onAddon(a)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border-[1.5px] px-3 py-1.5 text-eyebrow font-semibold transition-colors disabled:cursor-not-allowed",
                    requested ? "border-sand bg-sand" : "border-line bg-surface enabled:hover:border-ink/40 disabled:opacity-60",
                  )}
                >
                  {requested ? <Check aria-hidden className="size-3" /> : <Plus aria-hidden className="size-3" />}
                  {a}
                  {requested && <span className="sr-only"> (solicitado)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ───────── Solicitudes ───────── */

export function RequestsCard({ mode, requests, catalog }: { mode: PlanMode; requests: PlanRequest[]; catalog: ContractPlan[] }) {
  const { pending, run } = useAction();
  if (requests.length === 0) return null;
  const planName = (id: string) => catalog.find((p) => p.id === id)?.name ?? id;
  return (
    <Card className="gap-3">
      <CardTitle>Solicitudes</CardTitle>
      <ul className="flex flex-col divide-y divide-hairline">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 py-3">
            <div className="flex items-center justify-between gap-2 text-label">
              <span className="font-bold">{r.type === "plan" ? `Cambio a ${planName(r.target)}` : `Agregar: ${r.target}`}</span>
              <StatusBadge kind="request" status={r.status} />
            </div>
            <span className="text-caption text-muted">
              Solicitado por {r.byName} · {formatDateTimeRD(r.createdAt)}
            </span>
            {mode === "team" && r.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="dark"
                  disabled={pending}
                  onClick={() => run(() => resolveRequestAction(r.id, "approved"), "Solicitud aprobada. El contrato nuevo quedó en borrador: revísalo y envíalo.")}
                >
                  Aprobar y preparar contrato
                </Button>
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => resolveRequestAction(r.id, "rejected"), "Solicitud rechazada.")}>
                  Rechazar
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ───────── Pagos ───────── */

export function PaymentsCard({ mode, clientId, schedule }: { mode: PlanMode; clientId: string; schedule: ScheduleRow[] }) {
  const { pending, run } = useAction();
  return (
    <Card className="gap-2.5">
      <CardTitle>Pagos</CardTitle>
      {schedule.length === 0 ? (
        <p className="text-label text-muted">Los pagos aparecen cuando el contrato esté firmado.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline">
          {schedule.map((row) => (
            <li key={row.period} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-label">
              <span className="first-letter:uppercase">{monthLabel(row.period)}</span>
              <span className="flex items-center gap-2.5">
                <strong className="tabular-nums">{money(row.amount)}</strong>
                <StatusBadge kind="invoice" status={row.status} />
                {mode === "team" && row.status !== "upcoming" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2.5 text-caption"
                    disabled={pending}
                    onClick={() => run(() => setPaymentAction(clientId, row.period, row.status !== "paid"))}
                  >
                    {row.status === "paid" ? "Desmarcar" : "Marcar pagado"}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-caption text-muted">{mode === "team" ? "Marca cada mes cuando llegue el pago." : "Tu agencia registra los pagos al recibirlos."}</p>
    </Card>
  );
}

/* ───────── Versiones anteriores ───────── */

const statusWhen = (h: HistoryItem) =>
  h.signedAt ? `Firmado ${shortDate(todayRD(new Date(h.signedAt)))}` : h.sentAt ? `Enviado ${shortDate(todayRD(new Date(h.sentAt)))}` : "Borrador";

export function HistoryCard({ history }: { history: HistoryItem[] }) {
  if (history.length === 0) return null;
  return (
    <Card className="gap-2.5">
      <CardTitle>Versiones anteriores</CardTitle>
      <ul className="flex flex-col divide-y divide-hairline">
        {history.map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-2 py-2.5 text-label">
            <span>
              v{h.version} · {h.planName}
            </span>
            <span className="flex items-center gap-2 text-caption text-muted">
              {statusWhen(h)}
              <StatusBadge kind="contract" status={h.status} />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
