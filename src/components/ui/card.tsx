import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type CardProps = ComponentProps<"div"> & {
  variant?: "default" | "ink" | "sand" | "outline";
  /** Sube y proyecta sombra al pasar el mouse (cards clicables). */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

const variants = {
  default: "bg-surface text-ink",
  ink: "bg-ink text-white",
  sand: "bg-sand text-ink",
  outline: "bg-surface text-ink ring-1 ring-inset ring-line",
};

const paddings = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };

export function Card({ variant = "default", interactive, padding = "md", className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-md",
        variants[variant],
        paddings[padding],
        interactive &&
          "transition-[transform,box-shadow] duration-300 ease-reveal hover:-translate-y-1 hover:shadow-hover",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-center justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("font-display text-h3 font-bold tracking-[-0.02em]", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-label text-muted", className)} {...props} />;
}
