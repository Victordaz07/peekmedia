"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, CardTitle, Field, Input, Select, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { money } from "@/lib/content/helpers";
import { ADDONS, deliverableKeys, deliverableLabel, PAYMENT_METHODS, type ContractPlan } from "@/lib/contracts/catalog";
import type { ContractTerms } from "@/lib/contracts/schema";
import { saveDraftAction, sendContractAction } from "./actions";

/** "Editar plan y condiciones" (solo equipo). */
export function ContractEditor({
  clientId,
  catalog,
  initial,
  signed,
  onDone,
}: {
  clientId: string;
  catalog: ContractPlan[];
  initial: ContractTerms;
  signed: boolean;
  onDone: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [t, setT] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ContractTerms>(k: K, v: ContractTerms[K]) => {
    setT((prev) => ({ ...prev, [k]: v }));
    setError(null);
  };
  const num = (v: string) => (v === "" ? 0 : Number(v));

  function pickPlan(p: ContractPlan) {
    setT((prev) => ({ ...prev, planId: p.id, deliverables: { ...p.deliverables }, price: Math.max(p.priceFrom, prev.price) }));
  }

  function run(kind: "draft" | "send") {
    start(async () => {
      if (kind === "draft") {
        const res = await saveDraftAction(clientId, t);
        if (!res.ok) return setError(res.error);
        toast({ title: signed ? "Borrador guardado. El contrato vigente no cambia hasta que lo envíes." : "Borrador guardado." });
      } else {
        const res = await sendContractAction(clientId, t);
        if (!res.ok) return setError(res.error);
        toast({
          title: "Contrato enviado para firma",
          description:
            res.admins === 0
              ? "Todavía no hay Administradores del cliente: invita uno desde la ficha para que pueda firmar."
              : res.mailed > 0
                ? `Avisamos por correo a ${res.mailed} Administrador${res.mailed > 1 ? "es" : ""}.`
                : "Lo verá como pendiente al entrar a su panel.",
          tone: "success",
        });
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <Card id="editor" className="scroll-mt-6 gap-6 ring-2 ring-cyan" data-noprint>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Editar plan y condiciones</CardTitle>
        <p className="text-caption text-muted">
          {signed ? "Al enviar se crea una nueva versión y el cliente vuelve a firmar." : "El cliente verá los cambios al enviarlo."}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-caption font-semibold">Plan</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Plan">
          {catalog.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={t.planId === p.id}
              onClick={() => pickPlan(p)}
              className={cn(
                "rounded-full border-[1.5px] px-4 py-2.5 text-label font-semibold transition-colors",
                t.planId === p.id ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink/40",
              )}
            >
              {p.name} · desde {money(p.priceFrom)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))] gap-4">
        <Field label="Precio acordado (RD$/mes)">
          <Input type="number" min={1} step={500} inputMode="numeric" value={t.price || ""} onChange={(e) => set("price", num(e.target.value))} />
        </Field>
        <Field label="Fecha de inicio">
          <Input type="date" value={t.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="Duración (meses)">
          <Input type="number" min={1} max={60} inputMode="numeric" value={t.months || ""} onChange={(e) => set("months", num(e.target.value))} />
        </Field>
        <Field label="Día de pago" hint="Del 1 al 28.">
          <Input type="number" min={1} max={28} inputMode="numeric" value={t.billingDay || ""} onChange={(e) => set("billingDay", num(e.target.value))} />
        </Field>
        <Field label="Forma de pago">
          <Select value={t.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value as ContractTerms["paymentMethod"])}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        {deliverableKeys.map((k) => (
          <Field key={k} label={deliverableLabel[k]}>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={t.deliverables[k]}
              onChange={(e) => set("deliverables", { ...t.deliverables, [k]: num(e.target.value) })}
            />
          </Field>
        ))}
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-caption font-semibold">Servicios adicionales</legend>
        <div className="flex flex-wrap gap-2">
          {ADDONS.map((a) => {
            const on = t.addons.includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => set("addons", on ? t.addons.filter((x) => x !== a) : [...t.addons, a])}
                className={cn(
                  "rounded-full border-[1.5px] px-3.5 py-2 text-caption font-semibold transition-colors",
                  on ? "border-cyan bg-cyan" : "border-line bg-surface hover:border-ink/40",
                )}
              >
                {a}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-item bg-coral-tint px-4 py-3 text-label font-semibold">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => run("draft")} disabled={pending}>
          Guardar borrador
        </Button>
        <Button onClick={() => run("send")} loading={pending} iconLeft={<Send className="size-4" />}>
          Enviar al cliente para firma
        </Button>
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
