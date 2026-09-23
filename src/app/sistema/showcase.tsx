"use client";

import { ArrowRight, Camera, Plug, Send, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Accordion,
  Avatar,
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Eyebrow,
  Field,
  Input,
  KpiCard,
  LineChart,
  LoadingState,
  Logo,
  LogoMark,
  Modal,
  NetworkChip,
  Reveal,
  Segmented,
  SelectableCard,
  Select,
  Sparkline,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
  TrendPill,
  UsageBar,
  useToast,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  clientStatus,
  connectionStatus,
  contractStatus,
  invoiceStatus,
  networkIds,
  networks,
  postStatus,
  type Network,
} from "@/lib/design/tokens";

const nav = [
  ["color", "Color"],
  ["tipografia", "Tipografía"],
  ["forma", "Espacio y forma"],
  ["botones", "Botones"],
  ["estados", "Estados"],
  ["formularios", "Formularios"],
  ["seleccion", "Selección"],
  ["datos", "Datos"],
  ["overlays", "Diálogos y avisos"],
  ["vacios", "Vacío, carga y error"],
  ["movimiento", "Movimiento"],
] as const;

export function Showcase() {
  return (
    <div className="min-h-dvh bg-texture-gris">
      <header className="sticky top-0 z-40 border-b border-hairline bg-white/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-[clamp(20px,4vw,32px)] py-3">
          <Logo className="h-9" priority />
          <nav aria-label="Secciones" className="hidden gap-5 text-label font-medium whitespace-nowrap xl:flex">
            {nav.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-sm hover:text-coral-strong">
                {label}
              </a>
            ))}
          </nav>
          <Badge tone="dark">Fase 1</Badge>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1320px] flex-col gap-6 px-[clamp(20px,4vw,32px)] py-[clamp(40px,6vw,64px)]">
        <div className="flex flex-col gap-4 pb-6">
          <Eyebrow>Sistema de diseño · v1</Eyebrow>
          <h1 className="font-display text-display-md font-bold tracking-[-0.045em]">
            Las piezas de{" "}
            <span className="relative inline-block">
              <span aria-hidden className="absolute inset-x-0 bottom-[0.06em] -z-0 h-[0.2em] bg-cyan" />
              <span className="relative">Peek.</span>
            </span>
          </h1>
          <p className="max-w-[560px] text-lead">
            Tokens y componentes con todos sus estados. Todo lo que construyamos en el sitio, el admin y la plataforma sale de
            aquí.
          </p>
        </div>

        <ColorSection />
        <TypeSection />
        <ShapeSection />
        <ButtonsSection />
        <StatusSection />
        <FormsSection />
        <SelectionSection />
        <DataSection />
        <OverlaysSection />
        <EmptySection />
        <MotionSection />
      </main>
    </div>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24">
      <Reveal>
        <Card padding="none" className="gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-2">
            <h2 id={`${id}-t`} className="font-display text-display-sm font-bold tracking-[-0.04em]">
              {title}
            </h2>
            {intro && <p className="max-w-[70ch] text-body text-muted">{intro}</p>}
          </div>
          {children}
        </Card>
      </Reveal>
    </section>
  );
}

function Sub({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <h3 className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">{title}</h3>
      {children}
    </div>
  );
}

/* ───────────── Color ───────────── */

const swatches = [
  { name: "ink", hex: "#0B1F33", cls: "bg-ink", fg: "text-white", note: "Texto principal. Reemplaza al negro." },
  { name: "coral", hex: "#FF5A5F", cls: "bg-coral", fg: "text-ink", note: "CTAs y acentos. Máx. 15% de una pieza. Texto ink encima: 5.4:1." },
  { name: "coral-strong", hex: "#D6353C", cls: "bg-coral-strong", fg: "text-white", note: "Nuevo. Texto de error y botón destructivo: 4.7:1." },
  { name: "coral-tint", hex: "#FFE1E2", cls: "bg-coral-tint", fg: "text-ink", note: "Por aprobar, avisos, variación negativa." },
  { name: "cyan", hex: "#21C4D6", cls: "bg-cyan", fg: "text-ink", note: "Movimiento. Subrayados, foco, checks. Nunca texto blanco encima." },
  { name: "cyan-tint", hex: "cyan 22%", cls: "bg-cyan-tint", fg: "text-ink", note: "Conectado, variación positiva." },
  { name: "sand", hex: "#BEBEBE", cls: "bg-sand", fg: "text-ink", note: "Secciones grises y fondo de las apps." },
  { name: "ocean", hex: "#123553", cls: "bg-ocean", fg: "text-white", note: "Bloques de foto y avatares. Nunca texto." },
  { name: "surface", hex: "#FFFFFF", cls: "bg-surface ring-1 ring-inset ring-line", fg: "text-ink", note: "Fondo de página, cards y formularios." },
];

function ColorSection() {
  return (
    <Section
      id="color"
      title="Color"
      intro="Corrección aplicada: el texto blanco sobre coral daba ~3:1 y no pasaba WCAG AA. Ahora todo CTA coral lleva texto ink (5.4:1), y el rojo para errores usa coral-strong."
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
        {swatches.map((s) => (
          <div key={s.name} className="flex flex-col overflow-hidden rounded-md ring-1 ring-hairline">
            <div className={cn("flex h-24 items-end p-3 font-display text-h3 font-bold", s.cls, s.fg)}>Aa</div>
            <div className="flex flex-col gap-1 p-3">
              <p className="flex justify-between gap-2 text-label font-bold">
                {s.name} <span className="font-medium text-muted uppercase">{s.hex}</span>
              </p>
              <p className="text-caption text-muted">{s.note}</p>
            </div>
          </div>
        ))}
      </div>
      <Sub title="Colores de red (solo puntos y chips)">
        <div className="flex flex-wrap gap-2">
          {networkIds.map((n) => (
            <NetworkChip key={n} network={n} />
          ))}
        </div>
      </Sub>
      <Sub title="Texturas (solo superficies decorativas)">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
          <div className="grid h-32 place-items-center rounded-md bg-texture-gris text-label font-bold">textura-gris · secciones y fondo de apps</div>
          <div className="grid h-32 place-items-center rounded-md bg-texture-blanco text-label font-bold ring-1 ring-hairline">textura-blanco · solo sidebar</div>
        </div>
      </Sub>
    </Section>
  );
}

/* ───────────── Tipografía ───────────── */

const typeScale = [
  { token: "display-lg", cls: "font-display text-display-lg font-bold tracking-[-0.045em]", sample: "Haz que te vean.", spec: "Space Grotesk 700 · clamp(52–132px)" },
  { token: "display-md", cls: "font-display text-display-md font-bold tracking-[-0.045em]", sample: "Elige tu plan.", spec: "Space Grotesk 700 · clamp(48–112px)" },
  { token: "display-sm", cls: "font-display text-display-sm font-bold tracking-[-0.04em]", sample: "Café Aroma", spec: "Space Grotesk 700 · clamp(36–60px) · H1 de la app" },
  { token: "h1", cls: "font-display text-h1 font-bold tracking-[-0.03em]", sample: "Plan Estratégico", spec: "Space Grotesk 700 · 40px" },
  { token: "h2", cls: "font-display text-h2 font-bold tracking-[-0.02em]", sample: "Próximas publicaciones", spec: "Space Grotesk 700 · 28px" },
  { token: "h3", cls: "font-display text-h3 font-bold tracking-[-0.02em]", sample: "Mejores publicaciones del mes", spec: "Space Grotesk 700 · 22px" },
  { token: "lead", cls: "text-lead", sample: "Ideas que encuentran a su gente. Marketing digital desde Santo Domingo.", spec: "DM Sans 400 · 19px / 1.5" },
  { token: "body", cls: "text-body", sample: "Revisamos tu marca, tus redes y a tu competencia.", spec: "DM Sans 400 · 16 / 24" },
  { token: "button", cls: "text-button font-semibold", sample: "Enviar cotización por WhatsApp", spec: "DM Sans 600 · 15 / 20" },
  { token: "label", cls: "text-label", sample: "Publicado hace 2 horas en Instagram", spec: "DM Sans 400 · 14 / 20" },
  { token: "caption", cls: "text-caption", sample: "#SantoDomingo #MarketingDigital", spec: "DM Sans 400 · 13 / 18" },
  { token: "eyebrow", cls: "text-eyebrow font-bold tracking-[0.12em] uppercase", sample: "Estrategia · Contenido · Resultados", spec: "DM Sans 700 · 12px · tracking .12em" },
  { token: "signature", cls: "font-signature text-[44px] leading-none font-semibold", sample: "Dagoberto Nuñez", spec: "Caveat 600 · solo firmas" },
];

function TypeSection() {
  return (
    <Section id="tipografia" title="Tipografía" intro="Space Grotesk para titulares, DM Sans para todo lo que se lee, Caveat solo para la firma del contrato.">
      <div className="flex flex-col divide-y divide-hairline">
        {typeScale.map((t) => (
          <div key={t.token} className="grid gap-2 py-4 md:grid-cols-[180px_1fr] md:items-baseline md:gap-6">
            <div className="flex flex-col">
              <code className="text-label font-bold">{t.token}</code>
              <span className="text-caption text-muted">{t.spec}</span>
            </div>
            <p className={cn("min-w-0 break-words", t.cls)}>{t.sample}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────── Espacio, radios, sombras ───────────── */

function ShapeSection() {
  const spaceScale = [
    ["xs", 8],
    ["sm", 12],
    ["md", 20],
    ["lg", 32],
    ["xl", 56],
    ["xxl", 88],
  ] as const;
  const radii = [
    ["sm · 10", "rounded-sm", "chips, inputs"],
    ["item · 14", "rounded-item", "items de lista"],
    ["md · 20", "rounded-md", "cards"],
    ["modal · 28", "rounded-modal", "modales"],
    ["lg · 36", "rounded-lg", "hero, bloques"],
    ["pill", "rounded-full", "botones, avatares"],
  ] as const;
  return (
    <Section id="forma" title="Espacio y forma">
      <Sub title="Espacio">
        <div className="flex flex-col gap-2">
          {spaceScale.map(([name, px]) => (
            <div key={name} className="flex items-center gap-4 text-label">
              <code className="w-10 font-bold">{name}</code>
              <span className="h-3 rounded-full bg-cyan" style={{ width: px }} />
              <span className="text-muted">{px}px</span>
            </div>
          ))}
        </div>
      </Sub>
      <Sub title="Radios">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
          {radii.map(([name, cls, use]) => (
            <div key={name} className="flex flex-col gap-2">
              <div className={cn("h-20 bg-sand", cls)} />
              <p className="text-label font-bold">{name}</p>
              <p className="-mt-2 text-caption text-muted">{use}</p>
            </div>
          ))}
        </div>
      </Sub>
      <Sub title="Sombras (solo dos)">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-8 bg-sand/40 p-8">
          <div className="grid h-28 place-items-center rounded-md bg-surface text-label font-bold shadow-elevated">shadow-elevated</div>
          <div className="grid h-28 place-items-center rounded-md bg-surface text-label font-bold shadow-hover">shadow-hover</div>
        </div>
      </Sub>
    </Section>
  );
}

/* ───────────── Botones ───────────── */

function ButtonsSection() {
  const [loading, setLoading] = useState(false);
  const variants = ["primary", "dark", "secondary", "outline", "ghost", "destructive"] as const;
  return (
    <Section
      id="botones"
      title="Botones"
      intro="Normal, hover (sube 2px), foco (anillo cian de 2px; navega con Tab para verlo), activo, cargando y deshabilitado."
    >
      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-[120px_repeat(3,1fr)] items-center gap-x-4 gap-y-4">
          <span />
          {["Normal", "Cargando", "Deshabilitado"].map((h) => (
            <span key={h} className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">
              {h}
            </span>
          ))}
          {variants.map((v) => (
            <Row key={v} label={v}>
              <Button variant={v}>{v === "destructive" ? "Quitar acceso" : "Lo quiero"}</Button>
              <Button variant={v} loading>
                Guardando
              </Button>
              <Button variant={v} disabled>
                No disponible
              </Button>
            </Row>
          ))}
        </div>
      </div>
      <Sub title="Tamaños e íconos">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Pequeño</Button>
          <Button>Mediano</Button>
          <Button size="lg" iconRight={<ArrowRight className="size-5" />}>
            Hablemos por WhatsApp
          </Button>
          <Button variant="outline" iconLeft={<Send className="size-4" />}>
            Enviar a aprobación
          </Button>
          <Button variant="secondary" size="icon" aria-label="Eliminar">
            <Trash2 className="size-4" />
          </Button>
          <Button
            variant="dark"
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1800);
            }}
          >
            {loading ? "Sincronizando" : "Probar carga"}
          </Button>
        </div>
      </Sub>
    </Section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <code className="text-label font-bold">{label}</code>
      {Array.isArray(children) ? children.map((c, i) => <div key={i}>{c}</div>) : children}
    </>
  );
}

/* ───────────── Estados ───────────── */

function StatusSection() {
  return (
    <Section id="estados" title="Estados" intro="Un solo vocabulario para toda la app. Cada estado tiene una etiqueta y un tono; nadie inventa colores sueltos.">
      <div className="grid gap-6 md:grid-cols-2">
        <Sub title="Contenido">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(postStatus) as (keyof typeof postStatus)[]).map((s) => (
              <StatusBadge key={s} kind="post" status={s} />
            ))}
          </div>
        </Sub>
        <Sub title="Clientes">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(clientStatus) as (keyof typeof clientStatus)[]).map((s) => (
              <StatusBadge key={s} kind="client" status={s} />
            ))}
          </div>
        </Sub>
        <Sub title="Contrato">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(contractStatus) as (keyof typeof contractStatus)[]).map((s) => (
              <StatusBadge key={s} kind="contract" status={s} />
            ))}
          </div>
        </Sub>
        <Sub title="Conexión de cuentas">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(connectionStatus) as (keyof typeof connectionStatus)[]).map((s) => (
              <StatusBadge key={s} kind="connection" status={s} />
            ))}
          </div>
        </Sub>
        <Sub title="Pagos">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(invoiceStatus) as (keyof typeof invoiceStatus)[]).map((s) => (
              <StatusBadge key={s} kind="invoice" status={s} />
            ))}
          </div>
        </Sub>
        <Sub title="Variación y etiquetas">
          <div className="flex flex-wrap items-center gap-2">
            <TrendPill value={12.4} />
            <TrendPill value={-3.1} />
            <Badge tone="alert" size="sm">
              Más elegido
            </Badge>
            <Badge tone="dark" dot>
              En vivo
            </Badge>
          </div>
        </Sub>
      </div>
    </Section>
  );
}

/* ───────────── Formularios ───────────── */

function FormsSection() {
  const [caption, setCaption] = useState("Nuevo menú de temporada ☕️ Ven a probarlo este fin de semana.");
  const limit = networks.x.charLimit;
  const over = caption.length > limit;
  return (
    <Section id="formularios" title="Formularios" intro="Los campos van siempre sobre blanco, nunca sobre textura. El error se anuncia al lector de pantalla con aria-invalid y aria-describedby.">
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Nombre" hint="Como quieres que te llamemos.">
          <Input placeholder="Ej. María Pérez" />
        </Field>
        <Field label="Email" required error="Ese email ya pertenece a otro cliente.">
          <Input type="email" defaultValue="cafe@demo.do" />
        </Field>
        <Field label="Negocio">
          <Input defaultValue="Café Aroma" disabled />
        </Field>
        <Field label="Rol">
          <Select defaultValue="approver">
            <option value="admin">Administrador</option>
            <option value="approver">Aprobador</option>
            <option value="viewer">Solo lectura</option>
          </Select>
        </Field>
        <Field
          label="Texto de la publicación"
          className="md:col-span-2"
          counter={
            <span className={cn(over && "font-bold text-coral-strong")}>
              {caption.length} / {limit} (X)
            </span>
          }
          error={over ? `X admite hasta ${limit} caracteres.` : undefined}
          hint="El contador usa el límite más corto de las redes elegidas."
        >
          <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-4">
          <Checkbox label="Acepto los términos del contrato" description="Firmas como Administrador de Café Aroma." />
          <Checkbox label="Marcada" defaultChecked />
          <Checkbox label="Deshabilitada" disabled />
        </div>
      </div>
    </Section>
  );
}

/* ───────────── Selección ───────────── */

const quote = [
  { id: "redes", name: "Manejo de redes sociales", desc: "Publicación y comunidad en tus cuentas.", price: 10000 },
  { id: "reels", name: "Reels y video corto", desc: "Guion, edición y publicación.", price: 8000 },
  { id: "ads", name: "Campañas en Meta Ads", desc: "La inversión en anuncios va aparte.", price: 7000 },
];

function SelectionSection() {
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [tab, setTab] = useState<"todos" | "sin" | "comentarios">("sin");
  const [picked, setPicked] = useState<string[]>(["redes"]);
  const [nets, setNets] = useState<Network[]>(["instagram", "facebook"]);
  return (
    <Section id="seleccion" title="Selección" intro="Pestañas (flechas ← → para moverte), cards del cotizador (role=checkbox; Espacio o Enter), chips de red y avatares.">
      <div className="flex flex-wrap gap-6">
        <Sub title="Segmented">
          <Segmented
            label="Rango de fechas"
            value={range}
            onChange={setRange}
            options={[
              { value: "7", label: "7 días" },
              { value: "30", label: "30 días" },
              { value: "90", label: "90 días" },
            ]}
          />
        </Sub>
        <Sub title="Con contador">
          <Segmented
            label="Filtro de bandeja"
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: "todos", label: "Todos" },
              { value: "sin", label: "Sin responder", badge: 4 },
              { value: "comentarios", label: "Comentarios" },
            ]}
          />
        </Sub>
      </div>
      <Sub title="Cards del cotizador">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4 rounded-md bg-texture-gris p-4">
          {quote.map((q) => (
            <SelectableCard
              key={q.id}
              checked={picked.includes(q.id)}
              onCheckedChange={(on) => setPicked(on ? [...picked, q.id] : picked.filter((p) => p !== q.id))}
              title={q.name}
              description={q.desc}
              meta={`Desde RD$ ${q.price.toLocaleString("es-DO")} / mes`}
            />
          ))}
          <SelectableCard checked={false} onCheckedChange={() => {}} title="Página web" description="Próximamente." disabled />
        </div>
      </Sub>
      <Sub title="Chips de red (toggle)">
        <div className="flex flex-wrap gap-2">
          {networkIds.slice(0, 5).map((n) => (
            <NetworkChip
              key={n}
              network={n}
              selected={nets.includes(n)}
              onClick={() => setNets(nets.includes(n) ? nets.filter((x) => x !== n) : [...nets, n])}
            />
          ))}
        </div>
      </Sub>
      <Sub title="Avatares">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name="Café Aroma" color="coral" size="lg" />
          <Avatar name="Clínica Sonrisa" color="cyan" size="lg" />
          <Avatar name="Torre Mar" color="ink" size="lg" />
          <Avatar name="Dagoberto Nuñez" color="ocean" size="lg" />
          <Avatar name="Peek Media" color="ocean" size="md" ring />
          <LogoMark size={48} />
          <Avatar name="Ana" size="xs" />
          <Avatar name="Ana Ruiz" size="sm" color="cyan" />
        </div>
      </Sub>
    </Section>
  );
}

/* ───────────── Datos ───────────── */

const followers = Array.from({ length: 90 }, (_, i) => ({
  label: new Date(2026, 5, 25 + i).toLocaleDateString("es-DO", { day: "numeric", month: "short" }),
  value: Math.round(4200 + i * 14 + Math.sin(i / 5) * 60 + Math.cos(i / 2.3) * 25),
}));

const sparks = [
  [4200, 4310, 4290, 4480, 4620, 4700, 4910, 5120, 5436],
  [2050, 2040, 2071, 2066, 2080, 2092, 2088, 2101, 2108],
  [900, 880, 874, 860, 851, 838, 830, 821, 812],
];

function DataSection() {
  const [kpiLoading, setKpiLoading] = useState(false);
  return (
    <Section
      id="datos"
      title="Datos"
      intro="Cada número dice su fuente y la hora de actualización. Pasa el mouse o enfoca la ⓘ para ver cómo se calcula."
    >
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setKpiLoading((v) => !v)}>
          {kpiLoading ? "Ver datos" : "Ver estado de carga"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-4 rounded-md bg-sand p-4">
        <KpiCard label="Seguidores" value="5,436" delta={8.2} source="Instagram · hace 2 h" loading={kpiLoading} />
        <KpiCard label="Alcance" value="48.1K" delta={-4.3} definition="Cuentas únicas que vieron tu contenido en el período." source="Meta · hace 2 h" loading={kpiLoading} />
        <KpiCard label="Interacción" value="3.9%" delta={0.6} definition="Interacciones / alcance." source="Meta · hace 2 h" loading={kpiLoading} />
        <KpiCard label="Publicaciones" value="14" deltaLabel="3 programadas" source="Peek" loading={kpiLoading} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card variant="outline">
          <CardHeader>
            <CardTitle>Seguidores · 90 días</CardTitle>
            <TrendPill value={29.6} />
          </CardHeader>
          <LineChart data={followers} summary="Seguidores de Instagram en 90 días: de 4,200 a 5,436, tendencia al alza." />
        </Card>
        <div className="flex flex-col gap-4">
          {(["instagram", "facebook", "tiktok"] as const).map((n, i) => (
            <Card key={n} variant="outline" padding="sm" className="flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-label font-semibold">
                  <NetworkChip network={n} className="border-0 p-0" />
                </span>
                <span className="font-display text-h3 font-bold">{["5,436", "2,108", "812"][i]}</span>
              </div>
              <Sparkline label={`Tendencia de ${networks[n].label}`} values={sparks[i]} />
            </Card>
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Table>
          <caption className="sr-only">Resumen por red del mes</caption>
          <THead>
            <tr>
              <TH>Red</TH>
              <TH className="text-right">Seguidores</TH>
              <TH className="text-right">Crecimiento</TH>
              <TH className="text-right">Alcance</TH>
              <TH>Estado</TH>
            </tr>
          </THead>
          <TBody>
            {[
              ["instagram", "5,436", 8.2, "32.4K", "connected"],
              ["facebook", "2,108", 1.1, "15.7K", "connected"],
              ["tiktok", "—", 0, "—", "waiting"],
            ].map(([n, f, g, r, st]) => (
              <TR key={n as string}>
                <TD>
                  <NetworkChip network={n as Network} className="border-0 p-0" />
                </TD>
                <TD className="text-right tabular-nums">{f}</TD>
                <TD className="text-right">{g ? <TrendPill value={g as number} /> : "—"}</TD>
                <TD className="text-right tabular-nums">{r}</TD>
                <TD>
                  <StatusBadge kind="connection" status={st as keyof typeof connectionStatus} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <Card variant="outline" className="gap-5">
          <CardTitle>Uso del mes</CardTitle>
          <UsageBar label="Publicaciones" used={9} total={16} />
          <UsageBar label="Reels" used={6} total={6} />
          <UsageBar label="Historias" used={4} total={16} />
        </Card>
      </div>
    </Section>
  );
}

/* ───────────── Diálogos y avisos ───────────── */

function OverlaysSection() {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return (
    <Section
      id="overlays"
      title="Diálogos y avisos"
      intro="Reemplazan prompt() y confirm(). Atrapan el foco, cierran con Esc y devuelven el foco al botón. Cada acción avisa con un toast que permite deshacer."
    >
      <div className="flex flex-wrap gap-3">
        <Button variant="dark" onClick={() => setModal(true)}>
          Abrir modal
        </Button>
        <Button variant="outline" onClick={() => setDrawer(true)}>
          Pedir cambios (drawer)
        </Button>
        <Button variant="destructive" onClick={() => setConfirm(true)}>
          Quitar acceso
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast({
              title: "Publicación aprobada",
              description: "Se programará para el viernes a las 6:00 p. m.",
              tone: "success",
              action: { label: "Deshacer", onClick: () => toast({ title: "Aprobación deshecha" }) },
            })
          }
        >
          Toast con Deshacer
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast({ title: "No pudimos publicar en TikTok", description: "El token venció. Vuelve a conectar la cuenta.", tone: "error" })}
        >
          Toast de error
        </Button>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Invitar a una persona"
        description="Recibirá un código propio para entrar al espacio de Café Aroma."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setModal(false);
                toast({ title: "Invitación enviada", tone: "success" });
              }}
            >
              Enviar invitación
            </Button>
          </>
        }
      >
        <Field label="Nombre" required>
          <Input autoFocus placeholder="Ej. Laura Gómez" />
        </Field>
        <Field label="Email" required>
          <Input type="email" placeholder="laura@cafearoma.do" />
        </Field>
      </Modal>

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Pedir cambios"
        description="Carrusel · Menú de temporada · v2"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawer(false)}>
              Cancelar
            </Button>
            <Button
              variant="dark"
              onClick={() => {
                setDrawer(false);
                toast({ title: "Cambios pedidos", description: "El equipo recibió tu comentario.", action: { label: "Deshacer", onClick: () => {} } });
              }}
            >
              Enviar comentario
            </Button>
          </>
        }
      >
        <Field label="¿Qué hay que cambiar?">
          <Textarea rows={5} placeholder="Ej. El precio del latte es RD$ 250, no 225." />
        </Field>
        <div className="flex flex-col gap-3">
          <h3 className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">Historial de versiones</h3>
          {[
            ["v2", "Hoy, 10:14 a. m.", "Equipo Peek", "pending"],
            ["v1", "Ayer, 4:30 p. m.", "Ana (cliente)", "changes"],
          ].map(([v, when, who, st]) => (
            <div key={v} className="flex items-center justify-between gap-3 rounded-item bg-hairline px-4 py-3">
              <div className="flex flex-col">
                <span className="text-label font-bold">
                  {v} · {who}
                </span>
                <span className="text-caption text-muted">{when}</span>
              </div>
              <StatusBadge kind="post" status={st as keyof typeof postStatus} />
            </div>
          ))}
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="¿Quitar el acceso de Laura?"
        description="Ya no podrá entrar al espacio de Café Aroma. Puedes invitarla de nuevo cuando quieras."
        confirmLabel="Quitar acceso"
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 700));
          toast({ title: "Acceso quitado", action: { label: "Deshacer", onClick: () => toast({ title: "Acceso restaurado", tone: "success" }) } });
        }}
      />
    </Section>
  );
}

/* ───────────── Vacío, carga y error ───────────── */

function EmptySection() {
  return (
    <Section id="vacios" title="Vacío, carga y error" intro="Toda vista tiene los tres. El estado vacío dice qué falta y ofrece el siguiente paso.">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
        <EmptyState
          icon={Camera}
          title="Conecta Instagram"
          description="Cuando conectes la cuenta verás aquí seguidores, alcance e interacción."
          action={
            <Button size="sm" iconLeft={<Plug className="size-4" />}>
              Conectar con Instagram
            </Button>
          }
        />
        <LoadingState label="Sincronizando métricas…" className="rounded-md border-[1.5px] border-dashed border-line" />
        <ErrorState
          title="El token venció"
          description="Instagram pidió que vuelvas a autorizar la conexión. Tus datos siguen guardados."
          action={
            <Button variant="dark" size="sm">
              Reconectar
            </Button>
          }
        />
      </div>
    </Section>
  );
}

/* ───────────── Movimiento ───────────── */

function MotionSection() {
  const faq = [
    { id: "a", question: "¿Cuánto tiempo toma ver resultados?", answer: "Depende de tu punto de partida. En el diagnóstico te damos una meta realista para los primeros 90 días." },
    { id: "b", question: "¿Necesito firmar un contrato largo?", answer: "No. Puedes empezar mes a mes." },
  ];
  return (
    <Section
      id="movimiento"
      title="Movimiento"
      intro="0.2–0.35 s para la interfaz; 0.8 s con cubic-bezier(.2,.8,.2,1) para el reveal. Con prefers-reduced-motion todo se detiene."
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
        <MotionTile label="Pulso · 2.4 s">
          <span className="size-5 animate-pulse-dot rounded-full bg-coral" />
        </MotionTile>
        <MotionTile label="Escribiendo · 1.2 s">
          <span className="flex gap-1.5 rounded-full bg-surface px-4 py-3">
            {[0, 200, 400].map((d) => (
              <span key={d} className="size-2 animate-typing rounded-full bg-ink" style={{ animationDelay: `${d}ms` }} />
            ))}
          </span>
        </MotionTile>
        <MotionTile label="Flotación · 4 s">
          <span className="animate-float rounded-2xl rounded-bl-sm bg-surface px-4 py-2.5 text-label font-semibold shadow-elevated">
            ¿Y si esta fuera tu marca?
          </span>
        </MotionTile>
        <MotionTile label="Hover lift · .3 s">
          <Card interactive padding="sm" className="text-label font-semibold ring-1 ring-hairline">
            Pasa el mouse
          </Card>
        </MotionTile>
      </div>
      <div className="-mx-6 overflow-hidden py-4 sm:-mx-8" aria-hidden>
        <div className="-rotate-[1.2deg] bg-coral py-[22px]">
          <div className="flex w-max animate-marquee font-display text-[clamp(28px,3.6vw,48px)] font-bold whitespace-nowrap text-white">
            {[0, 1].map((k) => (
              <span key={k} className="flex items-center gap-8 pr-8">
                Haz que te vean <Dot /> Haz que te recuerden <Dot /> Ideas que encuentran a su gente <Dot /> Estrategia · Contenido ·
                Resultados <Dot />
              </span>
            ))}
          </div>
        </div>
      </div>
      <Sub title="Acordeón (FAQ)">
        <Accordion items={faq} />
      </Sub>
      <CardDescription>
        El marquee usa texto blanco sobre coral: es texto grande (≥ 24px bold), donde AA pide 3:1 y da 3.05:1. En botones y texto
        normal va ink.
      </CardDescription>
    </Section>
  );
}

function Dot() {
  return <span className="inline-block size-3 rounded-full bg-white" />;
}

function MotionTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid h-32 place-items-center rounded-md bg-sand">{children}</div>
      <p className="text-caption font-semibold text-muted">{label}</p>
    </div>
  );
}
