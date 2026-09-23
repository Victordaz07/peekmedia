import { ArrowRight, FileSignature, Inbox, Sparkles, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar, ButtonLink, Card, CardTitle, KpiCard, LoadingState, StatusBadge } from "@/components/ui";
import { requireTeam } from "@/lib/auth";
import { listClients } from "@/lib/data/clients";
import { listLatestContracts, listPlanRequests } from "@/lib/data/contracts";
import { listLeads } from "@/lib/data/leads";
import { formatDateTimeRD } from "@/lib/format";

export const metadata: Metadata = { title: "Inicio" };

export default function InicioPage() {
  return (
    <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
      <Inicio />
    </Suspense>
  );
}

async function Inicio() {
  const user = await requireTeam();
  const [clients, contracts, requests, leads] = await Promise.all([listClients(), listLatestContracts(), listPlanRequests(), listLeads()]);
  const byId = new Map(clients.map((c) => [c.id, c]));
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const toSign = contracts.filter((c) => c.status === "sent");
  const drafts = contracts.filter((c) => c.status === "draft");
  const newLeads = leads.filter((l) => l.status === "new");
  const active = clients.filter((c) => c.status === "active").length;

  const items = [
    ...pendingRequests.map((r) => ({
      key: r.id,
      icon: Sparkles,
      client: byId.get(r.clientId),
      text: r.type === "plan" ? `pidió cambiar de plan (${r.target})` : `pidió agregar ${r.target}`,
      href: `/app/c/${r.clientId}/plan`,
      badge: <StatusBadge kind="request" status="pending" />,
    })),
    ...drafts.map((c) => ({
      key: c.id,
      icon: FileSignature,
      client: byId.get(c.clientId),
      text: `tiene el contrato v${c.version} en borrador, sin enviar`,
      href: `/app/c/${c.clientId}/plan`,
      badge: <StatusBadge kind="contract" status="draft" />,
    })),
    ...toSign.map((c) => ({
      key: c.id,
      icon: FileSignature,
      client: byId.get(c.clientId),
      text: `todavía no firma el contrato v${c.version}${c.sentAt ? ` (enviado el ${formatDateTimeRD(c.sentAt).split(",")[0]})` : ""}`,
      href: `/app/c/${c.clientId}/plan`,
      badge: <StatusBadge kind="contract" status="sent" />,
    })),
  ];

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-display-sm font-bold tracking-[-0.04em]">Hola, {user.name.split(" ")[0]}</h1>
        <p className="text-body text-muted">Lo que te toca hoy, en todos los clientes.</p>
      </header>

      <div className="flex flex-wrap gap-4">
        <KpiCard label="Clientes activos" value={active} />
        <KpiCard label="Por firmar" value={toSign.length} />
        <KpiCard label="Solicitudes" value={pendingRequests.length} />
        <KpiCard label="Prospectos nuevos" value={newLeads.length} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="gap-4">
          <CardTitle>Pendientes</CardTitle>
          {items.length === 0 ? (
            <p className="rounded-item border-[1.5px] border-dashed border-ink/25 p-6 text-center text-label text-muted">
              Nada pendiente en contratos ni solicitudes. ¡Bien ahí!
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-hairline">
              {items.map((it) => (
                <li key={it.key}>
                  <Link href={it.href} className="flex items-center gap-3 rounded-item px-2 py-3 transition-colors hover:bg-hairline/60">
                    {it.client ? <Avatar name={it.client.name} color={it.client.avatarColor} size="sm" /> : <it.icon aria-hidden className="size-5" />}
                    <span className="min-w-0 flex-1 text-label">
                      <strong>{it.client?.name ?? "Cliente"}</strong> {it.text}
                    </span>
                    {it.badge}
                    <ArrowRight aria-hidden className="size-4 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Prospectos nuevos</CardTitle>
            <Inbox aria-hidden className="size-5 text-muted" />
          </div>
          {newLeads.length === 0 ? (
            <p className="text-label text-muted">No hay cotizaciones nuevas.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-label">
              {newLeads.slice(0, 5).map((l) => (
                <li key={l.id} className="flex justify-between gap-3">
                  <span className="truncate">
                    <strong>{l.name}</strong> {l.business && `· ${l.business}`}
                  </span>
                  <span className="shrink-0 text-caption text-muted">{formatDateTimeRD(l.createdAt).split(",")[0]}</span>
                </li>
              ))}
            </ul>
          )}
          <ButtonLink href="/app/prospectos" variant="outline" size="sm" className="self-start">
            Ver prospectos
          </ButtonLink>
        </Card>
      </div>

      {clients.length === 0 && (
        <Card variant="ink" className="flex-row flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users aria-hidden className="size-6" />
            <p className="text-body">Crea el primer cliente para empezar a trabajar en su espacio.</p>
          </div>
          <ButtonLink href="/app/clientes/nuevo">Nuevo cliente</ButtonLink>
        </Card>
      )}
    </>
  );
}
