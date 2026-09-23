"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { submitQuote } from "@/app/(site)/actions";
import { Button, Eyebrow, Field, Input, Reveal, SelectableCard, Textarea, useToast } from "@/components/ui";
import { money, priceLabel, quoteMessage, quoteTotals, waLink } from "@/lib/content/helpers";
import type { QuoteService } from "@/lib/content/schema";
import { DisplayTitle, WhatsAppIcon } from "./section";

export function Quoter({ services, whatsapp }: { services: QuoteService[]; whatsapp: string }) {
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [notes, setNotes] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const chosen = services.filter((s) => selected.includes(s.id));
  const totals = quoteTotals(chosen);

  function toggle(id: string, on: boolean) {
    setSelected((all) => (on ? [...all, id] : all.filter((x) => x !== id)));
  }

  function send() {
    if (name.trim().length < 2) {
      setNameError("Escribe tu nombre para saber a quién le respondemos.");
      nameRef.current?.focus();
      return;
    }
    setNameError(undefined);
    // Se abre WhatsApp en el mismo clic (si esperamos al servidor, el navegador bloquea la ventana).
    window.open(waLink(whatsapp, quoteMessage({ name, business, notes, services: chosen })), "_blank", "noopener");
    startTransition(async () => {
      const res = await submitQuote({ name, business, notes, serviceIds: selected, website: honeypotRef.current?.value ?? "" });
      if (res.ok) toast({ title: "¡Listo! Te abrimos WhatsApp", description: "Envía el mensaje y te respondemos pronto.", tone: "success" });
      else toast({ title: res.error, tone: "error" });
    });
  }

  return (
    <section id="cotiza" aria-labelledby="cotiza-t" className="scroll-mt-20 bg-texture-gris px-[clamp(20px,4vw,32px)] py-[clamp(56px,9vw,88px)]">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-start gap-14">
        <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-8">
          <Reveal className="flex flex-col gap-5">
            <Eyebrow>Cotización personalizada</Eyebrow>
            <DisplayTitle id="cotiza-t">
              Cotiza a<br />
              tu medida.
            </DisplayTitle>
            <p className="max-w-[460px] text-[17px] leading-[1.55]">Marca lo que necesitas y te enviamos la cotización por WhatsApp.</p>
          </Reveal>
          <div role="group" aria-label="Servicios" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-3">
            {services.map((s) => (
              <SelectableCard
                key={s.id}
                checked={selected.includes(s.id)}
                onCheckedChange={(on) => toggle(s.id, on)}
                title={s.name}
                description={s.description}
                meta={priceLabel(s.priceFrom, s.billing)}
              />
            ))}
          </div>
        </div>

        <div
          ref={summaryRef}
          className="flex min-w-0 flex-[2_1_340px] scroll-mt-24 flex-col gap-5 rounded-lg bg-surface p-8 shadow-elevated lg:sticky lg:top-24"
        >
          <h3 className="font-display text-h2 font-bold tracking-[-0.02em]">Tu cotización</h3>
          <Field label="Tu nombre" required error={nameError}>
            <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Ej. María Pérez" />
          </Field>
          <Field label="Nombre de tu negocio">
            <Input value={business} onChange={(e) => setBusiness(e.target.value)} autoComplete="organization" placeholder="Ej. Café Aroma" />
          </Field>
          <Field label="¿Qué quieres lograr?">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cuéntanos un poco de tu negocio." />
          </Field>
          {/* Honeypot: oculto para personas y lectores de pantalla. */}
          <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />

          <div className="flex flex-col gap-3 border-t border-hairline pt-5" aria-live="polite">
            {chosen.length === 0 ? (
              <p className="text-button text-muted">Aún no has marcado servicios.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {chosen.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3 text-button">
                    <span>{s.name}</span>
                    <span className="font-semibold whitespace-nowrap">{priceLabel(s.priceFrom, s.billing)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(totals.monthly > 0 || totals.once > 0) && (
            <div className="flex flex-col gap-2 rounded-md bg-sand p-5">
              {totals.monthly > 0 && <Total label="Mensual, desde" value={money(totals.monthly)} />}
              {totals.once > 0 && <Total label="Pago único, desde" value={money(totals.once)} />}
              <p className="text-caption">Precios de referencia. El monto final depende de lo que necesite tu negocio.</p>
            </div>
          )}

          <Button size="lg" onClick={send} loading={pending} iconLeft={<WhatsAppIcon />} className="h-[58px] whitespace-normal">
            Enviar cotización por WhatsApp
          </Button>
        </div>
      </div>
      <MobileQuoteBar count={chosen.length} onGo={() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
    </section>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-baseline justify-between gap-3">
      <span className="text-label">{label}</span>
      <span className="font-display text-[24px] font-bold">{value}</span>
    </p>
  );
}

/** En móvil, mientras el cotizador está en pantalla y el resumen no se ve: "3 servicios · Enviar". */
function MobileQuoteBar({ count, onGo }: { count: number; onGo: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const section = document.getElementById("cotiza");
    const summary = section?.querySelector("h3")?.parentElement;
    if (!section || !summary) return;
    let inSection = false;
    let summaryVisible = false;
    const update = () => setVisible(inSection && !summaryVisible);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === section) inSection = e.isIntersecting;
        else summaryVisible = e.isIntersecting;
      }
      update();
    });
    io.observe(section);
    io.observe(summary);
    return () => io.disconnect();
  }, []);

  if (!visible || count === 0) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-full bg-ink py-2 pr-2 pl-5 text-white shadow-elevated lg:hidden">
      <span className="text-label font-semibold">
        {count} {count === 1 ? "servicio" : "servicios"}
      </span>
      <Button size="sm" onClick={onGo}>
        Enviar
      </Button>
    </div>
  );
}
