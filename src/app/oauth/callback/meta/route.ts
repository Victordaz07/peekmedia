import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { savePending } from "@/lib/data/social";
import { exchangeMetaCode } from "@/lib/integrations/meta";
import { connectMetaPage } from "@/lib/social/connect";
import { readOAuthState } from "@/lib/social/oauth-state";

/** Meta devuelve aquí el code. Se cambia por tokens (que se guardan cifrados) y se conectan la página y su Instagram. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const back = (clientId: string, query: string) => NextResponse.redirect(new URL(`/app/c/${clientId}/conectar?${query}`, request.url));

  const state = await readOAuthState(q.get("state") ?? "");
  if (!state) return NextResponse.redirect(new URL("/app?error=oauth", request.url));
  const viewer = await getViewer();
  if (!viewer || viewer.id !== state.userId) return NextResponse.redirect(new URL("/login", request.url));
  if (q.get("error")) return back(state.clientId, "error=cancelado");

  const client = await getClient(state.clientId);
  if (!client) return NextResponse.redirect(new URL("/app", request.url));
  try {
    const { pages } = await exchangeMetaCode(q.get("code") ?? "");
    if (!pages.length) return back(client.id, "error=sin-paginas");
    if (pages.length === 1) {
      await connectMetaPage(client, pages[0]);
      return back(client.id, "conectado=meta");
    }
    const pending = await savePending(client.id, "meta", pages);
    return back(client.id, `elegir=${pending}`);
  } catch (e) {
    console.error("[oauth meta]", e);
    return back(client.id, "error=meta");
  }
}
