import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { LOCAL_TEAM } from "@/lib/data/identity";
import { isLocalMode, localModeAllowed } from "@/lib/env";
import { LoginCard } from "./login-card";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-texture-gris px-4 py-12">
      <Suspense>
        <Login />
      </Suspense>
    </main>
  );
}

// El modo se decide al pedir la página (las variables de entorno pueden cambiar sin recompilar).
async function Login() {
  await connection();
  const mode = !isLocalMode() ? "supabase" : localModeAllowed() ? "local" : "unconfigured";
  return <LoginCard mode={mode} localTeam={mode === "local" ? { email: LOCAL_TEAM.email, password: LOCAL_TEAM.password } : null} />;
}
