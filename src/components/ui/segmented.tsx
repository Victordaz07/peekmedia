"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SegmentedOption<T extends string> = { value: T; label: ReactNode; badge?: number };

/**
 * Pestañas en pill (fondo sand, activa en ink). Accesible como tablist: flechas, Inicio y Fin.
 * Úsala para pestañas de contenido (con `panelId`) o como selector de rango/filtro.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nombre accesible del grupo, p. ej. "Rango de fechas". */
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const last = options.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(options[next].value);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("inline-flex max-w-full overflow-x-auto rounded-full bg-sand p-1", className)}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${baseId}-${opt.value}`}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors duration-200",
              size === "sm" ? "px-3 py-1.5 text-caption" : "px-4 py-2 text-label",
              selected ? "bg-ink text-white" : "text-ink hover:bg-white/50",
            )}
          >
            {opt.label}
            {opt.badge ? (
              <span className="grid min-w-5 place-items-center rounded-full bg-coral px-1.5 text-eyebrow font-bold text-ink">
                {opt.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
