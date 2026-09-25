"use client";

import { Sparkles, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { platShort } from "@/components/posts/overview";
import { Button, Textarea, useToast } from "@/components/ui";
import type { MonthPlan } from "@/lib/ai/schemas";
import { cn } from "@/lib/cn";
import { dayTimeRD, fromRDInput, monthLabel } from "@/lib/format";
import { postTypeLabel } from "@/lib/social/platforms";
import { createDraftsAction, planMonthAction } from "./actions";

/** "Plan del mes con Claude": propone ideas para el mes que se ve en el calendario y las guarda como borradores. */
export function MonthPlanner({ clientId, month, ready }: { clientId: string; month: string; ready: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [plan, setPlan] = useState<(MonthPlan & { month: string }) | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [thinking, startThinking] = useTransition();
  const [saving, startSaving] = useTransition();
  const current = plan?.month === month ? plan : null;

  function generate() {
    setError(null);
    startThinking(async () => {
      const res = await planMonthAction(clientId, month, brief);
      if (!res.ok) return setError(res.error);
      if (!res.data.ideas.length) return setError("Claude no encontró huecos con fecha futura en este mes. Prueba con el mes siguiente.");
      setPlan({ ...res.data, month });
      setPicked(new Set(res.data.ideas.map((_, i) => i)));
    });
  }

  function save() {
    if (!current) return;
    const ideas = current.ideas.filter((_, i) => picked.has(i)).map(({ fechaHora, tipo, redes, caption }) => ({ fechaHora, tipo, redes, caption }));
    startSaving(async () => {
      const res = await createDraftsAction(clientId, ideas);
      if (!res.ok) return setError(res.error);
      toast({ title: `${res.created} ${res.created === 1 ? "borrador creado" : "borradores creados"} en el calendario`, tone: "success" });
      setPlan(null);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="dark" className="self-start" iconLeft={<Sparkles aria-hidden className="size-4" />} disabled={!ready} title={ready ? undefined : "Falta la clave de Claude en Vercel (ANTHROPIC_API_KEY)."} onClick={() => setOpen(true)}>
        Plan del mes con Claude
      </Button>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-md bg-surface p-6" aria-busy={thinking}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-ink text-white">
            <Sparkles aria-hidden className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">Copiloto</span>
            <h2 className="font-display text-h3 font-bold">Plan de {monthLabel(month)}</h2>
          </div>
        </div>
        <button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} className="rounded-sm p-1 hover:bg-hairline">
          <X className="size-5" />
        </button>
      </div>

      {!current ? (
        <>
          <p className="text-label">
            Claude revisa lo que le funciona a la cuenta, lo que ya está programado y las fechas importantes de RD de este mes, y te propone de 8 a 12 ideas con día, hora y un
            borrador del texto.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-bold">¿Algo que quieras este mes? (opcional)</span>
            <Textarea rows={2} value={brief} maxLength={1000} onChange={(e) => setBrief(e.target.value)} placeholder="Ej. lanzamos menú de otoño el 15, más reels, promo para el Día de las Madres" />
          </label>
          <Button variant="dark" className="self-start" iconLeft={<Sparkles aria-hidden className="size-4" />} loading={thinking} onClick={generate}>
            Proponer ideas
          </Button>
          {thinking && <p className="text-caption">Claude está buscando fechas y armando el mes. Suele tardar entre 1 y 2 minutos.</p>}
        </>
      ) : (
        <>
          <p className="rounded-item bg-hairline/60 p-3.5 text-label">{current.enfoque}</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {current.ideas.map((idea, i) => {
              const on = picked.has(i);
              return (
                <li key={`${idea.fechaHora}-${i}`}>
                  <label className={cn("flex h-full cursor-pointer gap-3 rounded-item border-[1.5px] p-4 transition-colors", on ? "border-ink" : "border-hairline opacity-60")}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setPicked((cur) => (cur.has(i) ? new Set([...cur].filter((x) => x !== i)) : new Set([...cur, i])))}
                      className="mt-1 size-4 shrink-0 accent-ink"
                    />
                    <span className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-caption font-bold">
                        {dayTimeRD(fromRDInput(idea.fechaHora)!)} · {postTypeLabel[idea.tipo]} · {platShort(idea.redes)}
                      </span>
                      <span className="text-button font-bold">{idea.titulo}</span>
                      <span className="line-clamp-4 text-label whitespace-pre-line">{idea.caption}</span>
                      <span className="text-caption text-muted">{idea.porque}</span>
                      {idea.fechaEspecial && <span className="self-start rounded-full bg-cyan-tint px-2.5 py-1 text-eyebrow font-bold">{idea.fechaEspecial}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2.5">
            <Button loading={saving} disabled={!picked.size} onClick={save}>
              Crear {picked.size} {picked.size === 1 ? "borrador" : "borradores"}
            </Button>
            <Button variant="secondary" loading={thinking} onClick={generate}>
              Proponer otras
            </Button>
            <Button variant="ghost" onClick={() => setPlan(null)}>
              Descartar
            </Button>
          </div>
          <p className="text-caption text-muted">Se guardan como borradores con fecha: les agregas la imagen o el video y los mandas a aprobación como siempre.</p>
        </>
      )}
      {error && (
        <p role="alert" className="flex items-start gap-2 text-label font-semibold text-coral-strong">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </section>
  );
}
