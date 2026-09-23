import { ButtonLink, LogoMark, Reveal } from "@/components/ui";
import { cn } from "@/lib/cn";
import { hasText, instagramUrl, type PublicContent } from "@/lib/content/helpers";
import type { SiteContent } from "@/lib/content/schema";

// Las tiles sin imagen rotan colores de la paleta: [fondo + texto, punto].
const palette = [
  ["bg-surface text-ink", "bg-coral"],
  ["bg-ocean text-white", "bg-cyan"],
  ["bg-cyan text-ink", "bg-white"],
  ["bg-ink text-white", "bg-coral"],
  ["bg-surface text-ink", "bg-cyan"],
  ["bg-ocean text-white", "bg-coral"],
] as const;

export function Feed({ posts, general }: { posts: PublicContent["posts"]; general: SiteContent["general"] }) {
  if (!posts.length) return null;
  const ig = instagramUrl(general.instagram);
  return (
    <section id="feed" aria-labelledby="feed-t" className="scroll-mt-20 bg-texture-gris px-[clamp(20px,4vw,32px)] py-[clamp(56px,9vw,88px)]">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-14">
        <Reveal className="flex flex-wrap items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <span className="grid size-24 shrink-0 place-items-center rounded-full bg-linear-135 from-cyan to-coral p-[3px]">
              <span className="grid size-full place-items-center rounded-full bg-surface">
                <LogoMark size={56} />
              </span>
            </span>
            <div className="flex flex-col gap-2">
              <h2 id="feed-t" className="font-display text-h2 font-bold tracking-[-0.02em]">
                @{general.instagram}
              </h2>
              <p className="flex flex-wrap gap-5 text-label">
                {hasText(general.postsCount) && (
                  <span>
                    <strong>{general.postsCount}</strong> publicaciones
                  </span>
                )}
                {hasText(general.followers) && (
                  <span>
                    <strong>{general.followers}</strong> seguidores
                  </span>
                )}
              </p>
            </div>
          </div>
          <ButtonLink href={ig} target="_blank" rel="noopener" variant="dark">
            Seguir en Instagram
          </ButtonLink>
        </Reveal>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-3">
          {posts.map((p, i) => {
            const [colors, dot] = palette[i % palette.length];
            const image = hasText(p.image) ? p.image : null;
            return (
              <li key={i}>
                <Reveal>
                  <a
                    href={hasText(p.url) ? p.url : ig}
                    target="_blank"
                    rel="noopener"
                    className={cn(
                      "relative flex aspect-square flex-col justify-between overflow-hidden rounded-md p-7 transition-[transform,box-shadow] duration-350 ease-reveal hover:-translate-y-2 hover:-rotate-1 hover:shadow-hover",
                      image ? "bg-ocean text-white" : colors,
                    )}
                  >
                    {image && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element -- URL libre del CMS */}
                        <img src={image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                        <span aria-hidden className="absolute inset-0 bg-linear-to-t from-ink/85 to-ink/0 to-60%" />
                      </>
                    )}
                    <span className="relative flex items-center justify-between">
                      <span aria-hidden className={cn("size-3.5 rounded-full", dot)} />
                      {hasText(p.tag) && <span className="text-caption font-semibold tracking-[0.1em] uppercase">{p.tag}</span>}
                    </span>
                    <span className="relative font-display text-[clamp(26px,2.6vw,34px)] leading-[1.02] font-bold tracking-[-0.03em] text-pretty">
                      {p.title}
                    </span>
                  </a>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
