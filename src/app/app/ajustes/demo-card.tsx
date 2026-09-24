"use client";

import { useState } from "react";
import { Button, Card, CardTitle, ConfirmDialog, Table, TBody, TD, TH, THead, TR, useToast } from "@/components/ui";
import type { DemoAccess } from "@/lib/demo/seed";
import { clearDemoAction, loadDemoAction } from "./actions";

/** Cargar o borrar los datos de ejemplo para enseñarle el panel al cliente. */
export function DemoCard({ loaded, accesses }: { loaded: boolean; accesses: DemoAccess[] }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState<"load" | "clear" | null>(null);

  async function load() {
    const res = await loadDemoAction();
    if (res.ok) toast({ title: "Demostración cargada", description: "Ya puedes recorrer los tres clientes de ejemplo.", tone: "success" });
    else toast({ title: res.error, tone: "error" });
  }

  async function clear() {
    const res = await clearDemoAction();
    if (res.ok) toast({ title: "Demostración borrada", description: `Se quitaron ${res.clients} clientes y ${res.leads} prospectos de ejemplo.`, tone: "success" });
    else toast({ title: res.error, tone: "error" });
  }

  return (
    <Card className="gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle>Datos de demostración</CardTitle>
        <p className="text-label text-muted">
          Tres clientes de ejemplo (Café Colonial, Clínica Sonrisa y Torre Mar) con accesos, contratos, redes con métricas, bandeja, publicaciones y
          prospectos. Sirven para enseñar el panel funcionando. Cuando termines, bórralos: no tocan a tus clientes reales.
        </p>
      </div>

      {loaded ? (
        <>
          <p className="rounded-item bg-cyan-tint px-4 py-3 text-label">
            La demostración está cargada. Entra como cliente en <strong>/login</strong>, pestaña “Soy cliente”, con estos accesos:
          </p>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH>Persona</TH>
                  <TH>Correo</TH>
                  <TH>Código</TH>
                </TR>
              </THead>
              <TBody>
                {accesses.map((a) => (
                  <TR key={a.email}>
                    <TD>{a.client}</TD>
                    <TD>
                      {a.name}
                      <span className="block text-caption text-muted">{a.role}</span>
                    </TD>
                    <TD className="font-mono text-caption select-all">{a.email}</TD>
                    <TD className="font-mono text-caption tracking-[0.08em] select-all">{a.code}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <Button variant="destructive" className="self-start" onClick={() => setConfirm("clear")}>
            Borrar la demostración
          </Button>
        </>
      ) : (
        <Button className="self-start" onClick={() => setConfirm("load")}>
          Cargar la demostración
        </Button>
      )}

      <ConfirmDialog
        open={confirm === "load"}
        onClose={() => setConfirm(null)}
        onConfirm={load}
        variant="primary"
        title="¿Cargar la demostración?"
        description="Se crean tres clientes de ejemplo con sus accesos y datos. Tarda unos segundos."
        confirmLabel="Cargar"
      />
      <ConfirmDialog
        open={confirm === "clear"}
        onClose={() => setConfirm(null)}
        onConfirm={clear}
        title="¿Borrar la demostración?"
        description="Se borran los clientes de ejemplo con todo lo suyo (accesos, contratos, métricas y publicaciones) y los prospectos de ejemplo. Tus clientes reales no se tocan."
        confirmLabel="Borrar"
      />
    </Card>
  );
}
