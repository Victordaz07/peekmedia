"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, ButtonLink, Field, Input, Logo, Segmented } from "@/components/ui";
import { signIn, type SignInState } from "./actions";

type Mode = "supabase" | "local" | "unconfigured";

export function LoginCard({ mode }: { mode: Mode }) {
  const [tab, setTab] = useState<"team" | "client">("team");
  return (
    <div className="flex w-full max-w-[440px] flex-col gap-6 rounded-lg bg-surface p-[clamp(24px,6vw,40px)] shadow-elevated">
      <Link href="/" aria-label="Volver al sitio" className="self-start rounded-sm">
        <Logo className="h-10" priority />
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 font-bold tracking-[-0.03em]">Entra a Peek</h1>
        <p className="text-label text-muted">Tu espacio para crear, aprobar y medir.</p>
      </div>
      <Segmented
        label="Tipo de acceso"
        value={tab}
        onChange={setTab}
        className="self-start"
        options={[
          { value: "team", label: "Equipo Peek" },
          { value: "client", label: "Soy cliente" },
        ]}
      />
      {tab === "team" ? <TeamLogin mode={mode} /> : <ClientSoon />}
    </div>
  );
}

function TeamLogin({ mode }: { mode: Mode }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});

  if (mode === "local") {
    return (
      <div role="tabpanel" className="flex flex-col gap-4">
        <Notice>
          Modo local: Supabase no está configurado, así que no hay login. Los cambios se guardan en <code>.data/</code> en esta computadora.
        </Notice>
        <ButtonLink href="/app" size="lg">
          Entrar al panel
        </ButtonLink>
      </div>
    );
  }
  if (mode === "unconfigured") {
    return (
      <div role="tabpanel">
        <Notice>Falta configurar Supabase en el servidor (NEXT_PUBLIC_SUPABASE_URL y la clave pública).</Notice>
      </div>
    );
  }
  return (
    <form role="tabpanel" action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required defaultValue={state.email} placeholder="tu@peekmedia.do" />
      </Field>
      <Field label="Contraseña" error={state.error}>
        <Input name="password" type="password" autoComplete="current-password" required minLength={6} />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Entrar
      </Button>
    </form>
  );
}

function ClientSoon() {
  return (
    <div role="tabpanel" className="flex flex-col gap-3">
      <Notice>
        Muy pronto vas a poder entrar con el email y el código que te envíe tu community manager. Mientras tanto, escríbenos por
        WhatsApp.
      </Notice>
      <ButtonLink href="/#contacto" variant="outline">
        Volver al sitio
      </ButtonLink>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-3 rounded-item bg-cyan-tint p-4 text-label">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
