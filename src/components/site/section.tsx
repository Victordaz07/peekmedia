import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Sección del sitio: padding fluido y contenido a 1320px. `tone="gris"` usa la textura. */
export function SiteSection({
  tone = "blanco",
  className,
  inner,
  children,
  ...props
}: ComponentProps<"section"> & { tone?: "blanco" | "gris"; inner?: string }) {
  return (
    <section
      className={cn(
        "scroll-mt-20 px-[clamp(20px,4vw,32px)] py-[clamp(56px,9vw,88px)]",
        tone === "gris" && "bg-texture-gris",
        className,
      )}
      {...props}
    >
      <div className={cn("mx-auto max-w-[1320px]", inner)}>{children}</div>
    </section>
  );
}

export function DisplayTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("font-display text-display-md font-bold tracking-[-0.045em] text-balance", className)} {...props} />;
}

/** Ícono de WhatsApp (burbuja simple, igual al del prototipo). */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden className={cn("size-5", className)}>
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1z" />
    </svg>
  );
}
