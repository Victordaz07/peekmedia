import { hasText, instagramUrl } from "@/lib/content/helpers";
import type { SiteContent } from "@/lib/content/schema";
import { siteUrl } from "@/lib/site";

/** Datos estructurados LocalBusiness para buscadores. */
export function localBusinessJsonLd(g: SiteContent["general"]) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Peek Media",
    description: "Agencia de marketing digital en Santo Domingo: estrategia, contenido y campañas para redes sociales.",
    url: siteUrl,
    logo: `${siteUrl}/icon.png`,
    image: `${siteUrl}/opengraph-image`,
    slogan: "Ideas que encuentran a su gente.",
    areaServed: "República Dominicana",
    address: { "@type": "PostalAddress", addressLocality: "Santo Domingo", addressCountry: "DO" },
    ...(hasText(g.whatsapp) && { telephone: `+${g.whatsapp.replace(/\D/g, "")}` }),
    ...(hasText(g.contactEmail) && { email: g.contactEmail }),
    ...(hasText(g.founderName) && { founder: { "@type": "Person", name: g.founderName } }),
    sameAs: [instagramUrl(g.instagram)],
  };
}
