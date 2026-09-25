import { z } from "zod";
import { networkIds, type Network } from "@/lib/design/tokens";
import { postTypes, type PostType } from "@/lib/social/platforms";

/**
 * Lo que devuelve el copiloto de "Crear publicación". El mismo esquema valida la respuesta de Claude
 * (herramienta estricta) y tipa el panel. Sin límites numéricos ni de largo: el modo estricto no los admite.
 */
export const suggestionSchema = z.strictObject({
  diagnostico: z.string().describe("2–3 frases: qué funciona del borrador, qué le falta y el riesgo principal."),
  puntuacion: z.number().describe("Qué tan listo está el borrador actual, del 1 al 10."),
  caption: z.string().describe("Texto final mejorado, listo para publicar, sin los hashtags."),
  cambios: z.array(z.string()).describe("Qué cambiaste y por qué, en frases cortas."),
  hashtags: z.array(z.string()).describe("Entre 5 y 15 hashtags con #, mezcla de nicho, locales (RD) y de tendencia."),
  primerComentario: z.string().describe("Primer comentario para Instagram/Facebook. Vacío si no aporta."),
  textoAlternativo: z.string().describe("Descripción de la imagen para lectores de pantalla. Vacío si no hay imagen."),
  formato: z.strictObject({
    tipo: z.enum(postTypes as unknown as [PostType, ...PostType[]]),
    razon: z.string(),
  }),
  horario: z.strictObject({
    fechaHora: z.string().describe("Hora de RD en formato AAAA-MM-DDTHH:mm, en el futuro. Vacío si no hay datos para recomendar."),
    razon: z.string(),
  }),
  porRed: z
    .array(z.strictObject({ red: z.enum(networkIds as [Network, ...Network[]]), consejo: z.string() }))
    .describe("Un ajuste concreto por cada red elegida."),
  tendencias: z
    .array(z.strictObject({ titulo: z.string(), detalle: z.string(), fuente: z.string().describe("URL de la fuente o vacío.") }))
    .describe("Tendencias, fechas o conversaciones actuales que usaste (máximo 4)."),
});

export type Suggestion = z.infer<typeof suggestionSchema>;

/** Lo que el editor le manda al copiloto. */
export const copilotInputSchema = z.object({
  type: z.enum(postTypes as unknown as [PostType, ...PostType[]]),
  caption: z.string().max(63206),
  firstComment: z.string().max(2200),
  altText: z.string().max(1000),
  platforms: z.array(z.enum(networkIds as [Network, ...Network[]])).min(1, "Elige al menos una red."),
  scheduledAt: z.string().datetime({ offset: true }).nullable(),
  media: z.array(z.object({ url: z.string().max(1000), mime: z.string().max(100) })).max(10),
  brief: z.string().trim().max(1000),
});

export type CopilotInput = z.infer<typeof copilotInputSchema>;
