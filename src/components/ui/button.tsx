import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "dark" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-sans font-semibold " +
  "transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-reveal select-none " +
  "hover:-translate-y-0.5 active:translate-y-0 active:shadow-none " +
  "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  // Coral con texto ink: 5.4:1 (corrección obligatoria de contraste)
  primary: "bg-coral text-ink hover:shadow-hover",
  dark: "bg-ink text-white hover:shadow-hover",
  secondary: "bg-sand text-ink hover:bg-[#b0b0b0]",
  outline: "border-[1.5px] border-ink text-ink hover:bg-ink hover:text-white",
  ghost: "text-ink hover:translate-y-0 hover:bg-hairline",
  destructive: "bg-coral-strong text-white hover:shadow-hover",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-label",
  md: "h-12 px-[22px] text-button",
  lg: "h-14 px-7 text-body",
  icon: "size-10 text-button",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type Shared = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

export type ButtonProps = ComponentProps<"button"> &
  Shared & {
    /** Muestra un spinner, bloquea el botón y lo anuncia como ocupado. */
    loading?: boolean;
  };

export function Button({
  variant,
  size,
  loading = false,
  iconLeft,
  iconRight,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
}

export type ButtonLinkProps = ComponentProps<typeof Link> & Shared;

/** Mismo aspecto que Button, pero navega. Para enlaces externos (WhatsApp) pasa target="_blank". */
export function ButtonLink({ variant, size, iconLeft, iconRight, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonStyles({ variant, size, className })} {...props}>
      {iconLeft}
      {children}
      {iconRight}
    </Link>
  );
}
