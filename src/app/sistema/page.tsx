import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isVercelProduction } from "@/lib/env";
import { Showcase } from "./showcase";

export const metadata: Metadata = {
  title: "Sistema de diseño",
  robots: { index: false, follow: false },
};

/** Catálogo de componentes para desarrollo. En producción no existe. */
export default function SistemaPage() {
  if (isVercelProduction()) notFound();
  return <Showcase />;
}
