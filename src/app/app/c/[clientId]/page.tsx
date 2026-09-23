import { CheckCircle2, FileSignature, PlugZap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FollowersChart, KpiRow, PlatformCards, sourceLabel, TopPosts } from "@/components/posts/insights";
import { ButtonLink, Card, CardTitle, EmptyState, LoadingState, NetworkChip, NetworkDot, StatusBadge } from "@/components/ui";
import { isClientAdmin, requireClientAccess } from "@/lib/auth";
import { money } from "@/lib/content/helpers";
import { nextPayment } from "@/lib/contracts/document";
import { getClient } from "@/lib/data/clients";
import { listContracts, listPlanRequests } from "@/lib/data/contracts";
import { listMetrics } from "@/lib/data/insights";
import { listPosts } from "@/lib/data/posts";
import { formatDateTimeRD, shortDate } from "@/lib/format";
import { daysAgo, kpis, monthUsage, platformRows, topPosts } from "@/lib/social/analytics";
import { postTypeLabel } from "@/lib/social/platforms";

export const metadata: Metadata = { title: "Resumen" };

export default function ResumenPage({ params, searchParams }: PageProps<"/app/c/[clientId]">) {
  return (
    <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
      <Resumen params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Resumen({ params, searchParams }: Pick<PageProps<"/app/c/[clientId]">, "params" | "searchParams">) {
  const { clientId } = await params;
  const { vista } = await searchParams;
  const viewer = await requireClientAccess(clientId);
  const asClient = viewer.kind === "client" || vista === "cliente";
  const client = (await getClient(clientId))!;
  const all = await listContracts(clientId);
  const current = asClient ? all.find((c) => c.status !== "draft") : all[0];
  const pending = (await listPlanRequests(clientId)).filter((r) => r.status === "pending");
  const planHref = `/app/c/${clientId}/plan${vista === "cliente" ? "?vista=cliente" : ""}`;
  const canSign = isClientAdmin(viewer);
  const base = `/app/c/${clientId}`;
  const q = vista === "cliente" ? "?vista=cliente" : "";
  const [rows, posts] = await Promise.all([listMetrics(clientId, daysAgo(120)), listPosts(clientId, { hideDrafts: asClient })]);
  const k = rows.length ? kpis(rows, posts) : null;
  const plats = platformRows(rows, posts);
  const usage = monthUsage(posts);
  const now = new Date().toISOString();
  const upcoming = posts.filter((p) => p.scheduledAt && p.scheduledAt >= now && ["pending", "approved", "scheduled"].includes(p.status)).slice(0, 5);
  const toApprove = posts.filter((p) => p.status === "pending").length;
  const canReview = viewer.kind === "client" && (viewer.role === "admin" || viewer.role === "approver");

  return (
    <div className="flex flex-col gap-5">
      {asClient && current?.status === "sent" && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md bg-coral-tint p-5">
          <div className="flex items-start gap-3">
            <FileSignature aria-hidden className="mt-1 size-5 shrink-0" />
            <div>
              <p className="font-display text-h3 font-bold">Tu contrato está listo para firmar</p>
              <p className="text-label">
                {current.planName} · {money(current.price)} al mes.{" "}
                {canSign || viewer.kind === "team" ? "Revísalo y fírmalo desde tu panel, sin papeles." : "Lo firma un Administrador de tu negocio."}
              </p>
            </div>
          </div>
          <ButtonLink href={planHref}>Revisar y firmar</ButtonLink>
        </div>
      )}
      {!asClient && current?.status === "draft" && (
        <p className="rounded-item bg-hairline px-4 py-3 text-label">
          El contrato está en <strong>borrador</strong>: el cliente no lo ve hasta que lo envíes desde{" "}
          <a href={planHref} className="font-semibold underline decoration-cyan decoration-2 underline-offset-4">
            Plan y contrato
          </a>
          .
        </p>
      )}

      {asClient && toApprove > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md bg-coral-tint p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden className="mt-1 size-5 shrink-0" />
            <div>
              <p className="font-display text-h3 font-bold">
                {toApprove} {toApprove === 1 ? "publicación espera" : "publicaciones esperan"} tu aprobación
              </p>
              <p className="text-label">{canReview || viewer.kind === "team" ? "Revísalas y apruébalas o pide cambios." : "Las aprueba un Administrador o Aprobador de tu negocio."}</p>
            </div>
          </div>
          <ButtonLink href={`${base}/aprobaciones${q}`}>Revisar</ButtonLink>
        </div>
      )}

      {k ? (
        <KpiRow k={k} source={sourceLabel(k)} />
      ) : (
        <Card className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex max-w-xl flex-col gap-1">
              <CardTitle>{asClient ? "Conecta tus redes para ver tus números" : "Este cliente todavía no tiene métricas"}</CardTitle>
              <p className="text-label text-muted">
                Cuando {asClient ? "conectes" : "conecte"} las cuentas, el sistema trae cada mañana seguidores, alcance, interacción y las mejores publicaciones.
              </p>
            </div>
            <ButtonLink href={`${base}/conectar${q}`} iconLeft={<PlugZap className="size-4" />}>
              Conectar cuentas
            </ButtonLink>
          </div>
          <div className="flex flex-wrap gap-2">
            {client.platforms.map((p) => (
              <NetworkChip key={p} network={p} />
            ))}
          </div>
        </Card>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-5">
          <FollowersChart rows={rows} />
          <TopPosts posts={topPosts(posts, 4)} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="gap-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Próximas publicaciones</CardTitle>
              <Link href={`${base}/calendario${q}`} className="text-label font-semibold underline decoration-cyan decoration-2 underline-offset-4">
                Calendario
              </Link>
            </div>
            {upcoming.length ? (
              <ul className="flex flex-col divide-y divide-hairline">
                {upcoming.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`${base}/${p.status === "pending" ? "aprobaciones" : "calendario"}?post=${p.id}${q && `&${q.slice(1)}`}`}
                      className="flex items-center gap-3 py-2.5 hover:bg-hairline/40"
                    >
                      <span className="flex shrink-0 gap-0.5">
                        {p.platforms.slice(0, 3).map((n) => (
                          <NetworkDot key={n} network={n} />
                        ))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-label font-semibold">{p.caption || postTypeLabel[p.type]}</span>
                        <span className="text-caption text-muted">{formatDateTimeRD(p.scheduledAt!)}</span>
                      </span>
                      <StatusBadge kind="post" status={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-label text-muted">No hay nada programado todavía.</p>
            )}
          </Card>

          {current ? (
            <Card variant="ink" className="gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-eyebrow font-bold tracking-[0.12em] uppercase">Plan contratado</span>
                  <span className="font-display text-h2 leading-none font-bold tracking-[-0.03em]">{current.planName}</span>
                </div>
                <StatusBadge kind="contract" status={current.status} />
              </div>
              <dl className="flex flex-wrap gap-x-8 gap-y-3">
                <Fact label="Inversión mensual" value={money(current.price)} />
                {current.status === "signed" && <Fact label="Próximo pago" value={shortDate(nextPayment(current), false)} />}
                <Fact label="Publicado este mes" value={`${usage.posts + usage.reels} / ${current.deliverables.posts + current.deliverables.reels}`} />
              </dl>
              <ButtonLink href={planHref} variant="primary" size="sm" className="self-start">
                Ver plan y contrato
              </ButtonLink>
            </Card>
          ) : (
            <EmptyState
              icon={FileSignature}
              title={asClient ? "Tu contrato aparece aquí" : "Este cliente no tiene contrato"}
              description={asClient ? "Cuando tu agencia te lo envíe, lo revisas y lo firmas desde aquí." : "Prepara uno desde Plan y contrato."}
              className="bg-surface"
            />
          )}

          {pending.length > 0 && (
            <Card className="gap-3">
              <CardTitle>Solicitudes pendientes</CardTitle>
              <ul className="flex flex-col gap-2 text-label">
                {pending.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3">
                    <span>{r.type === "plan" ? `Cambio de plan (${r.target})` : `Agregar: ${r.target}`}</span>
                    <StatusBadge kind="request" status={r.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {plats.length > 0 && <PlatformCards rows={plats} />}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-eyebrow">{label}</dt>
      <dd className="font-display text-[20px] font-bold">{value}</dd>
    </div>
  );
}
