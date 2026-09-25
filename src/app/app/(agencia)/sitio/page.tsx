import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink, LoadingState } from "@/components/ui";
import { requireTeam } from "@/lib/auth";
import { getSiteContentFresh } from "@/lib/data/content";
import { SiteEditor } from "./site-editor";

export const metadata: Metadata = { title: "Sitio web" };

export default function SitioPage() {
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-display-sm font-bold tracking-[-0.04em]">Sitio web</h1>
          <p className="max-w-[60ch] text-body text-muted">
            Textos, planes, cotizador y secciones del sitio. Lo que quede vacío no se publica.
          </p>
        </div>
        <ButtonLink href="/" target="_blank" variant="outline" size="sm" iconRight={<ExternalLink className="size-4" />}>
          Ver sitio
        </ButtonLink>
      </header>
      <Suspense fallback={<LoadingState label="Cargando contenido…" className="rounded-md bg-surface" />}>
        <Editor />
      </Suspense>
    </>
  );
}

async function Editor() {
  await requireTeam();
  return <SiteEditor initial={await getSiteContentFresh()} />;
}
