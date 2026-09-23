"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Segmented } from "@/components/ui";
import { cn } from "@/lib/cn";

/** Pestañas del espacio. El equipo además puede previsualizar lo que ve el cliente (?vista=cliente). */
export function SpaceTabs({
  clientId,
  isTeam,
  badges,
}: {
  clientId: string;
  isTeam: boolean;
  badges: { plan: number; approvals: number; inbox: number };
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const preview = params.get("vista") === "cliente";
  const base = `/app/c/${clientId}`;
  const q = preview ? "?vista=cliente" : "";
  const asTeam = isTeam && !preview;
  const tab = (path: string, label: string, badge?: number) => ({
    href: `${base}${path}`,
    label,
    badge,
    active: path ? pathname.startsWith(`${base}${path}`) : pathname === base,
  });
  const tabs = [
    tab("", "Resumen"),
    tab("/calendario", "Calendario"),
    ...(asTeam ? [tab("/crear", "Crear"), tab("/bandeja", "Bandeja", badges.inbox)] : []),
    tab("/aprobaciones", "Aprobaciones", badges.approvals),
    tab("/reportes", "Reportes"),
    tab("/novedades", "Novedades"),
    tab("/conectar", asTeam ? "Conectar" : "Conectar cuentas"),
    tab("/plan", asTeam ? "Plan y contrato" : "Mi plan", badges.plan),
    ...(asTeam ? [{ href: `/app/clientes/${clientId}`, label: "Ficha y accesos", active: false, badge: undefined }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Secciones del espacio" className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface p-1">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href.startsWith(base) ? `${t.href}${q}` : t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-label font-semibold whitespace-nowrap transition-colors",
              t.active ? "bg-ink text-white" : "hover:bg-hairline",
            )}
          >
            {t.label}
            {t.badge ? <span className="grid min-w-5 place-items-center rounded-full bg-coral px-1.5 text-eyebrow font-bold text-ink">{t.badge}</span> : null}
          </Link>
        ))}
      </nav>
      {isTeam && (
        <div className="flex items-center gap-2">
          <span className="text-caption font-semibold text-muted">Ver como</span>
          <Segmented
            label="Ver como"
            size="sm"
            value={preview ? "client" : "team"}
            onChange={(v) => router.replace(`${pathname}${v === "client" ? "?vista=cliente" : ""}`)}
            options={[
              { value: "team", label: "Community manager" },
              { value: "client", label: "Cliente" },
            ]}
          />
        </div>
      )}
    </div>
  );
}
