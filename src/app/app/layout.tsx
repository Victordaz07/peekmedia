import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel Peek" },
  robots: { index: false, follow: false },
};

// Cada zona (agencia y espacio de cliente) pone su propio marco con su menú lateral.
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return children;
}
