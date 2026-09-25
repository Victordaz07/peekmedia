"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { AvatarColor } from "@/lib/design/tokens";

export type SideItem = { href: string; label: string; badge?: number; exact?: boolean };

function useIsActive() {
  const pathname = usePathname();
  return (item: SideItem) => {
    const path = item.href.split("?")[0];
    return item.exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
  };
}

/** Menú vertical del prototipo: solo texto, el activo en ink y los pendientes con un contador coral. */
export function SideNav({ items, label }: { items: SideItem[]; label: string }) {
  const isActive = useIsActive();
  return (
    <nav aria-label={label} className="-mx-1 flex shrink-0 gap-1 overflow-x-auto lg:mx-0 lg:flex-col lg:overflow-visible">
      {items.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center justify-between gap-3 rounded-sm px-3.5 py-[11px] text-button font-semibold whitespace-nowrap transition-colors",
              active ? "bg-ink text-white" : "hover:bg-hairline",
            )}
          >
            {item.label}
            {item.badge ? (
              <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-coral px-1.5 text-eyebrow font-bold text-ink">{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Menú de un espacio: el equipo puede verlo como lo ve el cliente (?vista=cliente). */
export function SpaceNav({ team, client }: { team: SideItem[] | null; client: SideItem[] }) {
  const preview = useSearchParams().get("vista") === "cliente";
  if (!team) return <SideNav items={client} label="Secciones" />;
  if (!preview) return <SideNav items={team} label="Secciones" />;
  return <SideNav items={client.map((i) => ({ ...i, href: i.href.startsWith("/app/c/") ? `${i.href}?vista=cliente` : i.href }))} label="Secciones" />;
}

export type ClientCard = { id: string; name: string; industry: string; color: AvatarColor };

/** Tarjetas "Cliente": cambiar de cliente conserva la sección en la que estás. */
export function ClientCards({ clients }: { clients: ClientCard[] }) {
  const pathname = usePathname();
  const q = useSearchParams().get("vista") === "cliente" ? "?vista=cliente" : "";
  const m = /^\/app\/c\/([^/]+)(\/.*)?$/.exec(pathname);
  const current = m?.[1];
  const section = m?.[2] ?? "";
  return (
    <div className="flex flex-col gap-2">
      <p className="text-eyebrow font-bold tracking-[0.12em] uppercase">Cliente</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {clients.map((c) => {
          const active = c.id === current;
          return (
            <Link
              key={c.id}
              href={`/app/c/${c.id}${section}${q}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-[200px] items-center gap-3 rounded-item border-[1.5px] p-2.5 text-left transition-colors lg:min-w-0",
                active ? "border-ink bg-sand" : "border-hairline bg-surface hover:border-ink/30",
              )}
            >
              <Avatar name={c.name} color={c.color} size="sm" />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-label font-bold">{c.name}</span>
                <span className="truncate text-eyebrow">{c.industry}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** "Ver como": el equipo previsualiza el espacio tal como lo ve el cliente. */
export function ViewAs() {
  const pathname = usePathname();
  const router = useRouter();
  const preview = useSearchParams().get("vista") === "cliente";
  if (!pathname.startsWith("/app/c/")) return null;
  const options = [
    { value: false, label: "Community manager" },
    { value: true, label: "Cliente" },
  ];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-eyebrow font-bold tracking-[0.12em] uppercase">Ver como</p>
      <div role="group" aria-label="Ver como" className="flex rounded-full bg-sand p-1">
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            aria-pressed={preview === o.value}
            onClick={() => router.replace(`${pathname}${o.value ? "?vista=cliente" : ""}`)}
            className={cn(
              "flex-1 rounded-full px-2 py-[9px] text-label leading-tight font-semibold transition-colors",
              preview === o.value ? "bg-ink text-white" : "hover:bg-white/40",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
