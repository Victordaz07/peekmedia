import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";
import { ButtonLink, Eyebrow, LogoMark, Reveal } from "@/components/ui";
import { hasText, waLink, waMessages } from "@/lib/content/helpers";
import type { SiteContent } from "@/lib/content/schema";

export function Hero({ general }: { general: SiteContent["general"] }) {
  const { heroText, instagram, followers, whatsapp, yearsExperience } = general;
  return (
    <header
      id="top"
      className="mx-auto grid max-w-[1320px] scroll-mt-20 grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] items-center gap-14 px-[clamp(20px,4vw,32px)] py-[clamp(48px,8vw,88px)]"
    >
      <Reveal className="flex flex-col gap-8">
        <Eyebrow>Estrategia · Contenido · Resultados</Eyebrow>
        <h1 className="isolate font-display text-display-lg font-bold tracking-[-0.045em]">
          Haz que te{" "}
          <span className="relative whitespace-nowrap">
            vean.
            <span aria-hidden className="absolute right-[0.12em] bottom-[0.06em] left-[-0.04em] -z-10 h-[0.2em] rounded-[4px] bg-cyan" />
          </span>
          <br />
          Haz que te recuerden.
        </h1>
        <div className="flex flex-wrap items-end justify-between gap-8">
          {hasText(heroText) && <p className="max-w-[380px] text-lead text-pretty">{heroText}</p>}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={waLink(whatsapp, waMessages.hero)} target="_blank" rel="noopener" size="lg" className="px-[26px] text-button">
                Hablemos por WhatsApp
              </ButtonLink>
              <ButtonLink href="#cotiza" variant="outline" size="lg" className="px-[26px] text-button">
                Cotiza a tu medida
              </ButtonLink>
            </div>
            {hasText(yearsExperience) && (
              <p className="flex items-center gap-2 text-label font-semibold">
                <span aria-hidden className="size-2 rounded-full bg-cyan" />
                {yearsExperience}+ años · Santo Domingo, RD
              </p>
            )}
          </div>
        </div>
      </Reveal>

      <Reveal className="relative flex flex-col items-center gap-5 py-5">
        <div aria-hidden className="absolute top-[4%] left-[14%] aspect-square w-[78%] rounded-full bg-sand" />
        {/* La burbuja va fuera de la tarjeta para no tapar el mockup. */}
        <p className="relative z-10 flex animate-float items-center gap-2.5 self-start rounded-[20px_20px_20px_6px] bg-ink px-[18px] py-3.5 text-button font-medium text-white shadow-elevated sm:ml-[6%]">
          <span aria-hidden className="size-2 rounded-full bg-cyan" />
          ¿Y si esta fuera tu marca?
        </p>
        <InstagramMockup instagram={instagram} followers={followers} />
      </Reveal>
    </header>
  );
}

function InstagramMockup({ instagram, followers }: { instagram: string; followers: string }) {
  return (
    <figure
      aria-label="Ejemplo de publicación en Instagram"
      className="relative w-full max-w-[440px] rotate-2 overflow-hidden rounded-md bg-surface shadow-elevated ring-1 ring-hairline transition-transform duration-400 ease-reveal hover:-translate-y-1.5 hover:rotate-0"
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="grid size-10 place-items-center rounded-full bg-linear-135 from-cyan to-coral p-[2px]">
          <span className="grid size-full place-items-center rounded-full bg-surface">
            <LogoMark size={22} />
          </span>
        </span>
        <div className="flex-1 leading-tight">
          <p className="text-label font-bold">{instagram}</p>
          <p className="text-eyebrow">Santo Domingo, RD</p>
        </div>
        <MoreHorizontal aria-hidden className="size-5" />
      </div>
      <div className="relative flex aspect-square flex-col justify-between overflow-hidden bg-ocean p-8">
        <span
          aria-hidden
          className="absolute -top-[18%] -right-[18%] aspect-square w-[70%] rounded-full border-[34px] border-cyan [clip-path:inset(0_0_50%_50%)]"
        />
        <span aria-hidden className="size-[18px] animate-pulse-dot rounded-full bg-coral" />
        <p className="relative font-display text-[clamp(30px,3.4vw,44px)] leading-none font-bold tracking-[-0.03em] text-white">
          Ideas que encuentran a su gente.
        </p>
      </div>
      <figcaption className="flex flex-col gap-2.5 px-4 pt-3.5 pb-[18px]">
        <div aria-hidden className="flex items-center gap-4">
          <Heart className="size-[26px] fill-coral text-coral" />
          <MessageCircle className="size-6" />
          <Send className="size-6" />
          <Bookmark className="ml-auto size-6" />
        </div>
        {hasText(followers) && <p className="text-label font-bold">{followers} seguidores</p>}
        <p className="text-label">
          <strong>{instagram}</strong> Haz que te vean. Haz que te recuerden.{" "}
          <span className="text-ocean">#marketingdigital #santodomingo</span>
        </p>
      </figcaption>
    </figure>
  );
}
