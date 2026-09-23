import { cronAllowed } from "@/lib/cron";
import { syncAllClients } from "@/lib/social/engine";

export const maxDuration = 300;

/** Métricas del día, audiencia, métricas por post, comentarios y reseñas. Vercel Cron lo llama una vez al día. */
export async function GET(request: Request) {
  if (!cronAllowed(request)) return new Response("No autorizado", { status: 401 });
  return Response.json({ clients: await syncAllClients() });
}
