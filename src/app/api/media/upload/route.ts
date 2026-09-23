import { saveLocalUpload } from "@/lib/data/media";
import { isLocalMode } from "@/lib/env";

/** Solo modo local: recibe el archivo subido con un token firmado. En producción se sube directo a Supabase Storage. */
export async function PUT(request: Request) {
  if (!isLocalMode()) return new Response("No disponible", { status: 404 });
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    await saveLocalUpload(token, await request.arrayBuffer());
    return new Response(null, { status: 204 });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Error", { status: 400 });
  }
}
