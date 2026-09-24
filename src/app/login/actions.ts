"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeAccessCode } from "@/lib/access-code";
import { clientUserByUserId } from "@/lib/data/clients";
import { currentSessionUser, endSession, sendTeamPasswordReset, setOwnPassword, signInWithSecret, teamRoleOf } from "@/lib/data/identity";
import { isLocalMode, localModeAllowed } from "@/lib/env";
import { siteUrl } from "@/lib/site";

export type SignInState = { error?: string; email?: string };

const credentials = z.object({
  kind: z.enum(["team", "client"]),
  email: z.email("Escribe un correo válido"),
  secret: z.string().min(6, "Revisa la contraseña o el código"),
});

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (isLocalMode() && !localModeAllowed()) return { error: "El acceso no está configurado en este servidor.", email };

  const parsed = credentials.safeParse({ kind: form.get("kind"), email, secret: String(form.get("secret") ?? "") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };
  const { kind } = parsed.data;
  const secret = kind === "client" ? normalizeAccessCode(parsed.data.secret) : parsed.data.secret;

  const user = await signInWithSecret(email, secret);
  const wrong = kind === "team" ? "Correo o contraseña incorrectos." : "Correo o código incorrectos. Pídele uno nuevo a tu community manager.";
  if (!user) return { error: wrong, email };

  if (await teamRoleOf(user.id)) redirect("/app");
  const access = await clientUserByUserId(user.id);
  if (access?.active) redirect(`/app/c/${access.clientId}`);

  await endSession();
  return { error: access ? "Tu acceso está desactivado. Escríbele a tu community manager." : "Esta cuenta no tiene acceso al panel.", email };
}

export async function signOut() {
  await endSession();
  redirect("/login");
}

export type ResetState = { sent?: boolean; error?: string; email?: string };

/** "¿Olvidaste tu contraseña?" del equipo. Siempre responde igual, exista o no el correo. */
export async function requestPasswordReset(_prev: ResetState, form: FormData): Promise<ResetState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const parsed = z.email().safeParse(email);
  if (!parsed.success) return { error: "Escribe un correo válido", email };
  await sendTeamPasswordReset(email, `${siteUrl}/auth/confirm?next=/login/nueva-clave`);
  return { sent: true, email };
}

export type NewPasswordState = { error?: string };

const newPassword = z
  .object({ password: z.string().min(10, "Usa al menos 10 caracteres").max(72), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Las dos contraseñas no coinciden", path: ["confirm"] });

/** Guarda la contraseña nueva de alguien del equipo que llegó por el enlace del correo. */
export async function saveNewPassword(_prev: NewPasswordState, form: FormData): Promise<NewPasswordState> {
  const user = await currentSessionUser();
  if (!user || !(await teamRoleOf(user.id))) return { error: "El enlace venció. Pide otro desde la pantalla de entrar." };
  const parsed = newPassword.safeParse({ password: String(form.get("password") ?? ""), confirm: String(form.get("confirm") ?? "") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await setOwnPassword(parsed.data.password);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo cambiar la contraseña." };
  }
  redirect("/app");
}
