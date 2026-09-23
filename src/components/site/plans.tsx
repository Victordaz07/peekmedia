import { ButtonLink, Reveal } from "@/components/ui";
import { cn } from "@/lib/cn";
import { money, waLink, waMessages, type PublicContent } from "@/lib/content/helpers";
import { DisplayTitle, SiteSection } from "./section";

const count = ["Cero", "Una", "Dos", "Tres", "Cuatro", "Cinco", "Seis"];

export function Plans({ plans, whatsapp }: { plans: PublicContent["plans"]; whatsapp: string }) {
  if (!plans.length) return null;
  return (
    <SiteSection id="servicios" inner="flex flex-col gap-14">
      <Reveal className="flex flex-wrap items-end justify-between gap-8">
        <DisplayTitle>
          Elige tu
          <br />
          plan.
        </DisplayTitle>
        <p className="max-w-[380px] text-[17px] leading-[1.55]">
          {count[plans.length] ?? plans.length} {plans.length === 1 ? "forma" : "formas"} de trabajar juntos. ¿Ninguna te encaja?{" "}
          <a href="#cotiza" className="border-b-2 border-cyan font-semibold hover:text-coral-strong">
            Arma tu cotización
          </a>
          .
        </p>
      </Reveal>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-stretch gap-5">
        {plans.map((p, i) => (
          <Reveal
            key={p.id}
            delay={i * 60}
            className={cn(
              "flex min-h-[460px] flex-col gap-8 rounded-lg p-8 transition-[transform,box-shadow] duration-350 ease-reveal hover:-translate-y-2.5 hover:shadow-hover",
              p.featured ? "bg-ink text-white" : "bg-sand text-ink",
            )}
          >
            <div className="flex min-h-8 items-center justify-between gap-3">
              <span className="text-caption font-semibold tracking-[0.14em]">{String(i + 1).padStart(2, "0")}</span>
              {p.featured && <span className="rounded-full bg-coral px-3.5 py-[7px] text-caption font-semibold text-ink">Más elegido</span>}
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-display text-h1 leading-none font-bold tracking-[-0.03em]">{p.name}</h3>
              <p className="text-body">{p.description}</p>
            </div>
            {p.items.length > 0 && (
              <ul className="flex flex-col gap-3 text-button">
                {p.items.map((it) => (
                  <li key={it} className="flex items-center gap-3">
                    <span aria-hidden className="size-2 shrink-0 rounded-full bg-cyan" />
                    {it}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
              <p className="font-display leading-tight font-bold tracking-[-0.02em]">
                {p.priceFrom != null ? (
                  <>
                    <span className="block text-label font-semibold tracking-normal">Desde</span>
                    <span className="text-[32px]">{money(p.priceFrom)}</span>
                    {p.billing === "monthly" && <span className="text-body font-semibold"> / mes</span>}
                  </>
                ) : (
                  <span className="text-h3">A cotizar</span>
                )}
              </p>
              <ButtonLink
                href={waLink(whatsapp, waMessages.plan(p.name))}
                target="_blank"
                rel="noopener"
                variant={p.featured ? "primary" : "dark"}
                size="sm"
                className="h-11 px-5 text-button"
                aria-label={`Lo quiero: ${p.name}`}
              >
                Lo quiero
              </ButtonLink>
            </div>
          </Reveal>
        ))}
      </div>
    </SiteSection>
  );
}
