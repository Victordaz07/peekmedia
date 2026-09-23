import { redirect } from "next/navigation";

// El inicio multicliente llega en la Fase 3; por ahora el panel abre en Prospectos.
export default function AppHome() {
  redirect("/app/prospectos");
}
