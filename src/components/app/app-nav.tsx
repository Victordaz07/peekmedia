"use client";

import { Globe, Inbox, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app/prospectos", label: "Prospectos", icon: Inbox },
  { href: "/app/sitio", label: "Sitio web", icon: Globe },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel" className="-mx-1 flex gap-1 overflow-x-auto lg:mx-0 lg:flex-col">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-item px-3.5 py-2.5 text-button font-semibold whitespace-nowrap transition-colors",
              active ? "bg-ink text-white" : "hover:bg-hairline",
            )}
          >
            <Icon aria-hidden className="size-[18px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
