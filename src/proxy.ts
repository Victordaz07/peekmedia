import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase en cada visita a /app y /login y reescribe las cookies.
 * La autorización real se hace en el servidor (requireTeam) y en la base de datos (RLS).
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (data?.claims || !request.nextUrl.pathname.startsWith("/app")) return response;

  // Sin sesión en /app → login (chequeo optimista; requireTeam verifica la membresía).
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  const redirect = NextResponse.redirect(login);
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
