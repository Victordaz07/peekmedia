import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar, ButtonLink } from "@/components/ui";
import type { Client } from "@/lib/clients/schema";
import { cn } from "@/lib/cn";
import { listClientUsers } from "@/lib/data/clients";

/** Gestión de clientes como el prototipo: aviso, lista a la izquierda y la ficha (o el resumen) a la derecha. */
export async function ClientsSplit({ clients, selectedId, children }: { clients: Client[]; selectedId: string | null; children: ReactNode }) {
  const counts = await Promise.all(clients.map((c) => listClientUsers(c.id).then((u) => u.length)));
  return (
    <>
      <p className="flex items-start gap-4 rounded-md bg-ink p-6 text-body text-white">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cyan text-ink">
          <ShieldCheck aria-hidden className="size-4" />
        </span>
        Cada cliente tiene su propio espacio separado. Sus publicaciones, métricas, mensajes, notas y accesos se guardan aparte, y cada persona que invitas solo
        puede entrar al espacio de su cliente.
      </p>
      <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <nav aria-label="Clientes" className="flex flex-col gap-2.5 rounded-md bg-surface p-4">
          <ButtonLink href="/app/clientes/nuevo" className="w-full">
            + Nuevo cliente
          </ButtonLink>
          {clients.map((c, i) => (
            <Link
              key={c.id}
              href={`/app/clientes/${c.id}`}
              aria-current={c.id === selectedId ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-item border-[1.5px] p-3 transition-colors",
                c.id === selectedId ? "border-ink bg-sand" : "border-hairline hover:border-ink/30",
              )}
            >
              <Avatar name={c.name} color={c.avatarColor} size="md" />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-display text-[17px] font-bold">{c.name}</span>
                <span className="truncate text-caption">
                  {[c.industry, `${counts[i]} ${counts[i] === 1 ? "acceso" : "accesos"}`].filter(Boolean).join(" · ")}
                  {c.status !== "active" && ` · ${c.status === "prospect" ? "Prospecto" : c.status === "paused" ? "Pausado" : "Finalizado"}`}
                </span>
              </span>
            </Link>
          ))}
          {!clients.length && <p className="p-2 text-label text-muted">Todavía no hay clientes. Crea el primero.</p>}
        </nav>
        <div className="flex min-w-0 flex-col gap-5">{children}</div>
      </div>
    </>
  );
}
