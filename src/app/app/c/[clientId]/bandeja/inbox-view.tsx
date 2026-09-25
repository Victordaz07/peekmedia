"use client";

import { Inbox, RefreshCw, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar, Button, EmptyState, Field, NetworkDot, Select, Textarea, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { networks as netTokens, type Network } from "@/lib/design/tokens";
import { formatDateTimeRD } from "@/lib/format";
import { dmWindowOpen, inboxKindLabel, QUICK_REPLIES } from "@/lib/social/inbox";
import type { InboxItem } from "@/lib/social/schema";
import { syncNowAction } from "../conectar/actions";
import { replyAction } from "./actions";

type Filter = "open" | "all" | "comment" | "dm" | "review";

/** "hace 8 min", "hace 5 h", "hace 2 d". */
function ago(iso: string, now: number) {
  const min = Math.max(1, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}

export function InboxView({ clientId, items, networks, now }: { clientId: string; items: InboxItem[]; networks: Network[]; now: number }) {
  const toast = useToast();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [net, setNet] = useState<Network | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, startSend] = useTransition();
  const [syncing, startSync] = useTransition();

  const open = items.filter((i) => !i.reply).length;
  const list = items.filter(
    (i) => (net === "all" || i.platform === net) && (filter === "all" ? true : filter === "open" ? !i.reply : i.kind === filter),
  );
  const item = items.find((i) => i.id === selected) ?? null;
  const windowClosed = item?.kind === "dm" && !dmWindowOpen(item.receivedAt, now);

  function select(id: string) {
    setSelected(id);
    setText("");
    setError(null);
  }

  function send() {
    if (!item) return;
    startSend(async () => {
      const res = await replyAction(item.id, text);
      if (!res.ok) return setError(res.error);
      toast({ title: "Respuesta enviada", tone: "success" });
      setText("");
      router.refresh();
    });
  }

  function sync() {
    startSync(async () => {
      const res = await syncNowAction(clientId);
      if (!res.ok) return toast({ title: res.error, tone: "error" });
      toast({
        title: res.failed.length ? "Actualizado con avisos" : "Bandeja actualizada",
        description: res.failed.length ? res.failed.join(" · ") : undefined,
        tone: res.failed.length ? "error" : "success",
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrar" className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Todos"],
              ["open", `Sin responder (${open})`],
              ["comment", "Comentarios"],
              ["dm", "Mensajes"],
              ["review", "Reseñas"],
            ] as [Filter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn("rounded-full px-4 py-2 text-label font-semibold transition-colors", filter === value ? "bg-ink text-white" : "bg-surface hover:bg-hairline")}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Select aria-label="Red" value={net} onChange={(e) => setNet(e.target.value as Network | "all")} className="w-44">
            <option value="all">Todas las redes</option>
            {networks.map((n) => (
              <option key={n} value={n}>
                {netTokens[n].label}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="secondary" iconLeft={<RefreshCw className={cn("size-4", syncing && "animate-spin")} />} disabled={syncing} onClick={sync}>
            Actualizar
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filter === "open" ? "Todo respondido" : "Nada por aquí"}
          description="Los comentarios, mensajes y reseñas llegan solos por webhook o con la sincronización diaria."
          className="bg-surface"
        />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          <ul className="flex flex-col gap-1 rounded-md bg-surface p-3">
            {list.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => select(i.id)}
                  aria-current={i.id === selected || undefined}
                  className={cn("flex w-full items-start gap-3 rounded-item p-3 text-left transition-colors hover:bg-hairline/60", i.id === selected && "bg-sand/60")}
                >
                  <Avatar name={i.author} color="ocean" size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-button font-bold">{i.author}</span>
                      <span className="shrink-0 text-caption">{ago(i.receivedAt, now)}</span>
                    </span>
                    <span className="line-clamp-2 text-label">{i.text}</span>
                    <span className="flex items-center gap-1.5 text-caption">
                      <NetworkDot network={i.platform} className="size-2" />
                      {netTokens[i.platform].label} · {inboxKindLabel[i.kind]}
                      {!i.reply && <span className="ml-1 size-2 rounded-full bg-coral" aria-label="Sin responder" />}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {item ? (
            <section className="flex flex-col gap-4 rounded-md bg-surface p-5 lg:sticky lg:top-6" aria-label="Detalle">
              <header className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-caption font-semibold text-muted">
                  <NetworkDot network={item.platform} /> {netTokens[item.platform].label} · {inboxKindLabel[item.kind]}
                </span>
                <h2 className="font-display text-h3 font-bold">{item.author}</h2>
                {item.stars != null && (
                  <span className="flex gap-0.5" aria-label={`${item.stars} de 5 estrellas`}>
                    {Array.from({ length: 5 }, (_, n) => (
                      <Star key={n} aria-hidden className={cn("size-4", n < item.stars! ? "fill-ink" : "text-line")} />
                    ))}
                  </span>
                )}
              </header>
              <p className="rounded-item bg-hairline p-4 text-body whitespace-pre-line">{item.text}</p>
              {item.reply ? (
                <div className="flex flex-col gap-1 rounded-item bg-cyan-tint p-4">
                  <span className="text-caption font-semibold">
                    {item.repliedBy} respondió · {item.repliedAt && formatDateTimeRD(item.repliedAt)}
                  </span>
                  <p className="text-label whitespace-pre-line">{item.reply}</p>
                </div>
              ) : windowClosed ? (
                <p className="rounded-item bg-coral-tint p-4 text-label">
                  Pasaron más de 24 h desde el último mensaje. Meta no deja responder por la API: contesta desde la app de {netTokens[item.platform].label}.
                </p>
              ) : (
                <>
                  {item.kind === "dm" && <p className="text-caption text-muted">Mensajes directos: se pueden responder hasta 24 h después del último mensaje de la persona.</p>}
                  <div className="flex flex-wrap gap-2">
                    {QUICK_REPLIES.map((r) => (
                      <button key={r} type="button" onClick={() => setText(r)} className="rounded-full bg-hairline px-3 py-1.5 text-caption font-semibold hover:bg-sand">
                        {r}
                      </button>
                    ))}
                  </div>
                  <Field label="Tu respuesta" error={error ?? undefined}>
                    <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
                  </Field>
                  <Button className="self-start" loading={sending} disabled={!text.trim()} onClick={send}>
                    Responder
                  </Button>
                </>
              )}
            </section>
          ) : (
            <p className="hidden rounded-md bg-surface p-12 text-center text-body lg:block">Selecciona un mensaje o comentario.</p>
          )}
        </div>
      )}
    </div>
  );
}
