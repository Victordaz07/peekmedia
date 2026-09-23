import { Eyebrow, Reveal } from "@/components/ui";
import { hasText, type PublicContent } from "@/lib/content/helpers";
import { SiteSection } from "./section";

export function CaseStudy({ data }: { data: PublicContent["case"] }) {
  if (!hasText(data.title) && !hasText(data.text)) return null;
  return (
    <SiteSection id="caso" aria-labelledby="caso-t" inner="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-stretch gap-14">
      <Reveal className="relative flex min-h-[clamp(320px,50vw,520px)] items-end overflow-hidden rounded-lg bg-ocean p-8">
        {hasText(data.photo) ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL libre del CMS
          <img src={data.photo} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <span aria-hidden className="absolute -bottom-[20%] -left-[12%] aspect-square w-[70%] rounded-full border-[48px] border-cyan [clip-path:inset(0_50%_50%_0)]" />
            <span aria-hidden className="absolute top-8 right-8 size-[22px] rounded-full bg-coral" />
          </>
        )}
      </Reveal>
      <Reveal className="flex flex-col justify-center gap-8">
        <Eyebrow>Caso real</Eyebrow>
        {hasText(data.title) && (
          <h2 id="caso-t" className="font-display text-[clamp(44px,6vw,96px)] leading-[0.92] font-bold tracking-[-0.045em] text-balance">
            {data.title}
          </h2>
        )}
        {hasText(data.text) && <p className="max-w-[540px] text-[17px] leading-[1.6] text-pretty">{data.text}</p>}
        {data.metrics.length > 0 && (
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-3">
            {data.metrics.map((m, i) => (
              <div key={i} className="flex flex-col-reverse gap-2 rounded-md border-[1.5px] border-dashed border-ink/30 p-5 transition-transform duration-300 hover:-translate-y-1.5">
                <dt className="text-caption">{m.label}</dt>
                <dd className="font-display text-[20px] leading-tight font-bold">{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Reveal>
    </SiteSection>
  );
}
