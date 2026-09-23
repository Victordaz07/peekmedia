import type { Metadata } from "next";
import { About } from "@/components/site/about";
import { CaseStudy } from "@/components/site/case-study";
import { Faq } from "@/components/site/faq";
import { Feed } from "@/components/site/feed";
import { FinalCta } from "@/components/site/final-cta";
import { Hero } from "@/components/site/hero";
import { ClientLogos } from "@/components/site/logos";
import { Marquee } from "@/components/site/marquee";
import { Plans } from "@/components/site/plans";
import { Process } from "@/components/site/process";
import { Quoter } from "@/components/site/quoter";
import { Testimonials } from "@/components/site/testimonials";
import { publicView } from "@/lib/content/helpers";
import { getSiteContent } from "@/lib/data/content";
import { localBusinessJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default async function HomePage() {
  const content = publicView(await getSiteContent());
  const { general } = content;
  return (
    <>
      <script
        type="application/ld+json"
        // JSON escapado: "<" no puede cerrar el <script>.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd(general)).replace(/</g, "\\u003c") }}
      />
      <Hero general={general} />
      <Marquee />
      <About general={general} />
      <Plans plans={content.plans} whatsapp={general.whatsapp} />
      {content.quoteServices.length > 0 && <Quoter services={content.quoteServices} whatsapp={general.whatsapp} />}
      <Process steps={content.process} />
      <Feed posts={content.posts} general={general} />
      <CaseStudy data={content.case} />
      <ClientLogos logos={content.logos} />
      <Testimonials items={content.testimonials} />
      <Faq items={content.faq} />
      <FinalCta general={general} />
    </>
  );
}
