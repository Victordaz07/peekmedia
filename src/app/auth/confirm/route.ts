import { NextResponse, type NextRequest } from "next/server";
import { openSessionFromEmailLink } from "@/lib/data/identity";

// Solo se vuelve a rutas propias conocidas (nada de redirecciones abiertas).
const allowedNext = new Set(["/login/nueva-clave", "/app"]);

/** Regreso de los enlaces de Supabase Auth (recuperar contraseña). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = params.get("next") ?? "";
  const ok = await openSessionFromEmailLink({ code: params.get("code"), tokenHash: params.get("token_hash"), type: params.get("type") });

  const target = request.nextUrl.clone();
  target.search = "";
  if (ok) {
    target.pathname = allowedNext.has(next) ? next : "/app";
  } else {
    target.pathname = "/login";
    target.searchParams.set("enlace", "vencido");
  }
  return NextResponse.redirect(target);
}
