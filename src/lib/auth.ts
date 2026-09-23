import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ClientRole } from "@/lib/clients/schema";
import { clientUserByUserId } from "@/lib/data/clients";
import { currentSessionUser, teamRoleOf } from "@/lib/data/identity";
import { isLocalMode, localModeAllowed } from "@/lib/env";

export type TeamRole = "owner" | "cm";

export type TeamUser = { kind: "team"; id: string; name: string; email: string; role: TeamRole };
export type ClientViewer = {
  kind: "client";
  id: string;
  name: string;
  email: string;
  role: ClientRole;
  clientId: string;
  clientUserId: string;
};
export type Viewer = TeamUser | ClientViewer;

/** Quién está usando el panel: alguien del equipo, una persona de un cliente, o nadie. Lee cookies. */
export async function getViewer(): Promise<Viewer | null> {
  await connection();
  if (isLocalMode() && !localModeAllowed()) return null;
  const user = await currentSessionUser();
  if (!user) return null;

  const teamRole = await teamRoleOf(user.id);
  if (teamRole) return { kind: "team", id: user.id, name: user.name || user.email.split("@")[0], email: user.email, role: teamRole };

  const access = await clientUserByUserId(user.id);
  if (!access || !access.active) return null;
  return {
    kind: "client",
    id: user.id,
    name: access.name,
    email: access.email,
    role: access.role,
    clientId: access.clientId,
    clientUserId: access.id,
  };
}

/** Inicio de cada persona: el equipo va a su panel; un cliente, a su espacio. */
export function homeFor(viewer: Viewer) {
  return viewer.kind === "team" ? "/app" : `/app/c/${viewer.clientId}`;
}

/** Páginas y acciones del equipo. Un cliente que llegue aquí vuelve a su espacio. */
export async function requireTeam(): Promise<TeamUser> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.kind !== "team") redirect(homeFor(viewer));
  return viewer;
}

/**
 * Espacio de un cliente: el equipo entra a todos; una persona del cliente, solo al suyo.
 * El servidor lo impone aquí y la base de datos otra vez con RLS.
 */
export async function requireClientAccess(clientId: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.kind === "client" && viewer.clientId !== clientId) redirect(homeFor(viewer));
  return viewer;
}

/** ¿Puede firmar contratos y pedir cambios de plan? Solo los Administradores del cliente. */
export function isClientAdmin(viewer: Viewer): viewer is ClientViewer {
  return viewer.kind === "client" && viewer.role === "admin";
}
