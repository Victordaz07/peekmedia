import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { integrations } from "@/lib/integrations/config";
import { metaAuthUrl } from "@/lib/integrations/meta";
import { createOAuthState } from "@/lib/social/oauth-state";

/** Inicia la conexión con Meta (Instagram + Facebook). Solo el equipo o un Administrador de ese cliente. */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client") ?? "";
  const viewer = await getViewer();
  const allowed = viewer && (viewer.kind === "team" || (viewer.clientId === clientId && viewer.role === "admin"));
  if (!allowed || !clientId) return NextResponse.redirect(new URL("/login", request.url));
  if (!integrations().meta) return NextResponse.redirect(new URL(`/app/c/${clientId}/conectar?error=meta-no-configurado`, request.url));
  return NextResponse.redirect(metaAuthUrl(await createOAuthState(clientId, viewer.id)));
}
