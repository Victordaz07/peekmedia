import type { Metadata } from "next";
import { isLocalMode, localModeAllowed } from "@/lib/env";
import { LoginCard } from "./login-card";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: false } };

export default function LoginPage() {
  const mode = !isLocalMode() ? "supabase" : localModeAllowed() ? "local" : "unconfigured";
  return (
    <main className="grid min-h-dvh place-items-center bg-texture-gris px-4 py-12">
      <LoginCard mode={mode} />
    </main>
  );
}
