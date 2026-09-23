"use client";

import { Check, ExternalLink, PlugZap, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, Field, Input, Modal, NetworkDot, StatusBadge, UsageBar, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { networks, type Network } from "@/lib/design/tokens";
import { formatDateTimeRD } from "@/lib/format";
import type { ConnectionMode, ConnectionStatus } from "@/lib/social/schema";
import { choosePageAction, confirmManualAction, disconnectAction, markDoneAction, startConnectAction } from "./actions";

export type NetCard = {
  network: Network;
  status: ConnectionStatus;
  mode: ConnectionMode | null;
  via: ConnectionMode | null;
  accountName: string;
  connectedAt: string | null;
  error: string | null;
  permissions: string[];
};

const modeLabel: Record<ConnectionMode, string> = {
  meta: "Conexión directa con Meta",
  ayrshare: "Conexión segura vía Ayrshare",
  manual: "Acceso como socio",
  demo: "Modo demo",
};

export function ConnectView({
  clientId,
  cards,
  canManage,
  isTeam,
  flash,
  error,
  chooser,
}: {
  clientId: string;
  cards: NetCard[];
  canManage: boolean;
  isTeam: boolean;
  flash: string | null;
  error: string | null;
  chooser: { pendingId: string; pages: { id: string; name: string; ig: string | null }[] } | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const [steps, setSteps] = useState<{ network: Network; url: string; steps: string[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const [confirming, setConfirming] = useState<Network | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const done = cards.filter((c) => c.status === "connected").length;
  const base = `/app/c/${clientId}/conectar`;

  function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    start(async () => {
      try {
        await fn();
      } finally {
        setBusy(null);
      }
    });
  }

  const connect = (n: Network) =>
    run(`c-${n}`, async () => {
      const res = await startConnectAction(clientId, n);
      if (!res.ok) return void toast({ title: res.error, tone: "error" });
      const step = res.step;
      if (step.kind === "redirect") return void window.location.assign(step.url);
      if (step.kind === "external") {
        window.open(step.url, "_blank", "noopener");
        setSteps({ network: n, url: step.url, steps: step.steps });
      } else toast({ title: step.message, tone: "success" });
      router.refresh();
    });

  const markDone = (n: Network) =>
    run(`d-${n}`, async () => {
      const res = await markDoneAction(clientId, n);
      if (!res.ok) return void toast({ title: res.error, tone: "error" });
      toast({ title: res.message, tone: "success" });
      setSteps(null);
      router.refresh();
    });

  const disconnect = (n: Network) =>
    run(`x-${n}`, async () => {
      const res = await disconnectAction(clientId, n);
      if (!res.ok) return void toast({ title: res.error, tone: "error" });
      toast({ title: `Quitamos el acceso a ${networks[n].label}.` });
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-5">
      {flash && <p className="flex items-center gap-2 rounded-item bg-cyan-tint px-4 py-3 text-label font-semibold"><Check aria-hidden className="size-4" />{flash}</p>}
      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-item bg-coral-tint px-4 py-3 text-label">
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <Card className="gap-3">
        <p className="font-display text-h3 font-bold">
          {done === cards.length ? "¡Todas tus redes están conectadas!" : `Conecta tus redes para que publiquemos y midamos por ti`}
        </p>
        <UsageBar label="Redes conectadas" used={done} total={cards.length} />
        <p className="text-label">
          Nunca te pedimos tu contraseña: entras en la página oficial de cada red y aceptas los permisos. Puedes quitar el acceso cuando quieras.
        </p>
      </Card>

      {!canManage && (
        <p className="rounded-item bg-hairline px-4 py-3 text-label">Solo un Administrador de tu negocio puede conectar o quitar redes. Aquí ves cómo están.</p>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <li key={c.network}>
            <Card className={cn("h-full gap-3", c.error && "ring-2 ring-coral")}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-display text-h3 font-bold">
                  <NetworkDot network={c.network} className="size-3" />
                  {networks[c.network].label}
                </span>
                <StatusBadge kind="connection" status={c.status} />
              </div>
              {c.status === "connected" ? (
                <p className="text-label">
                  <strong>{c.accountName || "Cuenta conectada"}</strong>
                  <span className="text-muted">
                    {" "}
                    · {c.mode && modeLabel[c.mode]}
                    {c.connectedAt && ` · desde ${formatDateTimeRD(c.connectedAt)}`}
                  </span>
                </p>
              ) : (
                <ul className="flex flex-col gap-1 text-label">
                  {c.permissions.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                      {p}
                    </li>
                  ))}
                </ul>
              )}
              {c.error && <p className="text-label font-semibold text-coral-strong">{c.error}</p>}
              {c.status === "verifying" && <p className="text-caption text-muted">Tu agencia está confirmando que recibió el acceso.</p>}
              {!c.via && c.status === "none" && <p className="text-caption text-muted">Esta red todavía no se puede conectar desde aquí.</p>}

              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                {canManage && (c.status === "none" || c.error) && c.via && (
                  <Button size="sm" iconLeft={<PlugZap className="size-4" />} loading={busy === `c-${c.network}`} onClick={() => connect(c.network)}>
                    {c.error ? "Reconectar" : `Conectar ${networks[c.network].label}`}
                  </Button>
                )}
                {canManage && c.status === "waiting" && (
                  <>
                    <Button size="sm" variant="dark" loading={busy === `d-${c.network}`} onClick={() => markDone(c.network)}>
                      Ya lo hice
                    </Button>
                    <Button size="sm" variant="ghost" loading={busy === `c-${c.network}`} onClick={() => connect(c.network)}>
                      Ver pasos otra vez
                    </Button>
                  </>
                )}
                {isTeam && (c.status === "verifying" || (c.status === "waiting" && c.mode === "manual")) && (
                  <Button size="sm" variant="outline" onClick={() => (setConfirming(c.network), setName(""), setNameError(null))}>
                    Confirmar conexión
                  </Button>
                )}
                {canManage && c.status !== "none" && (
                  <Button size="sm" variant="ghost" loading={busy === `x-${c.network}`} onClick={() => disconnect(c.network)}>
                    Quitar acceso
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Modal
        open={!!steps}
        onClose={() => setSteps(null)}
        title={steps ? `Conectar ${networks[steps.network].label}` : ""}
        description="Sigue estos pasos en la pestaña que se abrió."
        footer={
          steps && (
            <>
              <a href={steps.url} target="_blank" rel="noopener" className="mr-auto inline-flex items-center gap-1.5 text-label font-semibold underline decoration-cyan decoration-2 underline-offset-4">
                Abrir otra vez <ExternalLink aria-hidden className="size-4" />
              </a>
              <Button variant="dark" loading={busy === `d-${steps.network}`} onClick={() => markDone(steps.network)}>
                Ya lo hice
              </Button>
            </>
          )
        }
      >
        {steps && (
          <ol className="flex flex-col gap-3">
            {steps.steps.map((s, i) => (
              <li key={s} className="flex items-start gap-3 text-label">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-coral font-bold text-ink">{i + 1}</span>
                <span className="pt-1">{s}</span>
              </li>
            ))}
          </ol>
        )}
      </Modal>

      <Modal
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title={confirming ? `Confirmar ${networks[confirming].label}` : ""}
        description="Revisa en la red que ya tienes acceso y escribe la cuenta o página."
        footer={
          <Button
            variant="dark"
            loading={busy === "confirm"}
            onClick={() =>
              confirming &&
              run("confirm", async () => {
                const res = await confirmManualAction(clientId, confirming, name);
                if (!res.ok) return void setNameError(res.error);
                setConfirming(null);
                toast({ title: "Conexión confirmada", tone: "success" });
                router.refresh();
              })
            }
          >
            Confirmar
          </Button>
        }
      >
        <Field label="Usuario o página" error={nameError ?? undefined}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="@tu_marca" autoFocus />
        </Field>
      </Modal>

      <Modal
        open={!!chooser}
        onClose={() => router.replace(base)}
        title="¿Cuál es la página del negocio?"
        description="Tu usuario administra varias páginas de Facebook. Elige la del negocio: su Instagram se conecta junto con ella."
      >
        {chooser && chooser.pages.length === 0 && <p className="text-label">La conexión venció. Cierra esto y vuelve a tocar “Conectar”.</p>}
        <ul className="flex flex-col gap-2">
          {chooser?.pages.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={!!busy}
                onClick={() =>
                  run(`p-${p.id}`, async () => {
                    const res = await choosePageAction(clientId, chooser.pendingId, p.id);
                    if (!res.ok) return void toast({ title: res.error, tone: "error" });
                    router.replace(`${base}?conectado=meta`);
                    router.refresh();
                  })
                }
                className="flex w-full items-center justify-between gap-3 rounded-item bg-hairline/60 px-4 py-3 text-left hover:bg-hairline disabled:opacity-45"
              >
                <span>
                  <span className="block text-label font-bold">{p.name}</span>
                  <span className="text-caption text-muted">{p.ig ? `Instagram: @${p.ig}` : "Sin Instagram profesional vinculado"}</span>
                </span>
                {busy === `p-${p.id}` && <span className="text-caption">Conectando…</span>}
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
