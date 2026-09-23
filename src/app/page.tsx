import { ButtonLink, Eyebrow, Logo } from "@/components/ui";

// Portada provisional: el sitio público se construye en la Fase 2.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-start justify-center gap-8 bg-texture-gris px-[clamp(20px,4vw,32px)] py-22">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col items-start gap-8">
        <Logo className="h-12" priority />
        <Eyebrow>Estrategia · Contenido · Resultados</Eyebrow>
        <h1 className="font-display text-display-lg font-bold tracking-[-0.045em]">
          Haz que te{" "}
          <span className="relative inline-block">
            <span aria-hidden className="absolute inset-x-0 bottom-[0.06em] h-[0.2em] bg-cyan" />
            <span className="relative">vean.</span>
          </span>
          <br />
          Haz que te recuerden.
        </h1>
        <p className="max-w-[380px] text-lead">Estamos preparando el sitio nuevo. Mientras tanto, mira las piezas con las que lo vamos a construir.</p>
        <ButtonLink href="/sistema">Ver el sistema de diseño</ButtonLink>
      </div>
    </main>
  );
}
