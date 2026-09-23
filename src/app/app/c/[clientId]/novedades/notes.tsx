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
      className="flex flex-col gap-2"
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
      <Field label="Nueva nota para el cliente" error={error ?? undefined}>
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej. Este mes probamos reels con recetas: el alcance subió 18%." />
      </Field>
      <Button type="submit" size="sm" variant="dark" loading={pending} disabled={!text.trim()} className="self-start">
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
