import type { Metadata, Viewport } from "next";
import { Caveat, DM_Sans, Space_Grotesk } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk-src",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans-src",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Solo para la firma del contrato: no se precarga.
const caveat = Caveat({
  variable: "--font-caveat-src",
  subsets: ["latin"],
  weight: ["600"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Peek Media · Haz que te vean. Haz que te recuerden.",
    template: "%s · Peek Media",
  },
  description:
    "Agencia de marketing digital en Santo Domingo. Estrategia, contenido y resultados para tu marca en redes sociales.",
  openGraph: {
    type: "website",
    locale: "es_DO",
    siteName: "Peek Media",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0B1F33",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-DO" className={`${spaceGrotesk.variable} ${dmSans.variable} ${caveat.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
