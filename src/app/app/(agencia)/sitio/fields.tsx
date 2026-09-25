"use client";

import { ArrowDown, ArrowUp, EyeOff, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Button, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";

/** Definición de un campo editable. Los tipos cubren todo el contenido del sitio. */
export type FieldDef<T> = {
  key: keyof T & string;
  label: string;
  type?: "text" | "textarea" | "url" | "price" | "billing" | "checkbox" | "lines";
  hint?: string;
  placeholder?: string;
  /** Ocupa las dos columnas. */
  wide?: boolean;
};

type Value = string | number | boolean | null | string[];

function FieldInput<T>({ def, value, onChange }: { def: FieldDef<T>; value: Value; onChange: (v: Value) => void }) {
  switch (def.type) {
    case "textarea":
      return <Textarea rows={4} value={String(value ?? "")} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case "lines":
      return (
        <Textarea
          rows={4}
          value={(value as string[]).join("\n")}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value.split("\n"))}
          onBlur={(e) => onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))}
        />
      );
    case "price":
      return (
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={500}
          value={value == null ? "" : String(value)}
          placeholder="Vacío = A cotizar"
          onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
        />
      );
    case "billing":
      return (
        <Select value={String(value)} onChange={(e) => onChange(e.target.value)}>
          <option value="monthly">Mensual</option>
          <option value="once">Pago único</option>
        </Select>
      );
    default:
      return (
        <Input
          type={def.type === "url" ? "url" : "text"}
          inputMode={def.type === "url" ? "url" : undefined}
          value={String(value ?? "")}
          placeholder={def.placeholder ?? (def.type === "url" ? "https://…" : undefined)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/** Rejilla de campos para un objeto (grupo General, Caso real o un elemento de lista). */
export function FieldGrid<T extends object>({ defs, value, onChange }: { defs: FieldDef<T>[]; value: T; onChange: (next: T) => void }) {
  const record = value as Record<string, Value>;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {defs.map((def) =>
        def.type === "checkbox" ? (
          <Checkbox
            key={def.key}
            className="md:col-span-2"
            label={def.label}
            description={def.hint}
            checked={Boolean(record[def.key])}
            onChange={(e) => onChange({ ...value, [def.key]: e.target.checked })}
          />
        ) : (
          <Field key={def.key} label={def.label} hint={def.hint} className={cn((def.wide || def.type === "textarea" || def.type === "lines") && "md:col-span-2")}>
            <FieldInput def={def} value={record[def.key]} onChange={(v) => onChange({ ...value, [def.key]: v })} />
          </Field>
        ),
      )}
    </div>
  );
}

/** Lista editable: añadir, reordenar ↑↓ y quitar. */
export function ListEditor<T extends object>({
  items,
  onChange,
  defs,
  itemLabel,
  addLabel,
  newItem,
  hiddenReason,
  onRemove,
  max,
  empty,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  defs: FieldDef<T>[];
  itemLabel: (item: T, index: number) => string;
  addLabel: string;
  newItem: () => T;
  /** Si devuelve texto, el elemento no se publica y se explica por qué. */
  hiddenReason?: (item: T) => string | null;
  onRemove?: (index: number) => void;
  max: number;
  empty?: ReactNode;
}) {
  const move = (from: number, to: number) => {
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 && empty}
      {items.map((item, i) => {
        const hidden = hiddenReason?.(item);
        const label = itemLabel(item, i);
        return (
          <Card key={i} variant="outline" className="gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sand text-caption font-bold">{i + 1}</span>
                <p className="truncate font-display text-[19px] font-bold">{label}</p>
                {hidden && (
                  <Badge tone="warning" title={hidden}>
                    <EyeOff aria-hidden className="size-3.5" /> No se publica: {hidden}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label={`Subir ${label}`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Bajar ${label}`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar ${label}`}
                  onClick={() => (onRemove ? onRemove(i) : onChange(items.filter((_, j) => j !== i)))}
                  className="hover:bg-coral-tint"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <FieldGrid defs={defs} value={item} onChange={(next) => onChange(items.map((it, j) => (j === i ? next : it)))} />
          </Card>
        );
      })}
      {items.length < max && (
        <Button variant="outline" className="self-start" iconLeft={<Plus className="size-4" />} onClick={() => onChange([...items, newItem()])}>
          {addLabel}
        </Button>
      )}
    </div>
  );
}
