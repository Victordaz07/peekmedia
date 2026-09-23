import Image from "next/image";
import { cn } from "@/lib/cn";

/** Lockup horizontal "peek MEDIA" (WebP recortado, 491×160). */
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/peek-media-logo.webp"
      alt="Peek Media"
      width={491}
      height={160}
      priority={priority}
      className={cn("h-10 w-auto", className)}
    />
  );
}

/** Solo el ícono (la P con el punto coral). */
export function LogoMark({ className, size = 40 }: { className?: string; size?: number }) {
  return <Image src="/brand/peek-media-simbolo.webp" alt="Peek Media" width={size} height={size} className={cn("shrink-0", className)} />;
}
