import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { Avatar, Button, Skeleton } from "@/components/ui";
import { getTeamUser } from "@/lib/auth";

const roleLabel = { owner: "Administrador", cm: "Community manager" } as const;

export async function UserCard({ compact }: { compact?: boolean }) {
  const user = await getTeamUser();
  if (!user) return null;
  if (compact) {
    return (
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm" iconLeft={<LogOut className="size-4" />}>
          Salir
        </Button>
      </form>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-md bg-surface p-4 ring-1 ring-hairline">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} size="sm" color="cyan" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-label font-bold">{user.name}</p>
          <p className="truncate text-caption text-muted">{roleLabel[user.role]}</p>
        </div>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="secondary" size="sm" className="w-full" iconLeft={<LogOut className="size-4" />}>
          Salir
        </Button>
      </form>
    </div>
  );
}

export function UserCardSkeleton() {
  return <Skeleton className="h-[108px] w-full rounded-md" />;
}
