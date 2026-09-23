import Link from "next/link";
import { ButtonLink, Logo } from "@/components/ui";
import { waLink, waMessages } from "@/lib/content/helpers";

const links = [
  ["#nosotros", "Nosotros"],
  ["#servicios", "Servicios"],
  ["#cotiza", "Cotiza"],
  ["#feed", "Feed"],
  ["#caso", "Caso real"],
] as const;

export function SiteNav({ whatsapp }: { whatsapp: string }) {
  return (
    <nav aria-label="Principal" className="sticky top-0 z-50 border-b border-hairline bg-white/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-5 px-[clamp(20px,4vw,32px)] py-3">
        <div className="relative shrink-0">
          <Link href="/#top" aria-label="Peek Media, inicio" className="block rounded-sm">
            <Logo className="h-10" priority />
          </Link>
          {/* Atajo del equipo: el punto coral de la "P" lleva al login (no es seguridad, solo un atajo). */}
          <Link
            href="/login"
            aria-label="Acceso del equipo"
            tabIndex={-1}
            className="absolute top-[10px] left-[9px] size-4 cursor-default rounded-full"
          />
        </div>
        <div className="flex items-center gap-8">
          <div className="hidden gap-7 text-button font-medium min-[820px]:flex">
            {links.map(([href, label]) => (
              <a key={href} href={`/${href}`} className="rounded-sm transition-colors hover:text-coral-strong">
                {label}
              </a>
            ))}
          </div>
          <ButtonLink href={waLink(whatsapp, waMessages.nav)} target="_blank" rel="noopener" size="sm" className="h-11 px-5 text-button">
            Escríbenos
          </ButtonLink>
        </div>
      </div>
    </nav>
  );
}
