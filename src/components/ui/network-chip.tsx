import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { networks, type Network } from "@/lib/design/tokens";

export function NetworkDot({ network, className }: { network: Network; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", networks[network].dot, className)} />;
}

/** Chip de red con su punto de color. Si recibe onClick funciona como toggle (aria-pressed). */
export function NetworkChip({
  network,
  selected,
  className,
  onClick,
  ...props
}: Omit<ComponentProps<"button">, "children"> & { network: Network; selected?: boolean }) {
  const content = (
    <>
      <NetworkDot network={network} className={selected ? "ring-2 ring-white/80" : undefined} />
      {networks[network].label}
    </>
  );
  const styles = cn(
    "inline-flex items-center gap-2 rounded-full border-[1.5px] px-3.5 py-1.5 text-label font-semibold transition-colors duration-200",
    selected ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink",
    className,
  );
  if (!onClick) return <span className={styles}>{content}</span>;
  return (
    <button
      type="button"
      aria-pressed={Boolean(selected)}
      onClick={onClick}
      className={cn(styles, !selected && "hover:border-ink/40", "disabled:opacity-45")}
      {...props}
    >
      {content}
    </button>
  );
}
