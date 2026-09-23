import { cn } from "@/lib/cn";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-block size-5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}

/** Bloque gris que late mientras carga el contenido real. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-shimmer rounded-sm bg-hairline", className)} />;
}
