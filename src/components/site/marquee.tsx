const phrases = ["Haz que te vean", "Haz que te recuerden", "Ideas que encuentran a su gente", "Estrategia · Contenido · Resultados"];

/** Banda coral rotada con texto en loop (60 s por ciclo). Blanco sobre coral: texto grande, 3.05:1. */
export function Marquee() {
  const run = [...phrases, ...phrases];
  return (
    <div aria-hidden className="relative z-10 -mx-5 w-[calc(100%+40px)] -rotate-[1.2deg] overflow-hidden bg-coral py-[22px] text-white">
      <div className="flex w-max animate-marquee font-display text-[clamp(28px,3.6vw,48px)] leading-none font-bold tracking-[-0.02em] whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex">
            {run.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-8 pr-8">
                {t}
                <span className="inline-block size-3.5 rounded-full bg-white" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
