import { Check, X } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState, NetworkDot } from "@/components/ui";
import { requireTeam } from "@/lib/auth";
import { networks } from "@/lib/design/tokens";
import { capabilities, providerOf } from "@/lib/social/platforms";

export const metadata: Metadata = { title: "Conexiones y API" };

export default function ConexionesPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-display-sm font-bold tracking-[-0.04em]">Conexiones y API</h1>
        <p className="max-w-[65ch] text-body text-muted">
          Qué se puede y qué no se puede hacer en cada red por su API oficial. Instagram y Facebook van directo con Meta; el resto, por Ayrshare.
        </p>
      </header>
      <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
        <Matrix />
      </Suspense>
    </>
  );
}

async function Matrix() {
  await requireTeam();
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
      {capabilities.map((c) => (
        <section key={c.id} className="flex flex-col gap-4 rounded-md bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-h3 font-bold">
              <NetworkDot network={c.id} className="size-3" />
              {networks[c.id].label}
            </h2>
            <span className="shrink-0 rounded-full bg-sand px-2.5 py-1 text-eyebrow font-bold">{providerOf[c.id] === "meta" ? "API de Meta" : "Ayrshare"}</span>
          </div>
          <List items={c.can} ok label="Se puede" />
          <hr className="border-hairline" />
          <List items={c.cannot} label="No se puede" />
          <p className="mt-auto rounded-item bg-sand px-3 py-2.5 text-eyebrow leading-[1.45]">
            <strong>Requisitos:</strong> {c.req}
          </p>
        </section>
      ))}
    </div>
  );
}

function List({ items, ok, label }: { items: string[]; ok?: boolean; label: string }) {
  const Icon = ok ? Check : X;
  return (
    <ul aria-label={label} className="flex flex-col gap-2 text-label">
      {items.map((i) => (
        <li key={i} className="flex items-start gap-2">
          <Icon aria-hidden className={ok ? "mt-0.5 size-4 shrink-0 text-cyan" : "mt-0.5 size-4 shrink-0 text-coral-strong"} />
          {i}
        </li>
      ))}
    </ul>
  );
}
