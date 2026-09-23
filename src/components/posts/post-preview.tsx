import { Bookmark, Heart, MessageCircle, MoreHorizontal, Play, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { postTypeLabel, postTypeRatio } from "@/lib/social/platforms";
import type { MediaItem, Post } from "@/lib/social/schema";

/** Vista previa estilo Instagram; la relación de aspecto depende del formato. */
export function PostPreview({
  handle,
  type,
  caption,
  media,
  className,
}: {
  handle: string;
  type: Post["type"];
  caption: string;
  media: MediaItem[];
  className?: string;
}) {
  const first = media[0];
  const video = first?.mime.startsWith("video/");
  return (
    <figure className={cn("overflow-hidden rounded-md bg-surface ring-1 ring-hairline", className)}>
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <span className="grid size-8 place-items-center rounded-full bg-linear-135 from-cyan to-coral p-[2px]">
          <span className="size-full rounded-full bg-ocean" />
        </span>
        <span className="flex-1 truncate text-label font-bold">{handle || "tu_marca"}</span>
        <MoreHorizontal aria-hidden className="size-5" />
      </div>
      <div className="relative grid place-items-center overflow-hidden bg-ocean text-white" style={{ aspectRatio: postTypeRatio[type] }}>
        {first && !video && (
          // eslint-disable-next-line @next/next/no-img-element -- archivo subido por el equipo
          <img src={first.url} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        {first && video && (
          <video src={first.url} muted playsInline className="absolute inset-0 size-full object-cover" aria-label={first.name} />
        )}
        {!first && <span className="font-display text-h3 font-bold">{postTypeLabel[type]}</span>}
        {video && <Play aria-hidden className="relative size-10 drop-shadow" />}
        {media.length > 1 && <span className="absolute top-2.5 right-2.5 rounded-full bg-ink/70 px-2 py-0.5 text-eyebrow font-bold">1/{media.length}</span>}
      </div>
      <figcaption className="flex flex-col gap-2 px-3.5 pt-3 pb-4">
        <div aria-hidden className="flex items-center gap-3.5">
          <Heart className="size-[22px]" />
          <MessageCircle className="size-[22px]" />
          <Send className="size-[22px]" />
          <Bookmark className="ml-auto size-[22px]" />
        </div>
        <p className="line-clamp-4 text-label whitespace-pre-line">
          <strong>{handle || "tu_marca"}</strong> {caption || <span className="text-muted">Tu texto aparecerá aquí.</span>}
        </p>
      </figcaption>
    </figure>
  );
}
