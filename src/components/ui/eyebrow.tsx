import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Antetítulo en mayúsculas con el punto coral de la marca. */
export function Eyebrow({ dot = true, className, children, ...props }: ComponentProps<"p"> & { dot?: boolean }) {
  return (
    <p
      className={cn("inline-flex items-center gap-2.5 text-caption font-semibold tracking-[0.14em] uppercase", className)}
      {...props}
    >
      {dot && <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-coral" />}
      {children}
    </p>
  );
}
