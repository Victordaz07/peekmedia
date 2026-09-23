import { cronAllowed } from "@/lib/cron";
import { duePosts } from "@/lib/data/posts";
import { publishPost } from "@/lib/social/engine";

export const maxDuration = 300;

/** Publica lo programado cuya hora ya llegó. Cada 10 minutos: Vercel Cron en Pro o un cron externo con el mismo secreto en Hobby. */
export async function GET(request: Request) {
  if (!cronAllowed(request)) return new Response("No autorizado", { status: 401 });
  const due = await duePosts();
  const results = [];
  for (const post of due) results.push({ id: post.id, status: await publishPost(post) });
  return Response.json({ published: results });
}
