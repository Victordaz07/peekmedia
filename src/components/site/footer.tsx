import Link from "next/link";
import { Logo } from "@/components/ui";
import { hasText, instagramUrl, waLink, waMessages } from "@/lib/content/helpers";
import type { SiteContent } from "@/lib/content/schema";

export function SiteFooter({ general }: { general: SiteContent["general"] }) {
  return (
    <footer className="border-t border-hairline px-[clamp(20px,4vw,32px)] pt-14 pb-8">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-14">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="flex flex-col gap-3">
            <Logo className="h-14 self-start" />
            <p className="font-display text-[20px] font-semibold">Ideas que encuentran a su gente.</p>
          </div>
          <div className="flex flex-wrap gap-14 text-button">
            <FooterCol title="Síguenos">
              <a href={instagramUrl(general.instagram)} target="_blank" rel="noopener" className="hover:text-coral-strong">
                Instagram @{general.instagram}
              </a>
            </FooterCol>
            <FooterCol title="Contacto">
              <a href={waLink(general.whatsapp, waMessages.cta)} target="_blank" rel="noopener" className="hover:text-coral-strong">
                WhatsApp
              </a>
              {hasText(general.contactEmail) && (
                <a href={`mailto:${general.contactEmail}`} className="hover:text-coral-strong">
                  {general.contactEmail}
                </a>
              )}
              {hasText(general.website) && <span>{general.website}</span>}
            </FooterCol>
            <FooterCol title="Legal">
              <Link href="/privacidad" className="hover:text-coral-strong">
                Privacidad
              </Link>
              <Link href="/terminos" className="hover:text-coral-strong">
                Términos
              </Link>
              <Link href="/eliminacion-de-datos" className="hover:text-coral-strong">
                Eliminación de datos
              </Link>
            </FooterCol>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 text-caption">
          <span>© 2026 Peek Media · Santo Domingo, República Dominicana</span>
          <span>Estrategia · Contenido · Resultados</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption font-semibold tracking-[0.14em] uppercase">{title}</p>
      {children}
    </div>
  );
}
