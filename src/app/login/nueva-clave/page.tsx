import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui";
import { currentSessionUser, teamRoleOf } from "@/lib/data/identity";
import { AuthCard, Notice } from "../login-card";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Contraseña nueva", robots: { index: false, follow: false } };

export default function NewPasswordPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-texture-gris px-4 py-12">
      <Suspense>
        <NewPassword />
      </Suspense>
    </main>
  );
}

// Se llega aquí desde el enlace del correo, que ya abrió la sesión (/auth/confirm).
async function NewPassword() {
  await connection();
  const user = await currentSessionUser();
  const team = user ? await teamRoleOf(user.id) : null;
  if (!user || !team) {
    return (
      <AuthCard title="Ese enlace venció" subtitle="Los enlaces para cambiar la contraseña sirven una sola vez y por poco tiempo.">
        <Notice>Pide otro y ábrelo en este mismo navegador.</Notice>
        <ButtonLink href="/login/olvide" size="lg">
          Pedir otro enlace
        </ButtonLink>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Elige tu contraseña nueva" subtitle={`Para ${user.email}.`}>
      <NewPasswordForm />
    </AuthCard>
  );
}
