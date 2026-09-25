import { z } from "zod";
import { networkIds, type Network } from "@/lib/design/tokens";
import { postTypes, type PostType } from "@/lib/social/platforms";

/**
 * Respuestas estructuradas de Claude (Bandeja, Plan del mes, Reportes y Prospectos).
 * Sin límites numéricos ni de largo: el modo estricto no los admite; se limpian después en el servidor.
 */

const network = z.enum(networkIds as [Network, ...Network[]]);
const postType = z.enum(postTypes as unknown as [PostType, ...PostType[]]);

export const replySchema = z.strictObject({
  respuesta: z.string().describe("La respuesta lista para enviar, con la voz de la marca."),
  alternativa: z.string().describe("Otra versión con distinto enfoque (más corta o más cálida)."),
  sentimiento: z.enum(["positivo", "neutral", "negativo", "queja"]),
  alerta: z.string().describe("Si el caso necesita que alguien del negocio intervenga (queja seria, reembolso, salud, legal), explica por qué en una frase. Vacío si no."),
});
export type ReplySuggestion = z.infer<typeof replySchema>;

export const monthPlanSchema = z.strictObject({
  enfoque: z.string().describe("2–3 frases con la estrategia del mes para esta cuenta."),
  ideas: z
    .array(
      z.strictObject({
        fechaHora: z.string().describe("Hora de RD, AAAA-MM-DDTHH:mm, dentro del mes pedido y en el futuro."),
        tipo: postType,
        redes: z.array(network),
        titulo: z.string().describe("La idea en pocas palabras."),
        caption: z.string().describe("Borrador del texto, listo para pulir."),
        porque: z.string().describe("Por qué esta idea, con qué dato de la cuenta o fecha se apoya."),
        fechaEspecial: z.string().describe("Fecha o tendencia en la que se apoya (ej. Día de las Madres en RD). Vacío si ninguna."),
      }),
    )
    .describe("Entre 8 y 12 ideas repartidas en el mes."),
});
export type MonthPlan = z.infer<typeof monthPlanSchema>;
export type PlanIdea = MonthPlan["ideas"][number];

export const reportSummarySchema = z.strictObject({
  titular: z.string().describe("Una frase con el resultado del mes."),
  funciono: z.array(z.string()).describe("3–4 cosas que funcionaron, con números."),
  mejorar: z.array(z.string()).describe("2–3 cosas que no funcionaron o que hay que mejorar."),
  proximoMes: z.array(z.string()).describe("3 acciones concretas para el mes que viene."),
  notaParaCliente: z.string().describe("Nota para el cliente en lenguaje sencillo, sin tecnicismos, máximo 1,500 caracteres."),
});
export type ReportSummary = z.infer<typeof reportSummarySchema>;

export const leadReplySchema = z.strictObject({
  whatsapp: z.string().describe("Primer mensaje de WhatsApp para el prospecto: cálido, corto y con una pregunta que invite a responder."),
  planId: z.string().describe("id del plan que más le conviene, de la lista dada."),
  razonPlan: z.string().describe("Por qué ese plan, en 1–2 frases."),
  preguntas: z.array(z.string()).describe("3–5 preguntas para la primera llamada."),
  siguientePaso: z.string().describe("Qué debería hacer el equipo ahora y cuándo."),
});
export type LeadReply = z.infer<typeof leadReplySchema>;
