"use client";

import { BarChart3, CalendarDays, CheckCircle2, FileText, Globe, Home, Inbox, LayoutDashboard, PlugZap, Settings, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const icons = {
  home: Home,
  users: Users,
  inbox: Inbox,
  globe: Globe,
  summary: LayoutDashboard,
  contract: FileText,
  calendar: CalendarDays,
  approvals: CheckCircle2,
  reports: BarChart3,
  plug: PlugZap,
  settings: Settings,
} satisfies Record<string, LucideIcon>;

export type NavItem = { href: string; label: string; icon: keyof typeof icons; badge?: number; exact?: boolean };

function useActive() {
  const pathname = usePathname();
  return (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
}

function Badge({ n }: { n?: number }) {
  if (!n) return null;
  return <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-coral px-1.5 text-eyebrow font-bold text-ink">{n}</span>;
}

export function AppNav({ items, label = "Panel" }: { items: NavItem[]; label?: string }) {
  const isActive = useActive();
  return (
    <nav aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto lg:mx-0 lg:flex-col">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-item px-3.5 py-2.5 text-button font-semibold whitespace-nowrap transition-colors",
              active ? "bg-ink text-white" : "hover:bg-hairline",
            )}
          >
            <Icon aria-hidden className="size-[18px] shrink-0" />
            {item.label}
            <Badge n={item.badge} />
          </Link>
        );
      })}
    </nav>
  );
}

/** Barra inferior en móvil para los clientes (revisan desde el celular). */
export function BottomNav({ items }: { items: NavItem[] }) {
  const isActive = useActive();
  return (
    <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="flex">
        {items.map((item) => {
          const Icon = icons[item.icon];
          const active = isActive(item);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex flex-col items-center gap-1 px-2 py-2.5 text-eyebrow font-bold", active ? "text-ink" : "text-muted")}
              >
                <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", active && "bg-ink text-white")}>
                  <Icon aria-hidden className="size-[18px]" />
                </span>
                {item.label}
                {item.badge ? <span className="absolute top-1.5 right-[calc(50%-26px)] size-2.5 rounded-full bg-coral" aria-label={`${item.badge} pendiente`} /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
