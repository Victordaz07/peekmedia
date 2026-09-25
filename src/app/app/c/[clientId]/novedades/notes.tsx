"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Textarea, useToast } from "@/components/ui";
import { addClientNoteAction, deleteClientNoteAction } from "./actions";

export function NoteComposer({ clientId }: { clientId: string }) {
  const toast = useToast();
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-center gap-4 rounded-md bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await addClientNoteAction(clientId, text);
          if (!res.ok) return setError(res.error);
          setText("");
          setError(null);
          toast({ title: "Nota publicada. El cliente ya la ve.", tone: "success" });
          router.refresh();
        });
      }}
    >
      <Field label={<span className="sr-only">Nota para el cliente</span>} error={error ?? undefined} className="min-w-0 flex-1 basis-[320px]">
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Deja una nota para el cliente (ej. “Esta semana probamos reels de 15 s”)" />
      </Field>
      <Button type="submit" variant="dark" loading={pending} disabled={!text.trim()}>
        Publicar nota
      </Button>
    </form>
  );
}

export function DeleteNote({ clientId, noteId }: { clientId: string; noteId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Borrar nota"
      disabled={pending}
      onClick={() => start(async () => void (await deleteClientNoteAction(clientId, noteId), router.refresh()))}
      className="rounded-sm p-1 hover:bg-hairline disabled:opacity-45"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
