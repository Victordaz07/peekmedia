import { hasText, type PublicContent } from "@/lib/content/helpers";

export function ClientLogos({ logos }: { logos: PublicContent["logos"] }) {
  if (!logos.length) return null;
  return (
    <section aria-labelledby="logos-t" className="px-[clamp(20px,4vw,32px)] pb-[clamp(56px,9vw,88px)]">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-8 border-t border-hairline pt-8">
        <h2 id="logos-t" className="flex-none text-caption font-semibold tracking-[0.14em] uppercase">
          Han confiado en nosotros
        </h2>
        <ul className="flex flex-[1_1_400px] flex-wrap gap-3">
          {logos.map((l, i) => (
            <li key={i} className="flex h-18 flex-[1_1_140px] items-center justify-center overflow-hidden rounded-md bg-sand p-3 text-caption font-semibold">
              {hasText(l.image) ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL libre del CMS
                <img src={l.image} alt={l.name} loading="lazy" className="max-h-11 max-w-full object-contain" />
              ) : (
                l.name
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
