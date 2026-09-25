import { cronAllowed } from "@/lib/cron";
import { duePosts } from "@/lib/data/posts";
import { publishPost } from "@/lib/social/engine";

export const maxDuration = 300;

/** Publica lo programado cuya hora ya llegó. Cada 10 minutos: Vercel Cron en Pro o un cron externo con el mismo secreto en Hobby. */
export async function GET(request: Request) {
  if (!cronAllowed(request)) return new Response("No autorizado", { status: 401 });
  // Por tandas hasta vaciar la cola o acercarse al límite de tiempo de la función.
  const started = Date.now();
  const seen = new Set<string>();
  const results = [];
  while (Date.now() - started < 240_000) {
    const due = (await duePosts()).filter((p) => !seen.has(p.id));
    if (!due.length) break;
    for (const post of due) {
      if (Date.now() - started >= 240_000) break;
      seen.add(post.id);
      results.push({ id: post.id, status: await publishPost(post) });
    }
  }
  return Response.json({ published: results });
}
