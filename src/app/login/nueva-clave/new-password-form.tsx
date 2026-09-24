"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { saveNewPassword, type NewPasswordState } from "../actions";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<NewPasswordState, FormData>(saveNewPassword, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Contraseña nueva" hint="Al menos 10 caracteres. Guárdala en tu gestor de contraseñas.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Field label="Repítela" error={state.error}>
        <Input name="confirm" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Guardar y entrar
      </Button>
    </form>
  );
}
