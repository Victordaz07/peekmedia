"use client";

import { ImagePlus, Lightbulb, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { PostPreview } from "@/components/posts/post-preview";
import { Button, Card, CardTitle, Field, Input, NetworkChip, Segmented, Spinner, Textarea, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { networks as netTokens, type Network } from "@/lib/design/tokens";
import { fromRDInput, toRDInput, ymdRD } from "@/lib/format";
import { composerNote, postTypeLabel, postTypes, type PostType } from "@/lib/social/platforms";
import type { ConnectionMode, MediaItem, Post, PostInput } from "@/lib/social/schema";
import { validatePost, type Intent } from "@/lib/social/validate";
import { createUploadAction, savePostAction } from "../post-actions";

const ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";

export function Composer({
  clientId,
  handle,
  networks,
  connected,
  best,
  post,
  date,
}: {
  clientId: string;
  handle: string;
  networks: Network[];
  connected: Partial<Record<Network, ConnectionMode | null>>;
  best: string | null;
  post: Post | null;
  date: string | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<PostType>(post?.type ?? "post");
  const [platforms, setPlatforms] = useState<Network[]>(post?.platforms ?? networks.filter((n) => n === "instagram" || n === "facebook"));
  const [caption, setCaption] = useState(post?.caption ?? "");
  const [firstComment, setFirstComment] = useState(post?.firstComment ?? "");
  const [altText, setAltText] = useState(post?.altText ?? "");
  const [media, setMedia] = useState<MediaItem[]>(post?.media ?? []);
  const [when, setWhen] = useState(post?.scheduledAt ? toRDInput(post.scheduledAt) : date ? `${date}T10:00` : "");
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<Intent | null>(null);

  const input: PostInput = { type, caption, firstComment, altText, media, platforms, scheduledAt: fromRDInput(when) };
  const limit = platforms.length ? Math.min(...platforms.map((p) => netTokens[p].charLimit)) : 2200;
  const limitNet = platforms.find((p) => netTokens[p].charLimit === limit);
  const scheduleProblem = validatePost(input, "schedule");
  const notConnected = platforms.filter((p) => !connected[p]);
  const manual = platforms.filter((p) => connected[p] === "manual");

  function toggle(n: Network) {
    setPlatforms((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files].slice(0, 10 - media.length);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const res = await createUploadAction(clientId, file.type, file.size);
        if (!res.ok) throw new Error(res.error);
        const put = await fetch(res.ticket.uploadUrl, { method: "PUT", headers: res.ticket.headers, body: file });
        if (!put.ok) throw new Error("No se pudo subir el archivo. Intenta de nuevo.");
        setMedia((m) => [...m, { id: res.ticket.id, url: res.ticket.publicUrl, mime: file.type, name: file.name }]);
      } catch (e) {
        toast({ title: `${file.name}: ${e instanceof Error ? e.message : "error al subir"}`, tone: "error" });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function save(intent: Intent) {
    const problem = validatePost(input, intent);
    setError(problem);
    if (problem) return;
    setBusy(intent);
    start(async () => {
      const res = await savePostAction(clientId, post?.id ?? null, input, intent);
      setBusy(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const msg: Record<Intent, string> = {
        draft: "Borrador guardado",
        approval: "Enviada al cliente para aprobación",
        schedule: "Programada. Se publica sola a la hora elegida.",
        now: res.status === "published" ? "¡Publicada!" : res.status === "failed" ? "Falló en alguna red. Revisa el detalle." : "Enviada a las redes",
      };
      toast({ title: msg[intent], tone: res.status === "failed" ? "error" : "success" });
      const at = input.scheduledAt ?? new Date().toISOString();
      router.push(`/app/c/${clientId}/calendario?mes=${ymdRD(at).slice(0, 7)}&post=${res.id}`);
    });
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-5">
        <Card className="gap-4">
          <CardTitle>{post ? `Editar publicación · v${post.version}` : "Crear publicación"}</CardTitle>
          {post?.feedback && (
            <p className="rounded-item bg-coral-tint p-3 text-label">
              <strong>El cliente pidió:</strong> {post.feedback}
            </p>
          )}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-label font-semibold">Redes</legend>
            <div className="flex flex-wrap gap-2">
              {networks.map((n) => (
                <NetworkChip key={n} network={n} selected={platforms.includes(n)} onClick={() => toggle(n)} />
              ))}
            </div>
            {platforms.map((p) => composerNote[p] && <Note key={p}>{composerNote[p]}</Note>)}
            {notConnected.length > 0 && (
              <Note tone="alert">
                {notConnected.map((p) => netTokens[p].label).join(", ")} {notConnected.length === 1 ? "no está conectada" : "no están conectadas"}: fallará al publicar. Conéctala en la pestaña Conectar.
              </Note>
            )}
            {manual.length > 0 && <Note>{manual.map((p) => netTokens[p].label).join(", ")}: acceso como socio. Quedará marcada “Publicar a mano”.</Note>}
          </fieldset>

          <div className="flex flex-col gap-2">
            <span className="text-label font-semibold">Formato</span>
            <Segmented label="Formato" value={type} onChange={setType} options={postTypes.map((t) => ({ value: t, label: postTypeLabel[t] }))} className="max-w-full overflow-x-auto" />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-label font-semibold">Archivos</span>
            <div className="flex flex-wrap gap-2">
              {media.map((m, i) => (
                <div key={m.id} className="relative size-24 overflow-hidden rounded-sm bg-ocean">
                  {m.mime.startsWith("video/") ? (
                    <video src={m.url} muted className="size-full object-cover" aria-label={m.name} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- archivo recién subido
                    <img src={m.url} alt={m.name} className="size-full object-cover" />
                  )}
                  <span className="absolute bottom-1 left-1 rounded-full bg-ink/70 px-1.5 text-eyebrow font-bold text-white">{i + 1}</span>
                  <button
                    type="button"
                    aria-label={`Quitar ${m.name}`}
                    onClick={() => setMedia((cur) => cur.filter((x) => x.id !== m.id))}
                    className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-surface"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              {Array.from({ length: uploading }, (_, i) => (
                <div key={`u${i}`} className="grid size-24 place-items-center rounded-sm bg-hairline">
                  <Spinner />
                </div>
              ))}
              {media.length + uploading < 10 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex size-24 flex-col items-center justify-center gap-1 rounded-sm border-[1.5px] border-dashed border-line text-caption font-semibold hover:border-ink"
                >
                  <ImagePlus aria-hidden className="size-5" />
                  Subir
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => upload(e.target.files)} aria-label="Subir imágenes o videos" />
            <p className="text-caption text-muted">JPG, PNG o WebP hasta 8 MB · MP4 o MOV hasta 100 MB · máximo 10.</p>
          </div>

          <Field
            label="Texto"
            counter={
              <span className={cn(caption.length > limit && "font-bold text-coral-strong")}>
                {caption.length.toLocaleString("en-US")} / {limit.toLocaleString("en-US")}
                {limitNet && platforms.length > 1 ? ` (${netTokens[limitNet].label})` : ""}
              </span>
            }
          >
            <Textarea rows={7} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Escribe el texto de la publicación…" />
          </Field>
          <Field label="Primer comentario" hint="Ideal para hashtags. Solo en Instagram y Facebook.">
            <Textarea rows={2} value={firstComment} onChange={(e) => setFirstComment(e.target.value)} />
          </Field>
          <Field label="Texto alternativo" hint="Describe la imagen para personas que usan lector de pantalla.">
            <Input value={altText} onChange={(e) => setAltText(e.target.value)} />
          </Field>
        </Card>

        <Card className="gap-4">
          <CardTitle>Cuándo</CardTitle>
          <Field label="Fecha y hora (hora de RD)">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="max-w-xs" />
          </Field>
          {best && (
            <p className="flex items-start gap-2 text-label">
              <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                Según lo publicado, a esta audiencia le va mejor el <strong>{best}</strong>
              </span>
            </p>
          )}
          {error && (
            <p role="alert" className="flex items-start gap-2 text-label font-semibold text-coral-strong">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button loading={busy === "approval"} disabled={pending} onClick={() => save("approval")}>
              Enviar a aprobación
            </Button>
            <Button variant="dark" loading={busy === "schedule"} disabled={pending || !!scheduleProblem} title={scheduleProblem ?? undefined} onClick={() => save("schedule")}>
              Programar
            </Button>
            <Button variant="outline" loading={busy === "now"} disabled={pending} onClick={() => save("now")}>
              Publicar ahora
            </Button>
            <Button variant="ghost" loading={busy === "draft"} disabled={pending} onClick={() => save("draft")}>
              Guardar borrador
            </Button>
          </div>
          <p className="text-caption text-muted">
            “Enviar a aprobación” le avisa al cliente por correo; cuando apruebe, se programa sola para esta fecha.
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:sticky lg:top-6">
        <span className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">Vista previa</span>
        <PostPreview handle={handle} type={type} caption={caption} media={media} />
      </div>
    </div>
  );
}

function Note({ children, tone }: { children: React.ReactNode; tone?: "alert" }) {
  return <p className={cn("rounded-item px-3 py-2 text-caption", tone === "alert" ? "bg-coral-tint" : "bg-hairline")}>{children}</p>;
}
