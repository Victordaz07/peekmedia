"use client";

import { Sparkles, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Textarea, useToast } from "@/components/ui";
import type { ReportSummary } from "@/lib/ai/schemas";
import { addClientNoteAction } from "../novedades/actions";
import { summarizeReportAction } from "./actions";

/** "Resumen del mes con Claude" (equipo): lo lee el CM y, si quiere, lo publica en Novedades para el cliente. */
export function ReportSummaryCard({ clientId, ready }: { clientId: string; ready: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [data, setData] = useState<ReportSummary | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [thinking, startThinking] = useTransition();
  const [publishing, startPublishing] = useTransition();

  function generate() {
    setError(null);
    startThinking(async () => {
      const res = await summarizeReportAction(clientId);
      if (!res.ok) return setError(res.error);
      setData(res.data);
      setNote(res.data.notaParaCliente);
    });
  }

  function publish() {
    setError(null);
    startPublishing(async () => {
      const res = await addClientNoteAction(clientId, note);
      if (!res.ok) return setError(res.error);
      toast({ title: "Publicado en Novedades. El cliente ya lo ve.", tone: "success" });
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-md bg-surface p-6" data-noprint aria-busy={thinking}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-ink text-white">
            <Sparkles aria-hidden className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">Copiloto</span>
            <h2 className="font-display text-h3 font-bold">Resumen del mes</h2>
          </div>
        </div>
        <Button
          variant={data ? "secondary" : "dark"}
          iconLeft={<Sparkles aria-hidden className="size-4" />}
          loading={thinking}
          disabled={!ready}
          title={ready ? undefined : "Falta la clave de Claude en Vercel (ANTHROPIC_API_KEY)."}
          onClick={generate}
        >
          {data ? "Escribir otro" : "Resumir con Claude"}
        </Button>
      </div>
      {!data && !thinking && <p className="text-label">Claude lee los números de los últimos 30 días y te explica, en palabras sencillas, qué funcionó, qué no y qué hacer el mes que viene.</p>}
      {thinking && <p className="text-caption">Claude está leyendo los números del mes…</p>}
      {data && (
        <>
          <p className="font-display text-h3 font-bold">{data.titular}</p>
          <div className="grid gap-4 md:grid-cols-3">
            <List title="Lo que funcionó" items={data.funciono} />
            <List title="Lo que hay que mejorar" items={data.mejorar} />
            <List title="El mes que viene" items={data.proximoMes} />
          </div>
          <Field label="Nota para el cliente" hint="Edítala si quieres. Se publica en su sección de Novedades.">
            <Textarea rows={7} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button className="self-start" loading={publishing} disabled={!note.trim()} onClick={publish}>
            Publicar en Novedades
          </Button>
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

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-item bg-hairline/60 p-4">
      <h3 className="text-caption font-bold">{title}</h3>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-label">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
