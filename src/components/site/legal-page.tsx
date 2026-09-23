import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui";
import { hasText, waLink } from "@/lib/content/helpers";
import type { SiteContent } from "@/lib/content/schema";

export const LEGAL_UPDATED = "23 de septiembre de 2026";

export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <article className="mx-auto flex max-w-[760px] flex-col gap-8 px-[clamp(20px,4vw,32px)] py-[clamp(48px,8vw,88px)]">
      <header className="flex flex-col gap-5">
        <Eyebrow>Legal · Actualizado el {LEGAL_UPDATED}</Eyebrow>
        <h1 className="font-display text-display-sm font-bold tracking-[-0.04em] text-balance">{title}</h1>
        <p className="text-lead text-pretty">{intro}</p>
      </header>
      <div className="flex flex-col gap-6 text-body [&_a]:font-semibold [&_a]:underline [&_a]:decoration-cyan [&_a]:decoration-2 [&_a]:underline-offset-4 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-h3 [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
        {children}
      </div>
    </article>
  );
}

/** Cómo contactarnos, con lo que haya configurado en el CMS. */
export function ContactLine({ general }: { general: SiteContent["general"] }) {
  const email = hasText(general.contactEmail) ? general.contactEmail : null;
  return (
    <>
      escríbenos por{" "}
      <a href={waLink(general.whatsapp, "Hola Peek Media, tengo una consulta sobre mis datos.")} target="_blank" rel="noopener">
        WhatsApp
      </a>
      {email && (
        <>
          {" "}
          o a <a href={`mailto:${email}`}>{email}</a>
        </>
      )}
    </>
  );
}
