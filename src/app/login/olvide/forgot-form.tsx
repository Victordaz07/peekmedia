"use client";

import { useActionState } from "react";
import { Button, ButtonLink, Field, Input } from "@/components/ui";
import { requestPasswordReset, type ResetState } from "../actions";
import { AuthCard, Notice } from "../login-card";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(requestPasswordReset, {});
  return (
    <AuthCard title="¿Olvidaste tu contraseña?" subtitle="Para el equipo Peek. Si eres cliente, pídele un código nuevo a tu community manager.">
      {state.sent ? (
        <Notice>
          Si <strong>{state.email}</strong> es del equipo, te llegó un correo con un enlace para elegir una contraseña nueva. Revisa también el spam. Si no
          llega en unos minutos, espera una hora antes de pedir otro.
        </Notice>
      ) : (
        <form action={action} className="flex flex-col gap-4" noValidate>
          <Field label="Correo" error={state.error}>
            <Input name="email" type="email" autoComplete="email" required defaultValue={state.email} placeholder="tu@peekmedia.do" />
          </Field>
          <Button type="submit" size="lg" loading={pending} className="mt-2">
            Enviarme el enlace
          </Button>
        </form>
      )}
      <ButtonLink href="/login" variant="ghost" size="sm" className="self-center">
        Volver a entrar
      </ButtonLink>
    </AuthCard>
  );
}
