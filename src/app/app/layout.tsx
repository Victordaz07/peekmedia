import type { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar } from "@/components/app/sidebar";
import { SidebarSkeleton } from "@/components/app/user-card";
import { Logo } from "@/components/ui";
import { isLocalMode } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel Peek" },
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="flex min-h-dvh flex-col bg-sand lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-5 border-b border-hairline bg-texture-blanco p-4 lg:sticky lg:top-0 lg:h-dvh lg:w-[260px] lg:border-r lg:border-b-0 lg:p-6">
        <Logo className="h-9 self-start" />
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-6 px-[clamp(16px,3vw,40px)] pt-7 pb-28 lg:pb-24">
        {isLocalMode() && (
          <p className="rounded-item bg-coral-tint px-4 py-3 text-label">
            <strong>Modo local:</strong> no hay Supabase configurado. Los datos se guardan en <code>.data/</code> solo en esta
            computadora.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
