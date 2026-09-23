import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { networks } from "@/lib/design/tokens";
import { listAccounts, peekPending } from "@/lib/data/social";
import { integrations } from "@/lib/integrations/config";
import type { MetaPage } from "@/lib/integrations/meta";
import { manualAccess, permissions, providerOf } from "@/lib/social/platforms";
import type { ConnectionMode } from "@/lib/social/schema";
import { space } from "../space";
import { ConnectView, type NetCard } from "./connect-view";

export const metadata: Metadata = { title: "Conectar cuentas" };

const errors: Record<string, string> = {
  cancelado: "Cancelaste la conexión. Cuando quieras, vuelve a tocar “Conectar”.",
  "sin-paginas": "Tu usuario de Facebook no administra ninguna página. Crea la página del negocio o pide que te hagan administrador.",
  meta: "Meta no respondió bien. Intenta de nuevo en unos minutos.",
};

export default function ConectarPage({ params, searchParams }: PageProps<"/app/c/[clientId]/conectar">) {
  return (
    <Suspense fallback={<LoadingState className="rounded-md bg-surface" />}>
      <Conectar params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Conectar({ params, searchParams }: Pick<PageProps<"/app/c/[clientId]/conectar">, "params" | "searchParams">) {
  const s = await space(params, searchParams);
  const cfg = integrations();
  const accounts = await listAccounts(s.client.id);

  /** Cómo se conectará cada red con lo configurado ahora mismo. */
  const via = (n: (typeof s.client.platforms)[number]): ConnectionMode | null => {
    if (providerOf[n] === "meta" && cfg.meta) return "meta";
    if (providerOf[n] === "ayrshare" && cfg.ayrshare) return "ayrshare";
    if (cfg.demo) return "demo";
    return manualAccess[n] ? "manual" : null;
  };

  const cards: NetCard[] = s.client.platforms.map((n) => {
    const a = accounts.find((x) => x.platform === n);
    return {
      network: n,
      status: a?.status ?? "none",
      mode: a?.mode ?? null,
      via: via(n),
      accountName: a?.accountName ?? "",
      connectedAt: a?.connectedAt ?? null,
      error: a?.error ?? null,
      permissions: permissions[n],
    };
  });

  const elegir = s.one("elegir");
  const pages = elegir && s.canManage ? await peekPending<MetaPage[]>(elegir, s.client.id) : null;

  return (
    <ConnectView
      clientId={s.client.id}
      cards={cards}
      canManage={s.canManage && !s.preview}
      isTeam={s.isTeam}
      flash={s.one("conectado") ? `¡${networks.facebook.label} e ${networks.instagram.label} conectados!` : null}
      error={errors[s.one("error") ?? ""] ?? null}
      chooser={elegir ? { pendingId: elegir, pages: (pages ?? []).map((p) => ({ id: p.id, name: p.name, ig: p.ig?.username ?? null })) } : null}
    />
  );
}
