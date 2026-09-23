import { Avatar, Reveal } from "@/components/ui";
import { hasText } from "@/lib/content/helpers";
import type { SiteContent } from "@/lib/content/schema";
import { SiteSection } from "./section";

export function About({ general }: { general: SiteContent["general"] }) {
  const { yearsExperience, aboutTitle, aboutText, aboutPhoto, founderName, founderRole } = general;
  return (
    <SiteSection id="nosotros" tone="gris" className="-mt-2.5" inner="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-end gap-14">
      <Reveal className="flex flex-col gap-8">
        <p className="text-caption font-semibold tracking-[0.14em] uppercase">Sobre nosotros</p>
        {hasText(yearsExperience) && (
          <>
            <p aria-hidden className="flex items-start gap-3 font-display leading-[0.8] font-bold">
              <span className="text-[clamp(120px,18vw,260px)] tracking-[-0.06em]">{yearsExperience}</span>
              <span className="text-[clamp(56px,7vw,110px)] text-cyan">+</span>
            </p>
            <p className="max-w-[360px] font-display text-h2 font-semibold">
              <span className="sr-only">Más de {yearsExperience} </span>
              años haciendo marketing digital y campañas publicitarias en RD.
            </p>
          </>
        )}
      </Reveal>
      <Reveal className="flex flex-col gap-8">
        {hasText(aboutTitle) && (
          <h2 className="font-display text-[clamp(36px,4.4vw,64px)] leading-none font-bold tracking-[-0.035em] text-pretty">{aboutTitle}</h2>
        )}
        {hasText(aboutText) && <p className="max-w-[560px] text-[17px] leading-[1.6] text-pretty">{aboutText}</p>}
        {hasText(founderName) && (
          <div className="flex max-w-[560px] items-center gap-5 rounded-md bg-surface p-5">
            {hasText(aboutPhoto) ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL libre del CMS
              <img src={aboutPhoto} alt={founderName} width={72} height={72} className="size-18 shrink-0 rounded-full bg-ocean object-cover" />
            ) : (
              <Avatar name={founderName} size="lg" color="ocean" />
            )}
            <div className="leading-snug">
              <p className="font-display text-[20px] font-bold">{founderName}</p>
              {hasText(founderRole) && <p className="text-label">{founderRole}</p>}
            </div>
          </div>
        )}
      </Reveal>
    </SiteSection>
  );
}
