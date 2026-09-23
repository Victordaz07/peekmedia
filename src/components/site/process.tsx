import { Reveal } from "@/components/ui";
import type { PublicContent } from "@/lib/content/helpers";
import { DisplayTitle, SiteSection } from "./section";

export function Process({ steps }: { steps: PublicContent["process"] }) {
  if (!steps.length) return null;
  return (
    <SiteSection inner="flex flex-col gap-14" aria-labelledby="proceso-t">
      <Reveal>
        <DisplayTitle id="proceso-t">
          Cómo
          <br />
          trabajamos.
        </DisplayTitle>
      </Reveal>
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-5">
        {steps.map((s, i) => (
          <li key={i}>
            <Reveal delay={i * 60} className="flex flex-col gap-3 border-t-[3px] border-ink pt-5 transition-transform duration-300 hover:-translate-y-1.5">
              <span aria-hidden className="font-display text-[64px] leading-none font-bold tracking-[-0.04em] text-cyan">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-h2 font-bold tracking-[-0.02em]">{s.title}</h3>
              <p className="text-body">{s.desc}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </SiteSection>
  );
}
