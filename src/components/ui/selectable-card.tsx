"use client";

import { Check } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Card marcable del cotizador. Se anuncia como casilla (role="checkbox" + aria-checked)
 * y se alterna con clic, Espacio o Enter. Marcada pasa a ink con check cian.
 */
export function SelectableCard({
  checked,
  onCheckedChange,
  title,
  description,
  meta,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Precio u otra info al pie. */
  meta?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  function toggle() {
    if (!disabled) onCheckedChange(!checked);
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  }
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={toggle}
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex flex-col gap-2 rounded-md p-5 pr-14 transition-[transform,box-shadow,background-color] duration-250 ease-reveal select-none",
        checked ? "bg-ink text-white" : "bg-surface text-ink hover:-translate-y-1 hover:shadow-hover",
        disabled && "cursor-not-allowed opacity-45 hover:translate-y-0 hover:shadow-none",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-5 right-5 grid size-7 place-items-center rounded-full border-[1.5px] transition-colors",
          checked ? "border-cyan bg-cyan text-ink" : "border-line",
        )}
      >
        {checked && <Check className="size-4" strokeWidth={3} />}
      </span>
      <span className="font-display text-[19px] leading-tight font-bold">{title}</span>
      {description && <span className={cn("text-label", checked ? "text-white/80" : "text-muted")}>{description}</span>}
      {meta && <span className="mt-auto pt-2 text-label font-bold">{meta}</span>}
    </div>
  );
}
