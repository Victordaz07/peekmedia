import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getViewer, requireClientAccess, type ClientViewer, type Viewer } from "@/lib/auth";
import { getClient, listClients } from "@/lib/data/clients";
import { listContracts, listPlanRequests } from "@/lib/data/contracts";
import { listDemoClientIds } from "@/lib/data/demo";
import { listInbox } from "@/lib/data/insights";
import { listPosts } from "@/lib/data/posts";
import { listAccounts } from "@/lib/data/social";
import { Logo } from "@/components/ui";
import { BottomNav, type NavItem } from "./app-nav";
import { ClientCards, SideNav, SpaceNav, ViewAs, type SideItem } from "./side-nav";
import { UserCard } from "./user-card";

/** Hay datos de demostración cargados: se marca el panel con "DEMO", como el prototipo. */
async function demoLoaded() {
  return listDemoClientIds().then((ids) => ids.length > 0, () => false);
}

function Frame({ demo, children, viewer }: { demo: boolean; children: ReactNode; viewer: Viewer }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Logo className="h-9" />
        {demo && <span className="rounded-sm bg-coral-tint px-2 py-1 text-[11px] font-bold tracking-[0.1em]">DEMO</span>}
      </div>
      {children}
      <div className="flex flex-col gap-2.5 lg:mt-auto">
        <UserCard viewer={viewer} />
        {viewer.kind === "team" && <ViewAs />}
        {demo && <p className="text-eyebrow leading-[1.45]">Datos de demostración para enseñar el panel. Se borran desde Ajustes.</p>}
      </div>
    </>
  );
}

const agencyItems = (pending: number): SideItem[] => [
  { href: "/app", label: "Inicio", exact: true, badge: pending },
  { href: "/app/clientes", label: "Gestión de clientes" },
  { href: "/app/prospectos", label: "Prospectos" },
  { href: "/app/sitio", label: "Sitio web" },
  { href: "/app/conexiones", label: "Conexiones y API" },
  { href: "/app/ajustes", label: "Ajustes" },
];

async function clientCards() {
  return (await listClients())
    .filter((c) => c.status !== "ended")
    .map((c) => ({ id: c.id, name: c.name, industry: c.industry, color: c.avatarColor }));
}

/** Páginas de la agencia (Inicio, clientes, prospectos, sitio, conexiones y ajustes). Lee la sesión: va dentro de <Suspense>. */
export async function AgencySidebar() {
  const viewer = await getViewer();
  if (!viewer) return null;
  if (viewer.kind === "client") return <ClientSidebar viewer={viewer} />;
  const [cards, requests, demo] = await Promise.all([clientCards(), listPlanRequests(), demoLoaded()]);
  const pending = requests.filter((r) => r.status === "pending").length;
  return (
    <Frame demo={demo} viewer={viewer}>
      {cards.length > 0 && <ClientCards clients={cards} />}
      <SideNav items={agencyItems(pending)} label="Agencia" />
    </Frame>
  );
}

/** Espacio de un cliente: el menú del prototipo con los pendientes de ese cliente. */
export async function SpaceSidebar({ clientId }: { clientId: string }) {
  const viewer = await requireClientAccess(clientId);
  if (viewer.kind === "client") return <ClientSidebar viewer={viewer} />;
  const client = await getClient(clientId);
  if (!client) notFound();
  const [cards, requests, demo, badges] = await Promise.all([clientCards(), listPlanRequests(), demoLoaded(), spaceBadges(clientId, client.platforms, true)]);
  const base = `/app/c/${clientId}`;
  const team: SideItem[] = [
    { href: base, label: "Resumen", exact: true },
    { href: `${base}/plan`, label: "Plan y contrato" },
    { href: `${base}/calendario`, label: "Calendario" },
    { href: `${base}/crear`, label: "Crear publicación" },
    { href: `${base}/bandeja`, label: "Bandeja", badge: badges.inbox },
    { href: `${base}/aprobaciones`, label: "Aprobaciones", badge: badges.approvals },
    { href: `${base}/reportes`, label: "Reportes" },
    { href: `${base}/novedades`, label: "Novedades" },
    { href: `${base}/conectar`, label: "Conectar cuentas", badge: badges.connect },
    { href: "/app/conexiones", label: "Conexiones y API" },
    { href: "/app/clientes", label: "Gestión de clientes" },
  ];
  const pending = requests.filter((r) => r.status === "pending").length;
  return (
    <Frame demo={demo} viewer={viewer}>
      <ClientCards clients={cards} />
      <SpaceNav team={team} client={clientItems(base, { ...badges, plan: badges.planToSign }, true)} />
      <div className="hidden flex-col gap-1 lg:flex">
        <p className="px-3.5 pt-1 text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">Agencia</p>
        <SideNav items={agencyItems(pending).filter((i) => ["/app", "/app/prospectos", "/app/sitio", "/app/ajustes"].includes(i.href))} label="Agencia" />
      </div>
    </Frame>
  );
}

async function spaceBadges(clientId: string, platforms: string[], isTeam: boolean) {
  const [posts, inbox, accounts, contracts] = await Promise.all([
    listPosts(clientId, { hideDrafts: !isTeam }),
    isTeam ? listInbox(clientId) : Promise.resolve([]),
    listAccounts(clientId),
    listContracts(clientId),
  ]);
  const connected = new Set(accounts.filter((a) => a.status === "connected").map((a) => a.platform));
  const latest = contracts.find((c) => c.status !== "draft");
  return {
    approvals: posts.filter((p) => p.status === "pending").length,
    inbox: inbox.filter((i) => !i.reply).length,
    connect: platforms.filter((p) => !connected.has(p as never)).length,
    planToSign: latest?.status === "sent" ? 1 : 0,
  };
}

function clientItems(base: string, b: { approvals: number; connect: number; plan: number }, canManage: boolean): SideItem[] {
  return [
    { href: base, label: "Resumen", exact: true },
    { href: `${base}/plan`, label: "Mi plan y contrato", badge: b.plan },
    { href: `${base}/calendario`, label: "Calendario" },
    { href: `${base}/aprobaciones`, label: "Aprobaciones", badge: b.approvals },
    { href: `${base}/reportes`, label: "Reportes" },
    { href: `${base}/novedades`, label: "Novedades" },
    ...(canManage ? [{ href: `${base}/conectar`, label: "Conectar cuentas", badge: b.connect }] : []),
  ];
}

/** Una persona del cliente: solo su espacio (y la barra inferior en el celular). */
async function ClientSidebar({ viewer }: { viewer: ClientViewer }) {
  const client = await getClient(viewer.clientId);
  const [badges, demo] = await Promise.all([spaceBadges(viewer.clientId, client?.platforms ?? [], false), demoLoaded()]);
  const base = `/app/c/${viewer.clientId}`;
  const isAdmin = viewer.role === "admin";
  const items = clientItems(
    base,
    { approvals: viewer.role === "viewer" ? 0 : badges.approvals, connect: badges.connect, plan: isAdmin ? badges.planToSign : 0 },
    isAdmin,
  );
  const bottom: NavItem[] = [
    { href: base, label: "Resumen", icon: "summary", exact: true },
    { href: `${base}/calendario`, label: "Calendario", icon: "calendar" },
    { href: `${base}/aprobaciones`, label: "Aprobar", icon: "approvals", badge: items.find((i) => i.href.endsWith("/aprobaciones"))?.badge },
    { href: `${base}/plan`, label: "Mi plan", icon: "contract", badge: isAdmin ? badges.planToSign : 0 },
  ];
  return (
    <Frame demo={demo} viewer={viewer}>
      <div className="hidden lg:block">
        <SideNav items={items} label="Secciones" />
      </div>
      <BottomNav items={bottom} />
    </Frame>
  );
}
