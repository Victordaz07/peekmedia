"use client";

import { Inbox, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Drawer,
  EmptyState,
  Field,
  Input,
  Segmented,
  Select,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@/components/ui";
import { money, priceLabel } from "@/lib/content/helpers";
import { leadStatus } from "@/lib/design/tokens";
import { formatDateTimeRD } from "@/lib/format";
import { leadStatuses, type Lead, type LeadStatus } from "@/lib/leads/schema";
import { updateLeadStatus } from "./actions";
import { LeadAssist } from "./lead-assist";

type Filter = "all" | LeadStatus;


export function LeadsBoard({ initial, aiReady }: { initial: Lead[]; aiReady: boolean }) {
  const toast = useToast();
  const [leads, setLeads] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = Object.fromEntries(leadStatuses.map((s) => [s, 0])) as Record<LeadStatus, number>;
    leads.forEach((l) => c[l.status]++);
    return c;
  }, [leads]);

  const visible = leads.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || `${l.name} ${l.business}`.toLowerCase().includes(q);
  });
  const open = leads.find((l) => l.id === openId) ?? null;

  async function changeStatus(lead: Lead, status: LeadStatus, { undo = true } = {}) {
    const previous = lead.status;
    if (previous === status) return;
    setLeads((all) => all.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    const res = await updateLeadStatus(lead.id, status);
    if (!res.ok) {
      setLeads((all) => all.map((l) => (l.id === lead.id ? { ...l, status: previous } : l)));
      toast({ title: "No se pudo cambiar el estado", description: res.error, tone: "error" });
      return;
    }
    toast({
      title: `${lead.name}: ${leadStatus[status].label}`,
      action: undo ? { label: "Deshacer", onClick: () => changeStatus({ ...lead, status }, previous, { undo: false }) } : undefined,
    });
  }

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Todavía no llegan cotizaciones"
        description="Cuando alguien arme una cotización en el sitio, aparece aquí con los servicios que marcó."
        action={
          <ButtonLink href="/#cotiza" target="_blank" variant="dark" size="sm">
            Ver el cotizador
          </ButtonLink>
        }
        className="bg-surface"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Filtrar por estado"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `Todos (${leads.length})` },
            ...leadStatuses.map((s) => ({ value: s, label: leadStatus[s].label, badge: s === "new" ? counts.new : undefined })),
          ]}
        />
        <div className="relative w-full max-w-[280px]">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <Input
            aria-label="Buscar por nombre o negocio"
            placeholder="Buscar nombre o negocio"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="py-2.5 pl-10"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Search} title="Nada por aquí" description="Prueba con otro filtro o búsqueda." className="bg-surface" />
      ) : (
        <Table>
          <caption className="sr-only">Prospectos del cotizador</caption>
          <THead>
            <tr>
              <TH>Fecha</TH>
              <TH>Prospecto</TH>
              <TH>Servicios</TH>
              <TH className="text-right">Estimado</TH>
              <TH>Estado</TH>
              <TH>
                <span className="sr-only">Acciones</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {visible.map((l) => (
              <TR key={l.id}>
                <TD className="whitespace-nowrap text-muted">{formatDateTimeRD(l.createdAt)}</TD>
                <TD>
                  <p className="font-bold">{l.name}</p>
                  {l.business && <p className="text-caption text-muted">{l.business}</p>}
                </TD>
                <TD className="min-w-[200px]">
                  {l.services.length ? (
                    <span title={l.services.map((s) => s.name).join(", ")}>
                      {l.services[0].name}
                      {l.services.length > 1 && <span className="text-muted"> +{l.services.length - 1}</span>}
                    </span>
                  ) : (
                    <span className="text-muted">Sin servicios</span>
                  )}
                </TD>
                <TD className="text-right whitespace-nowrap tabular-nums">
                  <Totals lead={l} />
                </TD>
                <TD>
                  <Select
                    aria-label={`Estado de ${l.name}`}
                    value={l.status}
                    onChange={(e) => changeStatus(l, e.target.value as LeadStatus)}
                    className="w-auto min-w-[170px] py-2 text-label"
                  >
                    {leadStatuses.map((s) => (
                      <option key={s} value={s}>
                        {leadStatus[s].label}
                      </option>
                    ))}
                  </Select>
                </TD>
                <TD>
                  <Button variant="ghost" size="sm" onClick={() => setOpenId(l.id)} aria-label={`Ver detalle de ${l.name}`}>
                    Ver
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Drawer
        open={open !== null}
        onClose={() => setOpenId(null)}
        title={open?.name ?? ""}
        description={open ? [open.business, formatDateTimeRD(open.createdAt)].filter(Boolean).join(" · ") : undefined}
      >
        {open && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="lead" status={open.status} />
              <Badge tone="outline">Desde el {open.source}</Badge>
            </div>
            <Field label="Estado">
              <Select value={open.status} onChange={(e) => changeStatus(open, e.target.value as LeadStatus)}>
                {leadStatuses.map((s) => (
                  <option key={s} value={s}>
                    {leadStatus[s].label}
                  </option>
                ))}
              </Select>
            </Field>
            <section className="flex flex-col gap-2">
              <h3 className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">Servicios</h3>
              {open.services.length ? (
                <ul className="flex flex-col divide-y divide-hairline rounded-item bg-hairline/50 px-4">
                  {open.services.map((s) => (
                    <li key={s.id} className="flex justify-between gap-3 py-3 text-label">
                      <span>{s.name}</span>
                      <span className="font-semibold whitespace-nowrap">{priceLabel(s.priceFrom, s.billing)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-label text-muted">No marcó servicios.</p>
              )}
              <p className="text-label">
                <Totals lead={open} long />
              </p>
            </section>
            <section className="flex flex-col gap-2">
              <h3 className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">Lo que nos contó</h3>
              <p className="text-body whitespace-pre-line">{open.notes || <span className="text-muted">Sin notas.</span>}</p>
            </section>
            <LeadAssist key={open.id} leadId={open.id} ready={aiReady} />
            <ButtonLink
              href={`/app/clientes/nuevo?${new URLSearchParams({ negocio: open.business || open.name, contacto: open.name })}`}
              variant="dark"
              className="self-start"
            >
              Convertir en cliente
            </ButtonLink>
          </>
        )}
      </Drawer>
    </div>
  );
}

function Totals({ lead, long }: { lead: Lead; long?: boolean }) {
  const parts = [
    lead.totalMonthly > 0 && `${money(lead.totalMonthly)}${long ? " al mes" : "/mes"}`,
    lead.totalOnce > 0 && `${money(lead.totalOnce)}${long ? " de pago único" : " único"}`,
  ].filter(Boolean);
  if (!parts.length) return <span className="text-muted">A cotizar</span>;
  return <>{long ? `Estimado desde ${parts.join(" + ")}` : parts.join(" + ")}</>;
}
