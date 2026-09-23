import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/env";

function config() {
  const c = supabaseConfig();
  if (!c) throw new Error("Supabase no está configurado");
  return c;
}

/** Cliente con la sesión del usuario (cookies). RLS decide qué puede ver y escribir. */
export async function createSessionClient() {
  const { url, publishableKey } = config();
  const store = await cookies();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // En Server Components no se pueden escribir cookies; el proxy ya refresca la sesión.
        }
      },
    },
  });
}

/** Cliente anónimo sin cookies: solo lee lo público. Se puede usar dentro de "use cache". */
export function createPublicClient() {
  const { url, publishableKey } = config();
  return createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Cliente con la clave secreta: salta RLS. Solo para escrituras validadas en el servidor (leads del sitio). */
export function createAdminClient() {
  const { url, secretKey } = config();
  if (!secretKey) throw new Error("Falta SUPABASE_SECRET_KEY");
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
