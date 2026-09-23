import { TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

/** Estado vacío: qué falta y el siguiente paso, p. ej. "Conecta Instagram para ver métricas". */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-md border-[1.5px] border-dashed border-line px-6 py-10 text-center", className)}>
      {Icon && (
        <span className="grid size-12 place-items-center rounded-full bg-cyan-tint">
          <Icon aria-hidden className="size-5" />
        </span>
      )}
      <p className="font-display text-[20px] font-bold tracking-[-0.01em]">{title}</p>
      {description && <p className="max-w-sm text-label text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Error recuperable, p. ej. token vencido o sincronización fallida. */
export function ErrorState({
  title = "Algo no salió bien",
  description,
  action,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 rounded-md bg-coral-tint px-6 py-10 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-full bg-surface">
        <TriangleAlert aria-hidden className="size-5 text-coral-strong" />
      </span>
      <p className="font-display text-[20px] font-bold tracking-[-0.01em]">{title}</p>
      {description && <p className="max-w-sm text-label">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Cargando…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex items-center justify-center gap-3 px-6 py-10 text-label text-muted", className)}>
      <Spinner />
      {label}
    </div>
  );
}
