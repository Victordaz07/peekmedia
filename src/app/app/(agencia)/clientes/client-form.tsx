"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, Field, Input, NetworkChip, Select, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { clientStatuses, type ClientInput } from "@/lib/clients/schema";
import { avatarColors, clientStatus, networkIds, type AvatarColor } from "@/lib/design/tokens";
import { createClientAction, updateClientAction, type ActionResult } from "./actions";

const colorLabel: Record<AvatarColor, string> = { coral: "Coral", cyan: "Cian", ink: "Tinta", ocean: "Océano" };

export const emptyClient: ClientInput = {
  name: "",
  industry: "",
  handle: "",
  avatarColor: "ocean",
  platforms: ["instagram", "facebook"],
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  taxId: "",
  status: "active",
  fee: null,
};

/** Datos del cliente: sirve para crear el espacio y para editarlo desde la ficha. */
export function ClientForm({ initial, clientId }: { initial: ClientInput; clientId?: string }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ClientInput>(k: K, v: ClientInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError(null);
  };
  const err = (field: string) => (error?.field === field ? error.message : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res: ActionResult = clientId ? await updateClientAction(clientId, form) : await createClientAction(form);
      if (!res.ok) {
        setError({ field: res.field, message: res.error });
        if (!res.field || !["name", "contactEmail", "platforms"].includes(res.field)) toast({ title: res.error, tone: "error" });
        return;
      }
      toast({ title: "Cambios guardados", tone: "success" });
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nombre del negocio" required error={err("name")}>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej. Heladería Coco" autoFocus={!clientId} />
        </Field>
        <Field label="Rubro y zona">
          <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Ej. Heladería · Naco" />
        </Field>
        <Field label="Usuario principal en redes" hint="Sin @.">
          <Input value={form.handle} onChange={(e) => set("handle", e.target.value)} placeholder="heladeriacoco" />
        </Field>
        <Field label="RNC o cédula" hint="Aparece en el contrato.">
          <Input value={form.taxId} onChange={(e) => set("taxId", e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Persona de contacto">
          <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Correo de contacto" error={err("contactEmail")}>
          <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Teléfono / WhatsApp">
          <Input type="tel" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} autoComplete="off" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Estado">
            <Select value={form.status} onChange={(e) => set("status", e.target.value as ClientInput["status"])}>
              {clientStatuses.map((s) => (
                <option key={s} value={s}>
                  {clientStatus[s].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tarifa (RD$/mes)">
            <Input
              type="number"
              min={0}
              step={500}
              inputMode="numeric"
              value={form.fee ?? ""}
              onChange={(e) => set("fee", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-caption font-semibold">Color del espacio</legend>
        <div className="flex gap-2.5" role="radiogroup" aria-label="Color del espacio">
          {(Object.keys(avatarColors) as AvatarColor[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={form.avatarColor === c}
              aria-label={colorLabel[c]}
              onClick={() => set("avatarColor", c)}
              className={cn(
                "grid size-10 place-items-center rounded-full ring-offset-2 transition-shadow",
                avatarColors[c],
                form.avatarColor === c ? "ring-2 ring-ink" : "ring-0",
              )}
            >
              {form.avatarColor === c && <Check aria-hidden className="size-4" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-caption font-semibold">Redes que manejamos</legend>
        <div className="flex flex-wrap gap-2">
          {networkIds.map((n) => {
            const on = form.platforms.includes(n);
            return (
              <NetworkChip
                key={n}
                network={n}
                selected={on}
                onClick={() => set("platforms", on ? form.platforms.filter((x) => x !== n) : [...form.platforms, n])}
              />
            );
          })}
        </div>
        {err("platforms") && <p className="text-caption font-semibold text-coral-strong">{err("platforms")}</p>}
      </fieldset>

      <Button type="submit" variant="dark" loading={pending} className="self-start">
        {clientId ? "Guardar cambios" : "Crear espacio del cliente"}
      </Button>
    </form>
  );
}
