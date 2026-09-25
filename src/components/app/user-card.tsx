import { signOut } from "@/app/login/actions";
import { Skeleton } from "@/components/ui";
import type { Viewer } from "@/lib/auth";
import { clientRoleLabel } from "@/lib/clients/schema";

const teamRoleLabel = { owner: "Administrador · Peek", cm: "Community manager · Peek" } as const;

/** Quién está conectado y "Salir", como la tarjeta del prototipo. */
export function UserCard({ viewer }: { viewer: Viewer }) {
  const role = viewer.kind === "team" ? teamRoleLabel[viewer.role] : clientRoleLabel[viewer.role];
  return (
    <div className="flex items-center justify-between gap-2 rounded-item border-[1.5px] border-hairline bg-surface px-3 py-2.5">
      <div className="flex min-w-0 flex-col leading-[1.3]">
        <span className="truncate text-caption font-bold">{viewer.name || viewer.email}</span>
        <span className="truncate text-eyebrow">{role}</span>
      </div>
      <form action={signOut}>
        <button type="submit" className="rounded-full bg-sand px-2.5 py-[7px] text-eyebrow font-semibold whitespace-nowrap transition-colors hover:bg-[#b0b0b0]">
          Salir
        </button>
      </form>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-11 w-full rounded-sm" />
      ))}
    </div>
  );
}
