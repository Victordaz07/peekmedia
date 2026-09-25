"use client";

import { Check, ExternalLink, Sparkles, TriangleAlert } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { Button, Textarea } from "@/components/ui";
import type { CopilotInput, Suggestion } from "@/lib/ai/copilot-schema";
import { cn } from "@/lib/cn";
import { networks as netTokens } from "@/lib/design/tokens";
import { dayTimeRD, fromRDInput } from "@/lib/format";
import { postTypeLabel, type PostType } from "@/lib/social/platforms";
import { reviewDraftAction } from "./actions";

export type CopilotPatch = Partial<{ caption: string; firstComment: string; altText: string; type: PostType; when: string }>;
type Key = "caption" | "tagsComment" | "tagsCaption" | "firstComment" | "altText" | "type" | "when";

/** Copiloto de Claude: revisa el borrador con el contexto de la cuenta y deja aplicar cada sugerencia por separado. */
export function CopilotPanel({
  clientId,
  ready,
  draft,
  onApply,
}: {
  clientId: string;
  ready: boolean;
  draft: Omit<CopilotInput, "brief">;
  onApply: (patch: CopilotPatch) => void;
}) {
  const [brief, setBrief] = useState("");
  const [result, setResult] = useState<Suggestion | null>(null);
  const [applied, setApplied] = useState<Set<Key>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const empty = !draft.caption.trim() && !brief.trim();

  function review() {
    setError(null);
    start(async () => {
      const res = await reviewDraftAction(clientId, { ...draft, brief });
      if (!res.ok) return setError(res.error);
      setResult(res.suggestion);
      setApplied(new Set());
    });
  }

  if (!result) {
    return (
      <section className="flex flex-col gap-4 rounded-md bg-surface p-5" aria-busy={pending}>
        <Header />
        <p className="text-label">
          Escribe tu idea o tu texto en el editor. Claude revisa lo que la cuenta ya publicó, qué le funcionó, su audiencia y las tendencias de esta semana, y te propone una versión
          lista. Tú decides qué aplicar.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-bold">¿Qué quieres lograr? (opcional)</span>
          <Textarea rows={2} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={1000} placeholder="Ej. llenar las reservas del viernes, tono más juvenil, anunciar el 2×1" />
        </label>
        <Button variant="dark" iconLeft={<Sparkles aria-hidden className="size-4" />} loading={pending} disabled={!ready || empty} onClick={review}>
          Revisar con Claude
        </Button>
        {pending && <p className="text-caption">Claude está leyendo la cuenta y buscando tendencias. Suele tardar entre 30 y 90 segundos.</p>}
        {!ready && <p className="rounded-item bg-hairline px-3 py-2 text-caption">Para activarlo falta la clave de Claude en Vercel (ANTHROPIC_API_KEY).</p>}
        {error && <ErrorLine>{error}</ErrorLine>}
      </section>
    );
  }

  const s = result;
  const tags = s.hashtags.join(" ");
  const toComment = draft.platforms.some((p) => p === "instagram" || p === "facebook");
  const mark = (...keys: Key[]) => setApplied((cur) => new Set([...cur, ...keys]));
  const apply = (key: Key, patch: CopilotPatch) => {
    onApply(patch);
    mark(key);
  };
  const withTags = (base: string) => [base.trim(), tags].filter(Boolean).join("\n\n");

  function applyAll() {
    const patch: CopilotPatch = { caption: toComment ? s.caption : withTags(s.caption) };
    if (toComment) patch.firstComment = withTags(s.primerComentario);
    if (s.textoAlternativo && draft.media.length) patch.altText = s.textoAlternativo;
    if (s.formato.tipo !== draft.type) patch.type = s.formato.tipo;
    if (s.horario.fechaHora) patch.when = s.horario.fechaHora;
    onApply(patch);
    mark("caption", "firstComment", "altText", "type", "when", toComment ? "tagsComment" : "tagsCaption");
  }

  return (
    <section className="flex flex-col gap-4 rounded-md bg-surface p-5">
      <Header />
      <div className="flex items-start gap-3 rounded-item bg-hairline/60 p-3.5">
        <span
          className={cn("grid size-11 shrink-0 place-items-center rounded-full font-display text-h3 font-bold", s.puntuacion >= 8 ? "bg-cyan" : s.puntuacion >= 5 ? "bg-sand" : "bg-coral-tint")}
          aria-label={`Tu borrador: ${s.puntuacion} de 10`}
        >
          {s.puntuacion}
        </span>
        <p className="text-label">{s.diagnostico}</p>
      </div>

      <Block title="Texto propuesto" action={<ApplyButton done={applied.has("caption")} onClick={() => apply("caption", { caption: s.caption })} />}>
        <p className="rounded-item bg-hairline/60 p-3.5 text-label whitespace-pre-wrap">{s.caption}</p>
        <div className="flex flex-wrap gap-1.5">
          {draft.platforms.map((p) => (
            <span key={p} className={cn("rounded-full px-2.5 py-1 text-eyebrow font-bold tabular-nums", s.caption.length > netTokens[p].charLimit ? "bg-coral-strong text-white" : "bg-sand")}>
              {netTokens[p].short} {s.caption.length}/{netTokens[p].charLimit}
            </span>
          ))}
        </div>
        {s.cambios.length > 0 && (
          <details className="text-caption">
            <summary className="cursor-pointer font-semibold">Qué cambió y por qué</summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
              {s.cambios.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </details>
        )}
      </Block>

      {s.hashtags.length > 0 && (
        <Block title="Hashtags">
          <p className="flex flex-wrap gap-1.5">
            {s.hashtags.map((h) => (
              <span key={h} className="rounded-full bg-sand px-2.5 py-1 text-caption font-semibold">
                {h}
              </span>
            ))}
          </p>
          <div className="flex flex-wrap gap-2">
            {toComment && (
              <ApplyButton done={applied.has("tagsComment")} label="Al primer comentario" onClick={() => apply("tagsComment", { firstComment: withTags(draft.firstComment) })} />
            )}
            <ApplyButton done={applied.has("tagsCaption")} label="Al final del texto" onClick={() => apply("tagsCaption", { caption: withTags(draft.caption) })} />
          </div>
        </Block>
      )}

      {s.primerComentario && toComment && (
        <Block title="Primer comentario" action={<ApplyButton done={applied.has("firstComment")} onClick={() => apply("firstComment", { firstComment: s.primerComentario })} />}>
          <p className="text-label whitespace-pre-wrap">{s.primerComentario}</p>
        </Block>
      )}

      {s.textoAlternativo && draft.media.length > 0 && (
        <Block title="Texto alternativo" action={<ApplyButton done={applied.has("altText")} onClick={() => apply("altText", { altText: s.textoAlternativo })} />}>
          <p className="text-label">{s.textoAlternativo}</p>
        </Block>
      )}

      <Block
        title={`Formato: ${postTypeLabel[s.formato.tipo]}`}
        action={s.formato.tipo !== draft.type ? <ApplyButton done={applied.has("type")} onClick={() => apply("type", { type: s.formato.tipo })} /> : <span className="text-caption text-muted">Ya lo tienes</span>}
      >
        <p className="text-label">{s.formato.razon}</p>
      </Block>

      <Block
        title={s.horario.fechaHora ? `Publicar: ${dayTimeRD(fromRDInput(s.horario.fechaHora)!)}` : "Horario"}
        action={s.horario.fechaHora ? <ApplyButton done={applied.has("when")} onClick={() => apply("when", { when: s.horario.fechaHora })} /> : undefined}
      >
        <p className="text-label">{s.horario.razon}</p>
      </Block>

      {s.porRed.length > 0 && (
        <Block title="Ajustes por red">
          <ul className="flex flex-col gap-2">
            {s.porRed.map((r) => (
              <li key={r.red} className="text-label">
                <strong>{netTokens[r.red].label}:</strong> {r.consejo}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {s.tendencias.length > 0 && (
        <Block title="Tendencias que tomó en cuenta">
          <ul className="flex flex-col gap-2.5">
            {s.tendencias.map((t) => (
              <li key={t.titulo} className="flex flex-col gap-0.5 text-label">
                <strong>{t.titulo}</strong>
                <span>{t.detalle}</span>
                {t.fuente && (
                  <a href={t.fuente} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-caption font-semibold underline underline-offset-2">
                    Ver fuente <ExternalLink aria-hidden className="size-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Block>
      )}

      <div className="flex flex-wrap gap-2.5 border-t border-hairline pt-4">
        <Button className="flex-1" onClick={applyAll}>
          Aplicar todo
        </Button>
        <Button variant="secondary" loading={pending} onClick={review}>
          Revisar otra vez
        </Button>
        <Button variant="ghost" onClick={() => setResult(null)}>
          Descartar
        </Button>
      </div>
      {error && <ErrorLine>{error}</ErrorLine>}
      <p className="text-caption text-muted">Claude puede equivocarse: revisa datos, precios y fechas antes de publicar.</p>
    </section>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-full bg-ink text-white">
        <Sparkles aria-hidden className="size-4" />
      </span>
      <div className="flex flex-col">
        <span className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">Copiloto</span>
        <h2 className="font-display text-h3 font-bold">Revisar con Claude</h2>
      </div>
    </div>
  );
}

function Block({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-caption font-bold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function ApplyButton({ done, label = "Aplicar", onClick }: { done: boolean; label?: string; onClick: () => void }) {
  return (
    <Button size="sm" variant={done ? "secondary" : "outline"} onClick={onClick} iconLeft={done ? <Check aria-hidden className="size-3.5" /> : undefined}>
      {done ? "Aplicado" : label}
    </Button>
  );
}

function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-label font-semibold text-coral-strong">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}
