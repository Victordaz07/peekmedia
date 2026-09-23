"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocalMode } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";

export type SignInState = { error?: string; email?: string };

const credentials = z.object({
  email: z.email("Escribe un email válido"),
  password: z.string().min(6, "La contraseña tiene al menos 6 caracteres"),
});

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim();
  if (isLocalMode()) redirect("/app");

  const parsed = credentials.safeParse({ email, password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "Email o contraseña incorrectos.", email };

  const { data: membership } = await supabase.from("memberships").select("role").eq("user_id", data.user.id).maybeSingle();
  if (!membership) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no es del equipo de Peek Media.", email };
  }
  redirect("/app");
}

export async function signOut() {
  if (!isLocalMode()) {
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
