"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Card, CardDescription, CardTitle, Segmented, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { hasText } from "@/lib/content/helpers";
import type { Plan, QuoteService, SiteContent } from "@/lib/content/schema";
import { saveContent } from "./actions";
import { FieldGrid, ListEditor, type FieldDef } from "./fields";

type Group = "general" | "plans" | "quoteServices" | "posts" | "process" | "case" | "logos" | "testimonials" | "faq";
type Item<K extends keyof SiteContent> = SiteContent[K] extends (infer U)[] ? U : never;

const groups: { value: Group; label: string }[] = [
  { value: "general", label: "General" },
  { value: "plans", label: "Planes" },
  { value: "quoteServices", label: "Cotizador" },
  { value: "posts", label: "Feed" },
  { value: "process", label: "Cómo trabajamos" },
  { value: "case", label: "Caso real" },
  { value: "logos", label: "Logos" },
  { value: "testimonials", label: "Testimonios" },
  { value: "faq", label: "FAQ" },
];

const groupLabel: Record<string, string> = Object.fromEntries(groups.map((g) => [g.value, g.label]));

const rid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const generalFields: FieldDef<SiteContent["general"]>[] = [
  { key: "whatsapp", label: "Número de WhatsApp", placeholder: "1809XXXXXXX", hint: "Sin él, los botones abren WhatsApp sin destinatario." },
  { key: "instagram", label: "Usuario de Instagram", placeholder: "peekmedia.rd" },
  { key: "website", label: "Sitio web", placeholder: "peekmedia.do" },
  { key: "contactEmail", label: "Email de contacto", hint: "Aparece en el footer y en las páginas legales." },
  { key: "followers", label: "Seguidores", placeholder: "Ej. 5,400", hint: "Vacío = no se muestra." },
  { key: "postsCount", label: "Publicaciones", placeholder: "Ej. 320" },
  { key: "yearsExperience", label: "Años de experiencia", hint: "El número grande de “Sobre nosotros”." },
  { key: "heroText", label: "Texto del hero", type: "textarea" },
  { key: "aboutTitle", label: "Título de “Sobre nosotros”", wide: true },
  { key: "aboutText", label: "Texto de “Sobre nosotros”", type: "textarea" },
  { key: "founderName", label: "Nombre del fundador" },
  { key: "founderRole", label: "Cargo del fundador" },
  { key: "aboutPhoto", label: "Foto del fundador (URL)", type: "url", wide: true, hint: "Vacío = se muestran sus iniciales." },
];

const planFields: FieldDef<Plan>[] = [
  { key: "name", label: "Nombre" },
  { key: "description", label: "Descripción" },
  { key: "priceFrom", label: "Precio desde (RD$)", type: "price" },
  { key: "billing", label: "Cobro", type: "billing" },
  { key: "items", label: "Qué incluye", type: "lines", hint: "Un punto por línea." },
  { key: "featured", label: "Marcar como “Más elegido”", type: "checkbox", hint: "Va en ink con la etiqueta coral." },
];

const serviceFields: FieldDef<QuoteService>[] = [
  { key: "name", label: "Servicio" },
  { key: "description", label: "Descripción" },
  { key: "priceFrom", label: "Precio desde (RD$)", type: "price" },
  { key: "billing", label: "Cobro", type: "billing" },
];

const postFields: FieldDef<Item<"posts">>[] = [
  { key: "title", label: "Título" },
  { key: "tag", label: "Etiqueta", placeholder: "Humor, Tips…" },
  { key: "image", label: "Portada (URL)", type: "url" },
  { key: "url", label: "Enlace al post", type: "url" },
];

const stepFields: FieldDef<Item<"process">>[] = [
  { key: "title", label: "Paso", wide: true },
  { key: "desc", label: "Descripción", type: "textarea" },
];

const caseFields: FieldDef<Omit<SiteContent["case"], "metrics">>[] = [
  { key: "title", label: "Título", wide: true },
  { key: "text", label: "Texto", type: "textarea" },
  { key: "photo", label: "Foto (URL)", type: "url", wide: true },
];

const metricFields: FieldDef<SiteContent["case"]["metrics"][number]>[] = [
  { key: "value", label: "Resultado verificado", placeholder: "Ej. +320 leads en 3 meses" },
  { key: "label", label: "Etiqueta" },
];

const logoFields: FieldDef<Item<"logos">>[] = [
  { key: "name", label: "Cliente" },
  { key: "image", label: "Logo (URL)", type: "url", hint: "Solo con permiso del cliente." },
];

const testimonialFields: FieldDef<Item<"testimonials">>[] = [
  { key: "quote", label: "Testimonio", type: "textarea" },
  { key: "name", label: "Nombre" },
  { key: "business", label: "Negocio" },
];

const faqFields: FieldDef<Item<"faq">>[] = [
  { key: "q", label: "Pregunta", wide: true },
  { key: "a", label: "Respuesta", type: "textarea" },
];

export function SiteEditor({ initial }: { initial: SiteContent }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [content, setContent] = useState(initial);
  const [group, setGroup] = useState<Group>("general");
  const [saving, startSaving] = useTransition();
  const dirty = JSON.stringify(content) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function set<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setContent((c) => ({ ...c, [key]: value }));
  }

  /** Quitar sin confirm(): se quita al instante y el toast permite deshacer. */
  function removeFrom<K extends Exclude<Group, "general" | "case">>(key: K, index: number, noun: string) {
    const before = content[key];
    set(key, (before as unknown[]).filter((_, i) => i !== index) as SiteContent[K]);
    toast({ title: `${noun} quitado`, description: "Recuerda guardar los cambios.", action: { label: "Deshacer", onClick: () => set(key, before) } });
  }

  function save() {
    startSaving(async () => {
      const res = await saveContent(content);
      if (res.ok) {
        setSaved(content);
        toast({ title: "Cambios guardados", description: "El sitio ya muestra la versión nueva.", tone: "success" });
        return;
      }
      const [g, index, field] = res.path ?? [];
      const where = g ? [groupLabel[String(g)] ?? String(g), typeof index === "number" ? `#${index + 1}` : index, field].filter(Boolean).join(" › ") : "";
      if (g && g in groupLabel) setGroup(g as Group);
      toast({ title: "No se pudo guardar", description: where ? `${where}: ${res.error}` : res.error, tone: "error" });
    });
  }

  const missingWhatsapp = !hasText(content.general.whatsapp);

  return (
    <div className="flex flex-col gap-5">
      <Segmented label="Sección del sitio" value={group} onChange={setGroup} options={groups} className="self-start" />

      {group === "general" && (
        <Card className="gap-6">
          <Header title="General" description="Datos de contacto y textos principales." />
          {missingWhatsapp && (
            <p role="alert" className="rounded-item bg-coral-tint px-4 py-3 text-label">
              <strong>Falta el número de WhatsApp.</strong> Es lo primero: todos los botones del sitio lo usan.
            </p>
          )}
          <FieldGrid defs={generalFields} value={content.general} onChange={(v) => set("general", v)} />
        </Card>
      )}

      {group === "plans" && (
        <Section title="Planes" description="Las cards de “Elige tu plan”. Vacío en precio = “A cotizar”.">
          <ListEditor
            items={content.plans}
            onChange={(v) => set("plans", v)}
            onRemove={(i) => removeFrom("plans", i, "Plan")}
            defs={planFields}
            itemLabel={(p) => p.name || "Plan sin nombre"}
            addLabel="Añadir plan"
            max={6}
            newItem={() => ({ id: rid("plan"), name: "", description: "", priceFrom: null, billing: "monthly" as const, items: [], featured: false })}
          />
        </Section>
      )}

      {group === "quoteServices" && (
        <Section title="Cotizador" description="Servicios que se pueden marcar en “Cotiza a tu medida”.">
          <ListEditor
            items={content.quoteServices}
            onChange={(v) => set("quoteServices", v)}
            onRemove={(i) => removeFrom("quoteServices", i, "Servicio")}
            defs={serviceFields}
            itemLabel={(s) => s.name || "Servicio sin nombre"}
            addLabel="Añadir servicio"
            max={24}
            newItem={() => ({ id: rid("svc"), name: "", description: "", priceFrom: null, billing: "monthly" as const })}
          />
        </Section>
      )}

      {group === "posts" && (
        <Section title="Feed" description="Los 6 posts de la sección de Instagram. En la Fase 4 se leerán solos desde la API.">
          <ListEditor
            items={content.posts}
            onChange={(v) => set("posts", v)}
            onRemove={(i) => removeFrom("posts", i, "Post")}
            defs={postFields}
            itemLabel={(p) => p.title || "Post sin título"}
            hiddenReason={(p) => (hasText(p.title) ? null : "falta el título")}
            addLabel="Añadir post"
            max={12}
            newItem={() => ({ title: "", tag: "", image: "", url: "" })}
          />
        </Section>
      )}

      {group === "process" && (
        <Section title="Cómo trabajamos" description="Los pasos numerados.">
          <ListEditor
            items={content.process}
            onChange={(v) => set("process", v)}
            onRemove={(i) => removeFrom("process", i, "Paso")}
            defs={stepFields}
            itemLabel={(s) => s.title || "Paso sin nombre"}
            hiddenReason={(s) => (hasText(s.title) ? null : "falta el nombre")}
            addLabel="Añadir paso"
            max={6}
            newItem={() => ({ title: "", desc: "" })}
          />
        </Section>
      )}

      {group === "case" && (
        <>
          <Card className="gap-6">
            <Header title="Caso real" description="Sin foto se muestra un bloque de color con las formas de la marca." />
            <FieldGrid
              defs={caseFields}
              value={content.case}
              onChange={(v) => set("case", { ...content.case, ...v })}
            />
          </Card>
          <Section title="Métricas" description="Solo cifras verificadas. Las que no tengan resultado no se publican.">
            <ListEditor
              items={content.case.metrics}
              onChange={(metrics) => set("case", { ...content.case, metrics })}
              defs={metricFields}
              itemLabel={(m) => m.label || "Métrica"}
              hiddenReason={(m) => (hasText(m.value) ? null : "falta el resultado")}
              addLabel="Añadir métrica"
              max={6}
              newItem={() => ({ value: "", label: "" })}
            />
          </Section>
        </>
      )}

      {group === "logos" && (
        <Section title="Logos de clientes" description="Sin logos, la franja no aparece.">
          <ListEditor
            items={content.logos}
            onChange={(v) => set("logos", v)}
            onRemove={(i) => removeFrom("logos", i, "Logo")}
            defs={logoFields}
            itemLabel={(l) => l.name || "Cliente"}
            hiddenReason={(l) => (hasText(l.name) || hasText(l.image) ? null : "falta el nombre o el logo")}
            addLabel="Añadir logo"
            max={12}
            newItem={() => ({ name: "", image: "" })}
            empty={<Empty>Todavía no hay logos. La franja está oculta.</Empty>}
          />
        </Section>
      )}

      {group === "testimonials" && (
        <Section title="Testimonios" description="Solo testimonios reales. Sin ninguno, la sección no aparece.">
          <ListEditor
            items={content.testimonials}
            onChange={(v) => set("testimonials", v)}
            onRemove={(i) => removeFrom("testimonials", i, "Testimonio")}
            defs={testimonialFields}
            itemLabel={(t) => t.name || "Testimonio"}
            hiddenReason={(t) => (!hasText(t.quote) ? "falta el texto" : !hasText(t.name) ? "falta el nombre" : null)}
            addLabel="Añadir testimonio"
            max={9}
            newItem={() => ({ quote: "", name: "", business: "" })}
            empty={<Empty>Todavía no hay testimonios. La sección está oculta.</Empty>}
          />
        </Section>
      )}

      {group === "faq" && (
        <Section title="Preguntas frecuentes" description="Las preguntas sin respuesta no se publican.">
          <ListEditor
            items={content.faq}
            onChange={(v) => set("faq", v)}
            onRemove={(i) => removeFrom("faq", i, "Pregunta")}
            defs={faqFields}
            itemLabel={(f) => f.q || "Pregunta"}
            hiddenReason={(f) => (!hasText(f.q) ? "falta la pregunta" : !hasText(f.a) ? "falta la respuesta" : null)}
            addLabel="Añadir pregunta"
            max={15}
            newItem={() => ({ q: "", a: "" })}
          />
        </Section>
      )}

      <div
        className={cn(
          "sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-full py-2 pr-2 pl-5 shadow-elevated transition-colors",
          dirty ? "bg-ink text-white" : "bg-surface",
        )}
      >
        <p className="text-label font-semibold" aria-live="polite">
          {dirty ? "Tienes cambios sin guardar" : "Todo guardado"}
        </p>
        <div className="flex gap-2">
          <Button variant={dirty ? "ghost" : "secondary"} size="sm" disabled={!dirty || saving} onClick={() => setContent(saved)} className={cn(dirty && "text-white hover:bg-white/10")}>
            Descartar
          </Button>
          <Button variant={dirty ? "primary" : "secondary"} size="sm" disabled={!dirty} loading={saving} onClick={save}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}

function Header({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 px-1">
        <h2 className="font-display text-h2 font-bold tracking-[-0.02em]">{title}</h2>
        <p className="text-label text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border-[1.5px] border-dashed border-ink/25 px-5 py-8 text-center text-label text-muted">{children}</p>;
}
