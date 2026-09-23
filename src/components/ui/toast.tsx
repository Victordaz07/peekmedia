"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ToastTone = "default" | "success" | "error";

export type ToastInput = {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** Acción secundaria, normalmente "Deshacer". */
  action?: { label: string; onClick: () => void };
  /** ms antes de cerrarse solo. Por defecto 6000; 0 = no se cierra solo. */
  duration?: number;
};

type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

const icons = { default: Info, success: CheckCircle2, error: TriangleAlert };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);
  const push = useCallback((t: ToastInput) => {
    const id = ++nextId.current;
    setItems((all) => [...all.slice(-2), { ...t, id }]);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-3 sm:right-6 sm:bottom-6 sm:left-auto sm:items-end"
      >
        {items.map((t) => (
          <ToastView key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const { title, description, tone = "default", action, duration = 6000 } = toast;
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!duration || paused) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, paused, onDismiss]);

  const Icon = icons[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-[420px] animate-toast-in items-start gap-3 rounded-item bg-ink p-4 text-white shadow-elevated"
    >
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-5 shrink-0", tone === "success" && "text-cyan", tone === "error" && "text-coral")}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-label font-bold">{title}</p>
        {description && <p className="text-caption text-white/75">{description}</p>}
      </div>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onDismiss();
          }}
          className="shrink-0 rounded-full px-2 py-0.5 text-label font-bold text-cyan underline-offset-4 hover:underline"
        >
          {action.label}
        </button>
      )}
      <button type="button" aria-label="Cerrar aviso" onClick={onDismiss} className="-m-1 shrink-0 rounded-full p-1 text-white/70 hover:text-white">
        <X className="size-4" />
      </button>
    </div>
  );
}
