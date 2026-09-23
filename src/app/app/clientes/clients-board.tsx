"use client";

import { Search, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, ButtonLink, EmptyState, Input, KpiCard, NetworkDot, Segmented, StatusBadge } from "@/components/ui";
import type { Client, ClientStatus } from "@/lib/clients/schema";
import { money } from "@/lib/content/helpers";
import { clientStatus } from "@/lib/design/tokens";

type Filter = "all" | ClientStatus;

export function ClientsBoard({ clients }: { clients: Client[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Todavía no hay clientes"
        description="Crea el primer espacio: se genera con un contrato en borrador listo para ajustar y enviar."
        action={
          <ButtonLink href="/app/clientes/nuevo" size="sm">
            Crear el primer cliente
          </ButtonLink>
        }
        className="bg-surface"
      />
    );
  }

  const count = (s: ClientStatus) => clients.filter((c) => c.status === s).length;
  const mrr = clients.filter((c) => c.status === "active").reduce((sum, c) => sum + (c.fee ?? 0), 0);
  const q = query.trim().toLowerCase();
  const visible = clients.filter(
    (c) => (filter === "all" || c.status === filter) && (!q || `${c.name} ${c.industry} ${c.contactName}`.toLowerCase().includes(q)),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-4">
        <KpiCard label="Activos" value={count("active")} />
        <KpiCard label="Prospectos" value={count("prospect")} />
        <KpiCard label="Pausados" value={count("paused")} />
        <KpiCard label="Ingreso mensual" value={money(mrr)} definition="Suma de la tarifa de los clientes activos." />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Filtrar por estado"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `Todos (${clients.length})` },
            ...(["active", "prospect", "paused", "ended"] as const).map((s) => ({ value: s, label: clientStatus[s].label })),
          ]}
        />
        <div className="relative w-full max-w-[280px]">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <Input aria-label="Buscar cliente" placeholder="Buscar cliente" value={query} onChange={(e) => setQuery(e.target.value)} className="py-2.5 pl-10" />
        </div>
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={Search} title="Nada por aquí" description="Prueba con otro filtro o búsqueda." className="bg-surface" />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
          {visible.map((c) => (
            <li key={c.id}>
              <Link
                href={`/app/clientes/${c.id}`}
                className="flex h-full flex-col gap-4 rounded-md bg-surface p-5 transition-[transform,box-shadow] duration-300 ease-reveal hover:-translate-y-1 hover:shadow-hover"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} color={c.avatarColor} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[19px] font-bold">{c.name}</p>
                    <p className="truncate text-caption text-muted">{c.industry || "Sin rubro"}</p>
                  </div>
                  <StatusBadge kind="client" status={c.status} />
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 text-label">
                  <span className="flex gap-1.5" aria-label={`${c.platforms.length} redes`}>
                    {c.platforms.map((p) => (
                      <NetworkDot key={p} network={p} />
                    ))}
                  </span>
                  <span className="font-semibold">{c.fee ? `${money(c.fee)}/mes` : "Sin tarifa"}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
