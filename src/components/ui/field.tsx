"use client";

import { AlertCircle, Check, ChevronDown } from "lucide-react";
import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type FieldCtx = { id: string; describedBy?: string; invalid: boolean };
const FieldContext = createContext<FieldCtx | null>(null);

/**
 * Envuelve un control con etiqueta, ayuda y error. El control hijo recibe id, aria-describedby
 * y aria-invalid automáticamente.
 */
export function Field({
  label,
  hint,
  error,
  required,
  counter,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Texto a la derecha de la etiqueta, p. ej. "120 / 2200". */
  counter?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-caption font-semibold">
            {label}
            {required && (
              <span aria-hidden className="text-coral-strong">
                {" "}
                *
              </span>
            )}
          </label>
          {counter && <span className="text-caption text-muted tabular-nums">{counter}</span>}
        </div>
        {children}
        {error ? (
          <p id={errorId} className="flex items-center gap-1.5 text-caption font-semibold text-coral-strong">
            <AlertCircle aria-hidden className="size-3.5 shrink-0" />
            {error}
          </p>
        ) : (
          hint && (
            <p id={hintId} className="text-caption text-muted">
              {hint}
            </p>
          )
        )}
      </div>
    </FieldContext.Provider>
  );
}

function useFieldProps(props: { id?: string; "aria-describedby"?: string; "aria-invalid"?: ComponentProps<"input">["aria-invalid"]; required?: boolean }) {
  const ctx = useContext(FieldContext);
  return {
    id: props.id ?? ctx?.id,
    "aria-describedby": props["aria-describedby"] ?? ctx?.describedBy,
    "aria-invalid": props["aria-invalid"] ?? (ctx?.invalid || undefined),
  };
}

export const controlStyles =
  "w-full rounded-sm border-[1.5px] border-line bg-surface px-3.5 py-3 text-button text-ink " +
  "placeholder:text-muted/70 transition-colors duration-200 outline-none " +
  "hover:border-ink/30 focus-visible:border-cyan focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-cyan/40 " +
  "aria-invalid:border-coral-strong aria-invalid:focus-visible:outline-coral-strong/30 " +
  "disabled:cursor-not-allowed disabled:bg-hairline disabled:text-muted";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlStyles, className)} {...props} {...useFieldProps(props)} />;
}

export function Textarea({ className, rows = 4, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea rows={rows} className={cn(controlStyles, "resize-y leading-normal", className)} {...props} {...useFieldProps(props)} />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(controlStyles, "appearance-none pr-10", className)} {...props} {...useFieldProps(props)}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
    </div>
  );
}

/** Casilla nativa (accesible por defecto) con el estilo de la marca. */
export function Checkbox({
  label,
  description,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: ReactNode; description?: ReactNode }) {
  const autoId = useId();
  const id = props.id ?? autoId;
  return (
    <label htmlFor={id} className={cn("group flex items-start gap-3 has-disabled:opacity-45", className)}>
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          className={cn(
            "peer size-5 appearance-none rounded-[6px] border-[1.5px] border-line bg-surface transition-colors",
            "checked:border-ink checked:bg-ink hover:border-ink/40 disabled:cursor-not-allowed",
            "aria-invalid:border-coral-strong",
          )}
          {...props}
        />
        <Check
          aria-hidden
          strokeWidth={3}
          className="pointer-events-none absolute size-3.5 text-cyan opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-label font-semibold">{label}</span>
        {description && <span className="text-caption text-muted">{description}</span>}
      </span>
    </label>
  );
}
