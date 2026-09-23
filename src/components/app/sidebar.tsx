import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { listClients } from "@/lib/data/clients";
import { listContracts, listPlanRequests } from "@/lib/data/contracts";
import { Avatar } from "@/components/ui";
import { AppNav, BottomNav, type NavItem } from "./app-nav";
import { UserCard } from "./user-card";

/** Navegación según quién entra. Lee la sesión: va dentro de <Suspense>. */
export async function Sidebar() {
  const viewer = await getViewer();
  if (!viewer) return null;

  if (viewer.kind === "client") {
    const contracts = await listContracts(viewer.clientId);
    const toSign = contracts[0]?.status === "sent" && viewer.role === "admin" ? 1 : 0;
    const base = `/app/c/${viewer.clientId}`;
    const items: NavItem[] = [
      { href: base, label: "Resumen", icon: "summary", exact: true },
      { href: `${base}/plan`, label: "Mi plan", icon: "contract", badge: toSign },
    ];
    return (
      <>
        <div className="hidden lg:block">
          <AppNav items={items} />
        </div>
        <BottomNav items={items} />
        <div className="lg:mt-auto">
          <UserCard viewer={viewer} />
        </div>
      </>
    );
  }

  const [clients, requests] = await Promise.all([listClients(), listPlanRequests()]);
  const pending = requests.filter((r) => r.status === "pending").length;
  const items: NavItem[] = [
    { href: "/app", label: "Inicio", icon: "home", exact: true, badge: pending },
    { href: "/app/clientes", label: "Clientes", icon: "users" },
    { href: "/app/prospectos", label: "Prospectos", icon: "inbox" },
    { href: "/app/sitio", label: "Sitio web", icon: "globe" },
  ];
  const spaces = clients.filter((c) => c.status !== "ended");
  return (
    <>
      <AppNav items={items} />
      {spaces.length > 0 && (
        <div className="hidden flex-col gap-1 lg:flex">
          <p className="px-3.5 pt-2 pb-1 text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">Espacios</p>
          <nav aria-label="Espacios de clientes" className="flex max-h-[40dvh] flex-col gap-0.5 overflow-y-auto">
            {spaces.map((c) => (
              <Link key={c.id} href={`/app/c/${c.id}`} className="flex items-center gap-2.5 rounded-item px-3 py-2 text-label font-semibold hover:bg-hairline">
                <Avatar name={c.name} color={c.avatarColor} size="xs" />
                <span className="truncate">{c.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
      <div className="lg:mt-auto">
        <UserCard viewer={viewer} />
      </div>
    </>
  );
}
