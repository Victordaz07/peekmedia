"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeAccessCode } from "@/lib/access-code";
import { clientUserByUserId } from "@/lib/data/clients";
import { endSession, signInWithSecret, teamRoleOf } from "@/lib/data/identity";
import { isLocalMode, localModeAllowed } from "@/lib/env";

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
