"use client";

import { ImagePlus, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { PostPreview } from "@/components/posts/post-preview";
import { Button, Field, Input, NetworkChip, Spinner, Textarea, useToast } from "@/components/ui";
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
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_440px]">
      <section className="flex flex-col gap-4 rounded-md bg-surface p-6">
        {post && <h2 className="font-display text-h3 font-bold">Editar publicación · v{post.version}</h2>}
        {post?.feedback && (
          <p className="rounded-item bg-coral-tint p-3 text-label">
            <strong>El cliente pidió:</strong> {post.feedback}
          </p>
        )}
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-caption font-bold">Publicar en</legend>
          <div className="flex flex-wrap gap-2">
            {networks.map((n) => (
              <NetworkChip key={n} network={n} selected={platforms.includes(n)} onClick={() => toggle(n)} className="px-4 py-2 text-button" />
            ))}
          </div>
          {platforms.map((p) => composerNote[p] && <Note key={p}>{composerNote[p]}</Note>)}
          {notConnected.length > 0 && (
            <Note tone="alert">
              {notConnected.map((p) => netTokens[p].label).join(", ")} {notConnected.length === 1 ? "no está conectada" : "no están conectadas"}: fallará al publicar. Conéctala en “Conectar cuentas”.
            </Note>
          )}
          {manual.length > 0 && <Note>{manual.map((p) => netTokens[p].label).join(", ")}: acceso como socio. Quedará marcada “Publicar a mano”.</Note>}
        </fieldset>

        <div role="radiogroup" aria-label="Formato" className="flex flex-col gap-2.5">
          <span className="text-caption font-bold">Formato</span>
          <div className="flex flex-wrap gap-2">
            {postTypes.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={cn("rounded-full px-3.5 py-2 text-label font-semibold transition-colors", type === t ? "bg-cyan text-ink" : "bg-sand hover:bg-[#b0b0b0]")}
              >
                {postTypeLabel[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-caption font-bold">Contenido</span>
          {media.length + uploading === 0 ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3.5 rounded-item border-[1.5px] border-dashed border-line p-5 text-left transition-colors hover:border-ink/40"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sand text-[20px]">+</span>
              <span className="flex flex-col gap-0.5">
                <span className="text-button font-bold">Subir imagen o video</span>
                <span className="text-caption">JPG, PNG o WebP hasta 8 MB · MP4 o MOV hasta 100 MB · máximo 10.</span>
              </span>
            </button>
          ) : (
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
          )}
          <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => upload(e.target.files)} aria-label="Subir imágenes o videos" />
          <Textarea rows={7} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Escribe el texto de la publicación…" aria-label="Texto de la publicación" />
          <div className="flex flex-wrap gap-1.5" aria-live="polite">
            {platforms.map((p) => {
              const max = netTokens[p].charLimit;
              return (
                <span key={p} className={cn("rounded-full px-2.5 py-1 text-eyebrow font-bold tabular-nums", caption.length > max ? "bg-coral-strong text-white" : "bg-sand")}>
                  {netTokens[p].short} {caption.length.toLocaleString("en-US")}/{max.toLocaleString("en-US")}
                </span>
              );
            })}
          </div>
          <details className="group rounded-item bg-hairline/60 px-4 py-3">
            <summary className="cursor-pointer text-label font-semibold">Más opciones: primer comentario y texto alternativo</summary>
            <div className="mt-3 flex flex-col gap-3">
              <Field label="Primer comentario" hint="Ideal para hashtags. Solo en Instagram y Facebook.">
                <Textarea rows={2} value={firstComment} onChange={(e) => setFirstComment(e.target.value)} />
              </Field>
              <Field label="Texto alternativo" hint="Describe la imagen para personas que usan lector de pantalla.">
                <Input value={altText} onChange={(e) => setAltText(e.target.value)} />
              </Field>
            </div>
          </details>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <Field label="Fecha y hora" className="w-full max-w-[300px]">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          {best && <p className="max-w-[260px] pb-2 text-caption">Mejor momento según tu audiencia: {best}.</p>}
        </div>
        {error && (
          <p role="alert" className="flex items-start gap-2 text-label font-semibold text-coral-strong">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" loading={busy === "draft"} disabled={pending} onClick={() => save("draft")}>
            Guardar borrador
          </Button>
          <Button variant="outline" loading={busy === "approval"} disabled={pending} onClick={() => save("approval")}>
            Enviar a aprobación
          </Button>
          <Button loading={busy === "schedule"} disabled={pending || !!scheduleProblem} title={scheduleProblem ?? undefined} onClick={() => save("schedule")}>
            Programar
          </Button>
          <Button variant="ghost" loading={busy === "now"} disabled={pending} onClick={() => save("now")}>
            Publicar ahora
          </Button>
        </div>
        <p className="text-caption text-muted">“Enviar a aprobación” le avisa al cliente por correo; cuando apruebe, se programa sola para esta fecha.</p>
      </section>

      <div className="flex flex-col gap-2.5 xl:sticky xl:top-6">
        <span className="text-caption font-semibold">Vista previa</span>
        <PostPreview handle={handle} type={type} caption={caption} media={media} />
      </div>
    </div>
  );
}

function Note({ children, tone }: { children: React.ReactNode; tone?: "alert" }) {
  return <p className={cn("rounded-item px-3 py-2 text-caption", tone === "alert" ? "bg-coral-tint" : "bg-hairline")}>{children}</p>;
}
