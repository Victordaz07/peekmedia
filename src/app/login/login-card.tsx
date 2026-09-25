"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { Button, ButtonLink, Field, Input, Logo, Segmented } from "@/components/ui";
import { signIn, type SignInState } from "./actions";

type Mode = "supabase" | "local" | "unconfigured";
type Kind = "team" | "client";

type DemoAccess = { label: string; email: string; code: string };

export function LoginCard({ mode, localTeam, demo = [] }: { mode: Mode; localTeam: { email: string; password: string } | null; demo?: DemoAccess[] }) {
  const params = useSearchParams();
  const [kind, setKind] = useState<Kind>(params.get("cliente") ? "client" : "team");
  const [fill, setFill] = useState<DemoAccess | null>(null);
  return (
    <AuthCard title="Entra a tu panel" demo={demo.length > 0}>
      {params.get("enlace") === "vencido" && <Notice>Ese enlace venció o ya se usó. Pide otro con “¿Olvidaste tu contraseña?”.</Notice>}
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
        <LoginForm key={`${kind}:${fill?.email ?? ""}`} kind={kind} localTeam={kind === "team" ? localTeam : null} canRecover={mode === "supabase" && kind === "team"} fill={kind === "client" ? fill : null} />
      )}
      {demo.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-hairline pt-4">
          <p className="text-eyebrow font-bold tracking-[0.12em] uppercase">Accesos de demostración</p>
          {demo.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => (setKind("client"), setFill(d))}
              className="flex justify-between gap-2.5 rounded-[12px] bg-sand px-3 py-2.5 text-left text-caption transition-colors hover:bg-[#b0b0b0]"
            >
              <span className="font-bold">{d.label}</span>
              <span>
                {d.email} · {d.code}
              </span>
            </button>
          ))}
        </div>
      )}
    </AuthCard>
  );
}

/** Tarjeta de las pantallas de acceso (entrar, recuperar y cambiar la contraseña). */
export function AuthCard({ title, subtitle, demo, children }: { title: string; subtitle?: string; demo?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-[440px] flex-col gap-[18px] rounded-lg bg-surface px-8 py-9 shadow-elevated">
      <div className="flex items-center justify-between gap-2">
        <Link href="/" aria-label="Volver al sitio" className="rounded-sm">
          <Logo className="h-10" priority />
        </Link>
        {demo && <span className="rounded-sm bg-coral-tint px-2 py-1 text-[11px] font-bold tracking-[0.1em]">DEMO</span>}
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[34px] leading-none font-bold tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="text-label text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function LoginForm({
  kind,
  localTeam,
  canRecover,
  fill,
}: {
  kind: Kind;
  localTeam: { email: string; password: string } | null;
  canRecover: boolean;
  fill: DemoAccess | null;
}) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  const next = useSearchParams().get("next");
  const client = kind === "client";
  return (
    <form role="tabpanel" action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="kind" value={kind} />
      {next && <input type="hidden" name="next" value={next} />}
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
          defaultValue={state.email ?? fill?.email ?? localTeam?.email}
          placeholder={client ? "tu@negocio.com" : "tu@peekmedia.do"}
        />
      </Field>
      <Field
        label={client ? "Código de acceso" : "Contraseña"}
        hint={client ? "Te lo envió tu community manager." : undefined}
        error={state.error}
      >
        {client ? (
          <Input name="secret" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX" required defaultValue={fill?.code} className="font-mono tracking-[0.12em] uppercase" />
        ) : (
          <Input name="secret" type="password" autoComplete="current-password" required minLength={6} defaultValue={localTeam?.password} />
        )}
      </Field>
      <Button type="submit" size="lg" variant="dark" loading={pending} className="mt-1">
        Entrar
      </Button>
      {client && (
        <ButtonLink href="/#contacto" variant="ghost" size="sm" className="self-center">
          ¿No tienes código? Escríbenos
        </ButtonLink>
      )}
      {canRecover && (
        <ButtonLink href="/login/olvide" variant="ghost" size="sm" className="self-center">
          ¿Olvidaste tu contraseña?
        </ButtonLink>
      )}
    </form>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-3 rounded-item bg-cyan-tint p-4 text-label">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
