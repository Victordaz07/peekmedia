import { Check, X } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, LoadingState, NetworkDot } from "@/components/ui";
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
    <div className="grid gap-4 lg:grid-cols-2">
      {capabilities.map((c) => (
        <Card key={c.id} className="gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-h3 font-bold">
              <NetworkDot network={c.id} className="size-3" />
              {networks[c.id].label}
            </h2>
            <span className="rounded-full bg-hairline px-3 py-1 text-caption font-semibold">{providerOf[c.id] === "meta" ? "API de Meta" : "Ayrshare"}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <List title="Se puede" items={c.can} ok />
            <List title="No se puede" items={c.cannot} />
          </div>
          <p className="rounded-item bg-hairline/60 px-4 py-3 text-caption">
            <strong>Requisitos:</strong> {c.req}
          </p>
        </Card>
      ))}
    </div>
  );
}

function List({ title, items, ok }: { title: string; items: string[]; ok?: boolean }) {
  const Icon = ok ? Check : X;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-eyebrow font-bold tracking-[0.12em] text-muted uppercase">{title}</h3>
      <ul className="flex flex-col gap-1.5 text-label">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2">
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
