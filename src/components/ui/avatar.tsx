import Image from "next/image";
import { cn } from "@/lib/cn";
import { avatarColors, type AvatarColor } from "@/lib/design/tokens";

const sizes = { xs: "size-7 text-eyebrow", sm: "size-9 text-caption", md: "size-12 text-body", lg: "size-18 text-h3", xl: "size-24 text-h2" };
const pixels = { xs: 28, sm: 36, md: 48, lg: 72, xl: 96 };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Avatar({
  name,
  src,
  color = "ocean",
  size = "md",
  ring,
  labelled = false,
  className,
}: {
  name: string;
  src?: string | null;
  color?: AvatarColor;
  size?: keyof typeof sizes;
  /** Anillo degradado cian → coral, estilo historia de Instagram. */
  ring?: boolean;
  /** Anuncia el nombre a lectores de pantalla. Por defecto es decorativo: casi siempre va junto al nombre escrito. */
  labelled?: boolean;
  className?: string;
}) {
  const inner = (
    <span
      aria-hidden={labelled ? undefined : true}
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-bold",
        sizes[size],
        avatarColors[color],
        className,
      )}
    >
      {src ? (
        <Image src={src} alt={labelled ? name : ""} width={pixels[size]} height={pixels[size]} className="size-full object-cover" />
      ) : (
        <>
          <span aria-hidden>{initials(name)}</span>
          {labelled && <span className="sr-only">{name}</span>}
        </>
      )}
    </span>
  );
  if (!ring) return inner;
  return (
    <span className="inline-grid shrink-0 rounded-full bg-linear-to-tr from-cyan to-coral p-[3px]">
      <span className="rounded-full bg-surface p-[2px]">{inner}</span>
    </span>
  );
}
