"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { Button, ButtonLink, Field, Input, Logo, Segmented } from "@/components/ui";
import { signIn, type SignInState } from "./actions";

type Mode = "supabase" | "local" | "unconfigured";
type Kind = "team" | "client";

export function LoginCard({ mode, localTeam }: { mode: Mode; localTeam: { email: string; password: string } | null }) {
  const params = useSearchParams();
  const [kind, setKind] = useState<Kind>(params.get("cliente") ? "client" : "team");
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
        value={kind}
        onChange={setKind}
        className="self-start"
        options={[
          { value: "team", label: "Equipo Peek" },
          { value: "client", label: "Soy cliente" },
        ]}
      />
      {mode === "unconfigured" ? (
        <Notice>Falta configurar Supabase en el servidor (NEXT_PUBLIC_SUPABASE_URL y la clave pública).</Notice>
      ) : (
        <LoginForm key={kind} kind={kind} localTeam={kind === "team" ? localTeam : null} />
      )}
    </div>
  );
}

function LoginForm({ kind, localTeam }: { kind: Kind; localTeam: { email: string; password: string } | null }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  const client = kind === "client";
  return (
    <form role="tabpanel" action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="kind" value={kind} />
      {localTeam && (
        <Notice>
          Modo local (sin Supabase). Entra con <strong>{localTeam.email}</strong> y la contraseña <strong>{localTeam.password}</strong>.
        </Notice>
      )}
      <Field label="Correo">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email ?? localTeam?.email}
          placeholder={client ? "tu@negocio.com" : "tu@peekmedia.do"}
        />
      </Field>
      <Field
        label={client ? "Código de acceso" : "Contraseña"}
        hint={client ? "Te lo envió tu community manager." : undefined}
        error={state.error}
      >
        {client ? (
          <Input name="secret" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX" required className="font-mono tracking-[0.12em] uppercase" />
        ) : (
          <Input name="secret" type="password" autoComplete="current-password" required minLength={6} defaultValue={localTeam?.password} />
        )}
      </Field>
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Entrar
      </Button>
      {client && (
        <ButtonLink href="/#contacto" variant="ghost" size="sm" className="self-center">
          ¿No tienes código? Escríbenos
        </ButtonLink>
      )}
    </form>
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
