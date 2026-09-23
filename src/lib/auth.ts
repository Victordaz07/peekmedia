import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isLocalMode, localModeAllowed } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";

export type TeamRole = "owner" | "cm";

export type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  /** true en modo local (sin Supabase): no hay login real. */
  local: boolean;
};

const LOCAL_USER: TeamUser = { id: "local", name: "Equipo Peek", email: "modo local", role: "owner", local: true };

/** Usuario del equipo con sesión activa, o null. Lee cookies: úsalo dentro de un <Suspense>. */
export async function getTeamUser(): Promise<TeamUser | null> {
  // Siempre por petición: sin esto, en modo local la página se prerenderizaría al compilar.
  await connection();
  if (isLocalMode()) return localModeAllowed() ? LOCAL_USER : null;

  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (!membership) return null;

  const meta = (claims.user_metadata ?? {}) as { name?: string };
  const email = typeof claims.email === "string" ? claims.email : "";
  return { id: claims.sub, name: meta.name || email.split("@")[0] || "Equipo", email, role: membership.role as TeamRole, local: false };
}

/** Para páginas y acciones del equipo: sin sesión válida, manda al login. */
export async function requireTeam(): Promise<TeamUser> {
  const user = await getTeamUser();
  if (!user) redirect("/login");
  return user;
}
