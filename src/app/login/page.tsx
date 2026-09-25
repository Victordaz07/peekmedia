import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { listDemoClientIds } from "@/lib/data/demo";
import { LOCAL_TEAM } from "@/lib/data/identity";
import { demoAccesses } from "@/lib/demo/seed";
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
  // Con la demostración cargada se muestran sus accesos, como el prototipo (se borran junto con la demo).
  const demo = mode !== "unconfigured" && (await listDemoClientIds().then((ids) => ids.length > 0, () => false));
  return (
    <LoginCard
      mode={mode}
      localTeam={mode === "local" ? { email: LOCAL_TEAM.email, password: LOCAL_TEAM.password } : null}
      demo={demo ? demoAccesses().map((a) => ({ label: a.client, email: a.email, code: a.code })) : []}
    />
  );
}
