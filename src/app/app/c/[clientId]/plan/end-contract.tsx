"use client";

import { MailCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";
import type { Contract } from "@/lib/contracts/schema";
import { todayRD } from "@/lib/format";
import { requestEndContractAction } from "./actions";

/**
 * Zona de riesgo (solo equipo): anular un contrato enviado o finalizar uno firmado.
 * Solo el dueño puede pedirlo, con su contraseña; se confirma desde el enlace que le llega al correo.
 */
export function EndContractCard({ contract, isOwner }: { contract: Contract; isOwner: boolean }) {
  const voiding = contract.status === "sent";
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [endDate, setEndDate] = useState(todayRD());
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; devLink?: string } | null>(null);
  const [pending, start] = useTransition();

  function close() {
    setOpen(false);
    setPassword("");
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await requestEndContractAction(contract.id, { reason, endDate, password });
      setPassword("");
      if (!res.ok) return setError(res.error);
      setSent({ email: res.email, devLink: res.devLink });
      setOpen(false);
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-md border-[1.5px] border-coral-strong/40 bg-surface p-5">
      <div className="flex items-center gap-2">
        <ShieldAlert aria-hidden className="size-5 text-coral-strong" />
        <h3 className="text-button font-bold">Zona de riesgo</h3>
      </div>
      {sent ? (
        <div className="flex flex-col gap-2 rounded-item bg-cyan-tint p-3.5 text-label">
          <p className="flex items-start gap-2">
            <MailCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              Te enviamos un enlace a <strong>{sent.email}</strong>. Ábrelo en los próximos 30 minutos para confirmar. Hasta entonces no cambia nada.
            </span>
          </p>
          {sent.devLink && (
            <p className="text-caption">
              Modo local, sin correo: <a href={sent.devLink} className="font-semibold underline underline-offset-2">abrir el enlace de confirmación</a>
            </p>
          )}
        </div>
      ) : (
        <p className="text-label">
          {voiding
            ? "Anular este contrato: el cliente ya no podrá firmarlo."
            : "Finalizar este contrato: deja de estar vigente desde la fecha que elijas. La firma y el documento se conservan como respaldo."}
        </p>
      )}
      {isOwner ? (
        <Button variant="outline" className="self-start border-coral-strong text-coral-strong hover:bg-coral-strong hover:text-white" onClick={() => setOpen(true)}>
          {voiding ? "Anular contrato" : "Finalizar contrato"}
        </Button>
      ) : (
        <p className="text-caption text-muted">Solo el dueño de la agencia puede anular o finalizar contratos.</p>
      )}

      <Modal
        open={open}
        onClose={close}
        title={voiding ? "Anular contrato" : "Finalizar contrato"}
        description={`${contract.number} v${contract.version} · ${contract.planName}`}
      >
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label="Motivo" required hint="Queda en el historial del equipo. El cliente no lo ve.">
            <Textarea rows={3} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} placeholder="Ej. El cliente decidió no continuar después del mes 3." />
          </Field>
          {!voiding && (
            <Field label="Finaliza el" required>
              <Input type="date" value={endDate} min={contract.startDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          )}
          <Field label="Tu contraseña" required hint="La misma con la que entras al panel.">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <label className="flex items-start gap-2.5 text-label">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-1 size-4 shrink-0 accent-ink" />
            <span>Entiendo que no se puede deshacer y que se le avisará al cliente.</span>
          </label>
          <p className="rounded-item bg-hairline/60 px-3 py-2 text-caption">Te llegará un correo para confirmar. Hasta que abras el enlace no cambia nada.</p>
          {error && (
            <p role="alert" className="flex items-start gap-2 text-label font-semibold text-coral-strong">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" variant="destructive" loading={pending} disabled={!understood || reason.trim().length < 10 || !password}>
              Enviar enlace de confirmación
            </Button>
            <Button type="button" variant="ghost" onClick={close}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
