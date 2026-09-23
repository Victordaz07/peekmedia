import { FloatingWhatsApp } from "@/components/site/floating-whatsapp";
import { SiteFooter } from "@/components/site/footer";
import { SiteNav } from "@/components/site/nav";
import { getSiteContent } from "@/lib/data/content";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { general } = await getSiteContent();
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-surface">
      <a
        href="#contenido"
        className="sr-only z-[60] rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <SiteNav whatsapp={general.whatsapp} />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter general={general} />
      <FloatingWhatsApp whatsapp={general.whatsapp} />
    </div>
  );
}
