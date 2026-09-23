import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { statusVocabularies, tones, type StatusKind, type StatusOf, type Tone } from "@/lib/design/tokens";

export type BadgeProps = ComponentProps<"span"> & {
  tone?: Tone;
  /** Punto de color a la izquierda (p. ej. estado en vivo). */
  dot?: boolean;
  size?: "sm" | "md";
};

export function Badge({ tone = "neutral", dot, size = "md", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm font-sans font-bold whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-eyebrow tracking-[0.08em] uppercase" : "px-2.5 py-1 text-caption",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Badge con el vocabulario único de estados (contenido, clientes, contratos, conexiones, pagos). */
export function StatusBadge<K extends StatusKind>({
  kind,
  status,
  className,
}: {
  kind: K;
  status: StatusOf<K>;
  className?: string;
}) {
  const def = statusVocabularies[kind][status] as { label: string; tone: Tone };
  return (
    <Badge tone={def.tone} className={className}>
      {def.label}
    </Badge>
  );
}

/** Pill de variación: cian si sube, rosa si baja. */
export function TrendPill({ value, suffix = "%", className }: { value: number; suffix?: string; className?: string }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-caption font-bold",
        up ? "bg-cyan-tint" : "bg-coral-tint",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2.5} />
      <span className="sr-only">{up ? "Sube" : "Baja"}</span>
      {up ? "+" : "−"}
      {Math.abs(value).toLocaleString("es-DO")}
      {suffix}
    </span>
  );
}
