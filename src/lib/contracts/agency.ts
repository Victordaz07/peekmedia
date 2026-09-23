import "server-only";
import { hasText } from "@/lib/content/helpers";
import { getSiteContent } from "@/lib/data/content";
import type { Agency } from "./document";

/** Datos de la agencia para el contrato (el representante sale del CMS). */
export async function getAgency(): Promise<Agency> {
  const { general } = await getSiteContent();
  return { name: "Peek Media", representative: hasText(general.founderName) ? general.founderName : "Dagoberto Nuñez" };
}
