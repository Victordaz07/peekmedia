"use client";

import { Minus, Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type AccordionItem = { id: string; question: ReactNode; answer: ReactNode };

/** Acordeón del FAQ: botón con aria-expanded; el círculo del ícono pasa a cian al abrir. */
export function Accordion({ items, className }: { items: AccordionItem[]; className?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const baseId = useId();
  return (
    <div className={cn("flex flex-col divide-y divide-line border-y border-line", className)}>
      {items.map((item) => {
        const expanded = open === item.id;
        const panelId = `${baseId}-${item.id}`;
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : item.id)}
                className="group flex w-full items-center justify-between gap-6 py-6 text-left font-display text-[20px] leading-snug font-bold tracking-[-0.01em] sm:text-h3"
              >
                {item.question}
                <span
                  aria-hidden
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-200",
                    expanded ? "border-cyan bg-cyan" : "border-line group-hover:border-ink",
                  )}
                >
                  {expanded ? <Minus className="size-4" /> : <Plus className="size-4" />}
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" hidden={!expanded} className="max-w-[70ch] pb-6 text-body text-muted">
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
