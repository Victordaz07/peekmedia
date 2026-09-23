"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button, type ButtonVariant } from "./button";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Botones del pie. */
  footer?: ReactNode;
  className?: string;
};

/**
 * Base común sobre <dialog> nativo: atrapa el foco, cierra con Esc,
 * devuelve el foco al disparador y bloquea el scroll de fondo.
 */
function useNativeDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [onClose]);
  return ref;
}

function DialogShell({ open, onClose, title, description, children, footer, className, placement }: DialogProps & { placement: "center" | "right" }) {
  const ref = useNativeDialog(open, onClose);
  const titleId = useId();
  const descId = useId();
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClick={(e) => {
        // Clic en el fondo (fuera del contenido) cierra.
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "bg-surface text-ink backdrop:bg-ink/55 backdrop:backdrop-blur-[2px]",
        placement === "center"
          ? "m-auto w-[min(560px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] rounded-modal shadow-elevated open:animate-toast-in"
          : "my-0 mr-0 ml-auto h-dvh max-h-dvh w-[min(480px,100vw)] rounded-l-modal",
        className,
      )}
    >
      <div className={cn("flex flex-col gap-5 p-6 sm:p-8", placement === "right" && "h-full")}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id={titleId} className="font-display text-h2 font-bold tracking-[-0.02em]">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-label text-muted">
                {description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onClose} className="-mt-1 -mr-2">
            <X className="size-5" />
          </Button>
        </div>
        {children && <div className={cn("flex flex-col gap-4", placement === "right" && "flex-1 overflow-y-auto")}>{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-3 pt-1">{footer}</div>}
      </div>
    </dialog>
  );
}

export function Modal(props: DialogProps) {
  return <DialogShell {...props} placement="center" />;
}

/** Panel lateral (p. ej. "Pedir cambios" con comentario e historial de versiones). */
export function Drawer(props: DialogProps) {
  return <DialogShell {...props} placement="right" />;
}

/** Reemplazo de confirm(): diálogo propio con acción principal y cancelar. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "destructive",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ButtonVariant;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
