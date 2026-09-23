import { ButtonLink, LogoMark, Reveal } from "@/components/ui";
import { hasText, waLink, waMessages } from "@/lib/content/helpers";
import type { SiteContent } from "@/lib/content/schema";
import { WhatsAppIcon } from "./section";

export function FinalCta({ general }: { general: SiteContent["general"] }) {
  return (
    <section id="contacto" aria-labelledby="contacto-t" className="scroll-mt-20 px-[clamp(20px,4vw,32px)] pb-[clamp(56px,9vw,88px)]">
      <div className="mx-auto grid max-w-[1320px] grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-14">
        <Reveal className="flex flex-col gap-8">
          <h2 id="contacto-t" className="font-display text-[clamp(64px,10vw,168px)] leading-[0.86] font-bold tracking-[-0.055em]">
            ¿Habla<wbr />
            mos?
          </h2>
          <p className="max-w-[420px] text-lead">Cuéntanos de tu negocio. Te respondemos por WhatsApp.</p>
          <div className="flex flex-wrap items-center gap-5">
            <ButtonLink
              href={waLink(general.whatsapp, waMessages.cta)}
              target="_blank"
              rel="noopener"
              size="lg"
              className="h-[60px] px-8 text-[17px]"
              iconLeft={<WhatsAppIcon />}
            >
              Escríbenos por WhatsApp
            </ButtonLink>
            {hasText(general.website) && <span className="text-button">o visita {general.website}</span>}
          </div>
        </Reveal>
        <Reveal aria-hidden className="flex flex-col gap-3 rounded-lg bg-sand p-8">
          <div className="flex items-center gap-3 border-b border-hairline pb-5">
            <span className="relative grid size-11 place-items-center rounded-full bg-surface">
              <LogoMark size={26} />
              <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-sand bg-cyan" />
            </span>
            <span className="leading-tight">
              <span className="block text-button font-bold">Peek Media</span>
              <span className="text-caption">En línea</span>
            </span>
          </div>
          <Bubble>Hola, ¿qué tal? Soy de Peek Media.</Bubble>
          <Bubble className="rounded-tl-[6px] rounded-bl-[20px]">¿Qué quieres que la gente vea de tu marca?</Bubble>
          <p className="max-w-[80%] self-end rounded-[20px_20px_6px_20px] bg-ink px-[18px] py-3.5 text-body text-white">
            Quiero que me vean. Y que me recuerden.
          </p>
          <span className="flex gap-1.5 self-start rounded-[20px_20px_20px_6px] bg-surface px-5 py-3.5">
            {[0, 200, 400].map((d) => (
              <span key={d} className="size-2 animate-typing rounded-full bg-ink/50" style={{ animationDelay: `${d}ms` }} />
            ))}
          </span>
        </Reveal>
      </div>
    </section>
  );
}

function Bubble({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`max-w-[80%] self-start rounded-[20px_20px_20px_6px] bg-surface px-[18px] py-3.5 text-body ${className}`}>{children}</p>;
}
