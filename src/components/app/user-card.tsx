import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { Avatar, Button, Skeleton } from "@/components/ui";
import type { Viewer } from "@/lib/auth";
import { clientRoleLabel } from "@/lib/clients/schema";

const teamRoleLabel = { owner: "Administrador · Peek", cm: "Community manager" } as const;

export function UserCard({ viewer }: { viewer: Viewer }) {
  const role = viewer.kind === "team" ? teamRoleLabel[viewer.role] : clientRoleLabel[viewer.role];
  return (
    <div className="flex items-center gap-3 rounded-md bg-surface p-3 ring-1 ring-hairline lg:flex-col lg:items-stretch lg:p-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={viewer.name || viewer.email} size="sm" color={viewer.kind === "team" ? "cyan" : "ocean"} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-label font-bold">{viewer.name || viewer.email}</p>
          <p className="truncate text-caption text-muted">{role}</p>
        </div>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="secondary" size="sm" className="lg:w-full" iconLeft={<LogOut className="size-4" />}>
          Salir
        </Button>
      </form>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-10 w-full rounded-item" />
      ))}
    </div>
  );
}
