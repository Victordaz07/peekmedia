"use client";

import { Check, Copy, KeyRound, Mail, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Checkbox,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  Segmented,
  Select,
  StatusBadge,
  Textarea,
  useToast,
} from "@/components/ui";
import { clientRoleHelp, clientRoleLabel, clientRoles, type Client, type ClientRole, type ClientUser, type Note, type Task } from "@/lib/clients/schema";
import { formatDateTimeRD } from "@/lib/format";
import {
  addNoteAction,
  addTaskAction,
  deleteNoteAction,
  deleteTaskAction,
  inviteAction,
  regenerateCodeAction,
  removeAccessAction,
  setAccessActiveAction,
  setAccessRoleAction,
  setTaskDoneAction,
} from "../actions";
import { ClientForm } from "../client-form";

type Tab = "data" | "access" | "crm";

export function ClientFicha({
  client,
  users,
  notes,
  tasks,
  initialTab,
}: {
  client: Client;
  users: ClientUser[];
  notes: Note[];
  tasks: Task[];
  initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const { id, createdAt, ...input } = client;
  return (
    <div className="flex flex-col gap-5">
      <Segmented
        label="Secciones de la ficha"
        value={tab}
        onChange={setTab}
        className="self-start"
        options={[
          { value: "data", label: "Datos" },
          { value: "access", label: "Accesos", badge: users.length || undefined },
          { value: "crm", label: "Notas y tareas" },
        ]}
      />
      {tab === "data" && (
        <Card padding="lg">
          <ClientForm key={createdAt} clientId={id} initial={input} />
        </Card>
      )}
      {tab === "access" && <AccessPanel client={client} users={users} />}
      {tab === "crm" && <CrmPanel clientId={id} notes={notes} tasks={tasks} />}
    </div>
  );
}

/* ───────── Accesos ───────── */

type Shown = { name: string; code: string; text: string; mailed: boolean };

function AccessPanel({ client, users }: { client: Client; users: ClientUser[] }) {
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", role: "admin" as ClientRole });
  const [formError, setFormError] = useState<{ field?: string; message: string } | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [removing, setRemoving] = useState<ClientUser | null>(null);
  const [pending, start] = useTransition();

  function invite(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await inviteAction(client.id, form);
      if (!res.ok) {
        setFormError({ field: res.field, message: res.error });
        return;
      }
      setShown({ name: form.name, code: res.code, text: res.text, mailed: res.mailed });
      setForm({ name: "", email: "", role: "admin" });
      setFormError(null);
      router.refresh();
    });
  }

  function regenerate(u: ClientUser) {
    start(async () => {
      const res = await regenerateCodeAction(u.id);
      if (!res.ok) return toast({ title: res.error, tone: "error" });
      setShown({ name: u.name, code: res.code, text: res.text, mailed: false });
      router.refresh();
    });
  }

  function toggle(u: ClientUser) {
    start(async () => {
      const res = await setAccessActiveAction(u.id, !u.active);
      if (!res.ok) return toast({ title: res.error, tone: "error" });
      toast({
        title: u.active ? `${u.name} ya no puede entrar` : `${u.name} puede entrar de nuevo`,
        action: { label: "Deshacer", onClick: () => setAccessActiveAction(u.id, u.active).then(() => router.refresh()) },
      });
      router.refresh();
    });
  }

  function changeRole(u: ClientUser, role: string) {
    start(async () => {
      const res = await setAccessRoleAction(u.id, role);
      if (!res.ok) return toast({ title: res.error, tone: "error" });
      toast({ title: `${u.name} ahora es ${clientRoleLabel[role as ClientRole]}` });
      router.refresh();
    });
  }

  return (
    <Card className="gap-5">
      <div className="flex flex-col gap-1.5">
        <CardTitle>Accesos</CardTitle>
        <CardDescription>
          Cada persona entra con su correo y un código propio.{" "}
          {clientRoles.map((r) => (
            <span key={r}>
              <strong>{clientRoleLabel[r]}</strong>: {clientRoleHelp[r].toLowerCase()}{" "}
            </span>
          ))}
        </CardDescription>
      </div>

      {users.length === 0 ? (
        <p className="rounded-item border-[1.5px] border-dashed border-ink/25 p-5 text-center text-label text-muted">
          Aún no hay accesos. Invita a alguien del equipo del cliente.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-item border-[1.5px] border-hairline p-4">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex flex-wrap items-center gap-2 text-button font-bold">
                  {u.name}
                  <StatusBadge kind="access" status={u.active ? "active" : "inactive"} />
                </p>
                <p className="truncate text-caption text-muted">
                  {u.email} · código generado el {formatDateTimeRD(u.codeUpdatedAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select aria-label={`Rol de ${u.name}`} value={u.role} onChange={(e) => changeRole(u, e.target.value)} className="w-auto py-2 text-label" disabled={pending}>
                  {clientRoles.map((r) => (
                    <option key={r} value={r}>
                      {clientRoleLabel[r]}
                    </option>
                  ))}
                </Select>
                <Button variant="outline" size="sm" iconLeft={<KeyRound className="size-4" />} onClick={() => regenerate(u)} disabled={pending}>
                  Nuevo código
                </Button>
                <Button variant="secondary" size="sm" onClick={() => toggle(u)} disabled={pending}>
                  {u.active ? "Desactivar" : "Activar"}
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Quitar acceso de ${u.name}`} onClick={() => setRemoving(u)} className="hover:bg-coral-tint">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={invite} noValidate className="grid items-end gap-3 rounded-item bg-sand p-4 md:grid-cols-[1fr_1.2fr_1fr_auto]">
        <Field label="Nombre" error={formError?.field === "name" ? formError.message : undefined}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Ana Pérez" autoComplete="off" />
        </Field>
        <Field label="Correo" error={formError?.field === "email" ? formError.message : undefined}>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ana@negocio.com" autoComplete="off" />
        </Field>
        <Field label="Rol">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ClientRole })}>
            {clientRoles.map((r) => (
              <option key={r} value={r}>
                {clientRoleLabel[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" variant="dark" loading={pending} iconLeft={<UserPlus className="size-4" />}>
          Invitar
        </Button>
        {formError && !formError.field && <p className="text-caption font-semibold text-coral-strong md:col-span-4">{formError.message}</p>}
      </form>

      <p className="flex items-start gap-2 rounded-item bg-hairline px-4 py-3 text-caption">
        <KeyRound aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        Por seguridad, el código se muestra una sola vez. Si alguien lo pierde, genera uno nuevo: el anterior deja de funcionar.
      </p>

      <CodeModal shown={shown} onClose={() => setShown(null)} />
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={`¿Quitar el acceso de ${removing?.name ?? ""}?`}
        description={`Ya no podrá entrar al espacio de ${client.name}. Si firmó un contrato, la firma se conserva. Puedes invitarla de nuevo cuando quieras.`}
        confirmLabel="Quitar acceso"
        onConfirm={async () => {
          if (!removing) return;
          const res = await removeAccessAction(removing.id);
          if (!res.ok) toast({ title: res.error, tone: "error" });
          else toast({ title: `Acceso de ${removing.name} quitado` });
          router.refresh();
        }}
      />
    </Card>
  );
}

function CodeModal({ shown, onClose }: { shown: Shown | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal
      open={shown !== null}
      onClose={() => {
        setCopied(false);
        onClose();
      }}
      title={`Código de ${shown?.name ?? ""}`}
      description={shown?.mailed ? "Le enviamos la invitación por correo. Guarda o copia el código: no se vuelve a mostrar." : "Copia la invitación y envíasela por WhatsApp o correo. El código no se vuelve a mostrar."}
      footer={
        <Button
          variant="dark"
          iconLeft={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          onClick={async () => {
            if (!shown) return;
            await navigator.clipboard?.writeText(shown.text).catch(() => {});
            setCopied(true);
          }}
        >
          {copied ? "Invitación copiada" : "Copiar invitación"}
        </Button>
      }
    >
      {shown && (
        <>
          <p className="rounded-item bg-sand py-5 text-center font-mono text-[32px] font-bold tracking-[0.16em]" aria-label={`Código ${shown.code.split("").join(" ")}`}>
            {shown.code}
          </p>
          {shown.mailed && (
            <Badge tone="info" className="self-start">
              <Mail aria-hidden className="size-3.5" /> Invitación enviada por correo
            </Badge>
          )}
          <pre className="rounded-item bg-hairline p-4 font-sans text-label whitespace-pre-wrap">{shown.text}</pre>
        </>
      )}
    </Modal>
  );
}

/* ───────── Notas y tareas ───────── */

function CrmPanel({ clientId, notes, tasks }: { clientId: string; notes: Note[]; tasks: Task[] }) {
  const toast = useToast();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [task, setTask] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return toast({ title: res.error ?? "No se pudo guardar", tone: "error" });
      after?.();
      router.refresh();
    });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Tareas</CardTitle>
          <CardDescription>Pendientes del equipo con este cliente. El cliente no las ve.</CardDescription>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addTaskAction(clientId, task), () => setTask(""));
          }}
        >
          <Input aria-label="Nueva tarea" value={task} onChange={(e) => setTask(e.target.value)} placeholder="Ej. Pedir el logo en alta" />
          <Button type="submit" variant="dark" disabled={pending || !task.trim()}>
            Añadir
          </Button>
        </form>
        {tasks.length === 0 ? (
          <p className="text-label text-muted">Sin tareas.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-hairline">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <Checkbox
                  label={<span className={t.done ? "text-muted line-through" : undefined}>{t.text}</span>}
                  checked={t.done}
                  onChange={(e) => run(() => setTaskDoneAction(clientId, t.id, e.target.checked))}
                />
                <Button variant="ghost" size="icon" aria-label={`Borrar tarea: ${t.text}`} onClick={() => run(() => deleteTaskAction(clientId, t.id))}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Notas internas</CardTitle>
          <CardDescription>Contexto para el equipo: acuerdos, gustos, cosas a evitar.</CardDescription>
        </div>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addNoteAction(clientId, note), () => setNote(""));
          }}
        >
          <Textarea aria-label="Nueva nota" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Prefiere que no usemos emojis en los captions." />
          <Button type="submit" variant="dark" size="sm" className="self-end" disabled={pending || !note.trim()}>
            Guardar nota
          </Button>
        </form>
        {notes.length === 0 ? (
          <p className="text-label text-muted">Sin notas.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {notes.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-3 rounded-item bg-hairline/60 p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-body whitespace-pre-line">{n.text}</p>
                  <p className="text-caption text-muted">
                    {n.by} · {formatDateTimeRD(n.at)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label="Borrar nota" onClick={() => run(() => deleteNoteAction(clientId, n.id))}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
