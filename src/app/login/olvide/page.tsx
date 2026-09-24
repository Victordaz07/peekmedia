import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false, follow: false } };

export default function ForgotPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-texture-gris px-4 py-12">
      <ForgotForm />
    </main>
  );
}
