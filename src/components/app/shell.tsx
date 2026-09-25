import type { ReactNode } from "react";
import { Suspense } from "react";
import { Logo } from "@/components/ui";
import { isLocalMode } from "@/lib/env";
import { SidebarSkeleton } from "./user-card";

/** Marco del panel como el prototipo: menú lateral blanco con textura y contenido sobre la textura gris. */
export function AppShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-texture-gris lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-hairline bg-texture-blanco p-4 lg:min-h-dvh lg:w-[264px] lg:border-r lg:border-b-0 lg:p-5">
        <Suspense
          fallback={
            <>
              <Logo className="h-9 self-start" />
              <SidebarSkeleton />
            </>
          }
        >
          {sidebar}
        </Suspense>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-6 px-[clamp(16px,3vw,40px)] pt-7 pb-28 lg:pb-22">
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
