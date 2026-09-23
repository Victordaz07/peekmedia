import { Accordion, Reveal } from "@/components/ui";
import type { PublicContent } from "@/lib/content/helpers";
import { SiteSection } from "./section";

/** Solo muestra preguntas con respuesta; sin ninguna, la sección no aparece. */
export function Faq({ items }: { items: PublicContent["faq"] }) {
  if (!items.length) return null;
  return (
    <SiteSection aria-labelledby="faq-t" inner="flex flex-wrap gap-14">
      <Reveal className="flex-[1_1_320px]">
        <h2 id="faq-t" className="font-display text-[clamp(48px,6vw,96px)] leading-[0.9] font-bold tracking-[-0.045em]">
          Preguntas
          <br />
          frecuentes.
        </h2>
      </Reveal>
      <Accordion className="min-w-0 flex-[2_1_520px] border-t-0" items={items.map((f, i) => ({ id: String(i), question: f.q, answer: f.a }))} />
    </SiteSection>
  );
}
