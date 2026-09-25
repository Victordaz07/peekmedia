"use client";

import { Copy, Sparkles, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, Field, Textarea, useToast } from "@/components/ui";
import type { LeadReply } from "@/lib/ai/schemas";
import { leadReplyAction } from "./actions";

/** Dentro del detalle de un prospecto: Claude sugiere el primer WhatsApp, el plan que le conviene y qué preguntar. */
export function LeadAssist({ leadId, ready }: { leadId: string; ready: boolean }) {
  const toast = useToast();
  const [data, setData] = useState<(LeadReply & { planName: string }) | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [thinking, start] = useTransition();

  function generate() {
    setError(null);
    start(async () => {
      const res = await leadReplyAction(leadId);
      if (!res.ok) return setError(res.error);
      setData(res.data);
      setMessage(res.data.whatsapp);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      toast({ title: "Mensaje copiado. Pégalo en WhatsApp.", tone: "success" });
    } catch {
      toast({ title: "No se pudo copiar. Selecciónalo y cópialo a mano.", tone: "error" });
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-item bg-hairline/60 p-4" aria-busy={thinking}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">Copiloto Claude</h3>
        <Button
          size="sm"
          variant={data ? "secondary" : "dark"}
          iconLeft={<Sparkles aria-hidden className="size-4" />}
          loading={thinking}
          disabled={!ready}
          title={ready ? undefined : "Falta la clave de Claude en Vercel (ANTHROPIC_API_KEY)."}
          onClick={generate}
        >
          {data ? "Sugerir otra" : "Sugerir respuesta"}
        </Button>
      </div>
      {!data && !thinking && <p className="text-label">Claude lee lo que marcó y lo que contó, y te propone el primer mensaje de WhatsApp y el plan que más le conviene.</p>}
      {thinking && <p className="text-caption">Claude está preparando la respuesta…</p>}
      {data && (
        <>
          <Field label="Primer mensaje de WhatsApp">
            <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <Button size="sm" variant="outline" className="self-start" iconLeft={<Copy aria-hidden className="size-4" />} disabled={!message.trim()} onClick={copy}>
            Copiar mensaje
          </Button>
          {data.planName && (
            <p className="text-label">
              <strong>Plan recomendado: {data.planName}.</strong> {data.razonPlan}
            </p>
          )}
          {data.preguntas.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-caption font-bold">Para la primera llamada</span>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-label">
                {data.preguntas.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {data.siguientePaso && (
            <p className="text-label">
              <strong>Siguiente paso:</strong> {data.siguientePaso}
            </p>
          )}
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
