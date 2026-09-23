import { readLocalMedia } from "@/lib/data/media";
import { isLocalMode } from "@/lib/env";

/** Solo modo local: sirve los archivos subidos. En producción los sirve Supabase Storage. */
export async function GET(_request: Request, { params }: RouteContext<"/api/media/[...path]">) {
  if (!isLocalMode()) return new Response("No encontrado", { status: 404 });
  const file = await readLocalMedia((await params).path);
  if (!file) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(file.body), { headers: { "Content-Type": file.mime, "Cache-Control": "private, max-age=3600" } });
}
