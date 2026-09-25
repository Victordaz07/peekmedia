"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buttonStyles, NetworkDot } from "@/components/ui";
import { networks, type Network } from "@/lib/design/tokens";

const labels: Record<string, [team: string, client: string]> = {
  "": ["Resumen", "Resumen"],
  plan: ["Plan y contrato", "Mi plan y contrato"],
  calendario: ["Calendario de contenido", "Calendario de contenido"],
  crear: ["Crear publicación", "Crear publicación"],
  bandeja: ["Bandeja unificada", "Bandeja unificada"],
  aprobaciones: ["Aprobaciones", "Aprobaciones"],
  reportes: ["Reportes", "Reportes"],
  novedades: ["Novedades", "Novedades"],
  conectar: ["Conectar cuentas", "Conectar cuentas"],
};

/** Encabezado de cada sección del espacio, como el prototipo. */
export function SpaceHeading({
  clientId,
  name,
  industry,
  platforms,
  isTeam,
}: {
  clientId: string;
  name: string;
  industry: string;
  platforms: Network[];
  isTeam: boolean;
}) {
  const pathname = usePathname();
  const preview = useSearchParams().get("vista") === "cliente";
  const section = pathname.replace(`/app/c/${clientId}`, "").split("/")[1] ?? "";
  const asTeam = isTeam && !preview;
  const label = (labels[section] ?? labels[""])[asTeam ? 0 : 1];

  return (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div className="flex min-w-0 flex-col gap-2.5">
        <p className="text-caption font-semibold tracking-[0.12em] uppercase">{label}</p>
        <h1 className="font-display text-display-sm leading-[0.95] font-bold tracking-[-0.04em]">{name}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          {industry && <span className="mr-1.5 text-label">{industry}</span>}
          {platforms.map((p) => (
            <span key={p} className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-[5px] text-eyebrow font-semibold">
              <NetworkDot network={p} className="size-2" />
              {networks[p].label}
            </span>
          ))}
        </div>
      </div>
      <div data-noprint className="flex flex-wrap items-center gap-2.5 print:hidden">
        <span className="rounded-full bg-surface px-4 py-[11px] text-label">Últimos 30 días</span>
        {asTeam && (
          <Link href={`/app/c/${clientId}/crear`} className={buttonStyles({ variant: "primary" })}>
            + Nueva publicación
          </Link>
        )}
      </div>
    </header>
  );
}
