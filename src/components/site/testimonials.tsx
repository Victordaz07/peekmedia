import { Avatar, Reveal } from "@/components/ui";
import { hasText, type PublicContent } from "@/lib/content/helpers";
import { DisplayTitle, SiteSection } from "./section";

/** Solo aparece con testimonios reales. */
export function Testimonials({ items }: { items: PublicContent["testimonials"] }) {
  if (!items.length) return null;
  return (
    <SiteSection tone="gris" aria-labelledby="testimonios-t" inner="flex flex-col gap-14">
      <Reveal>
        <DisplayTitle id="testimonios-t">
          Lo que dicen
          <br />
          de nosotros.
        </DisplayTitle>
      </Reveal>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-5">
        {items.map((t, i) => (
          <li key={i}>
            <Reveal className="flex h-full min-h-[280px] flex-col gap-8 rounded-md bg-surface p-8 transition-[transform,box-shadow] duration-350 ease-reveal hover:-translate-y-2 hover:shadow-hover">
              <figure className="flex h-full flex-col gap-8">
                <span aria-hidden className="h-9 font-display text-[72px] leading-[0.6] font-bold text-cyan">
                  “
                </span>
                <blockquote className="font-display text-h3 leading-[1.3] font-medium">{t.quote}</blockquote>
                <figcaption className="mt-auto flex items-center gap-3">
                  <Avatar name={t.name} size="sm" color="ocean" />
                  <span className="text-label leading-snug">
                    <span className="block font-bold">{t.name}</span>
                    {hasText(t.business) && t.business}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          </li>
        ))}
      </ul>
    </SiteSection>
  );
}
