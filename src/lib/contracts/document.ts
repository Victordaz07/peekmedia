import type { Client } from "@/lib/clients/schema";
import { money } from "@/lib/content/helpers";
import { networks } from "@/lib/design/tokens";
import { addMonths, longDate, todayRD } from "@/lib/format";
import { deliverableKeys, deliverableLabel } from "./catalog";
import type { Contract } from "./schema";

export type Agency = { name: string; representative: string };

export type ContractSection = { title: string; paras: string[] };

/** Fecha en que termina el plazo inicial (después se renueva mes a mes). */
export function contractEnd(c: Pick<Contract, "startDate" | "months">) {
  return addMonths(c.startDate, c.months);
}

/** Próxima fecha de pago a partir de hoy (hora de RD). */
export function nextPayment(c: Pick<Contract, "billingDay" | "startDate">, today = todayRD()) {
  const base = today < c.startDate ? c.startDate : today;
  const [y, m, d] = base.split("-").map(Number);
  const candidate = `${y}-${String(m).padStart(2, "0")}-${String(c.billingDay).padStart(2, "0")}`;
  return d <= c.billingDay ? candidate : addMonths(candidate, 1);
}

/**
 * Las 10 cláusulas, generadas a partir de los datos del contrato.
 * Es el texto que el cliente lee y firma: su hash queda guardado con la firma.
 */
export function contractSections(c: Contract, client: Client, agency: Agency): ContractSection[] {
  const clientRef = [
    client.contactName ? `${client.name}, representado por ${client.contactName}` : client.name,
    client.taxId ? `RNC/Cédula ${client.taxId}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const nets = client.platforms.map((p) => networks[p].label).join(", ");
  const end = contractEnd(c);

  return [
    {
      title: "1. Las partes",
      paras: [
        `${agency.name}, agencia de marketing digital con domicilio en Santo Domingo, República Dominicana, representada por ${agency.representative} (“la Agencia”), y ${clientRef} (“el Cliente”).`,
      ],
    },
    {
      title: "2. Objeto",
      paras: [`La Agencia prestará al Cliente servicios de marketing digital bajo el ${c.planName}, en las redes: ${nets}.`],
    },
    {
      title: "3. Servicios incluidos",
      paras: [
        ...deliverableKeys.map((k) => `• ${deliverableLabel[k]}: ${c.deliverables[k]}`),
        ...c.extras.map((x) => `• ${x}`),
        ...(c.addons.length ? [`Servicios adicionales: ${c.addons.join(", ")}.`] : []),
      ],
    },
    {
      title: "4. Precio y forma de pago",
      paras: [
        `El Cliente pagará ${money(c.price)} mensuales, más ITBIS cuando aplique, a más tardar el día ${c.billingDay} de cada mes, por ${c.paymentMethod.toLowerCase()}. La inversión en anuncios pagados no está incluida y la paga el Cliente directamente a cada plataforma.`,
      ],
    },
    {
      title: "5. Duración y renovación",
      paras: [
        `El contrato inicia el ${longDate(c.startDate)} y dura ${c.months} ${c.months === 1 ? "mes" : "meses"}, hasta el ${longDate(end)}. Luego se renueva mes a mes, salvo aviso por escrito de cualquiera de las partes con 30 días de anticipación.`,
      ],
    },
    {
      title: "6. Aprobación de contenido",
      paras: [
        "El Cliente revisa y aprueba las publicaciones desde su panel de Peek Media. La Agencia no publica contenido que el Cliente no haya aprobado.",
      ],
    },
    {
      title: "7. Accesos y datos",
      paras: [
        "El Cliente da acceso a sus cuentas mediante las conexiones oficiales de cada plataforma. La Agencia no solicita ni guarda contraseñas. Al terminar el contrato, la Agencia retira sus accesos y el Cliente puede revocarlos en cualquier momento. Los datos personales se tratan conforme a la Ley No. 172-13.",
      ],
    },
    {
      title: "8. Propiedad del contenido",
      paras: [
        "El contenido producido y pagado bajo este contrato pertenece al Cliente. La Agencia puede mostrarlo en su portafolio, salvo que el Cliente indique lo contrario por escrito.",
      ],
    },
    {
      title: "9. Cambios de plan y cancelación",
      paras: [
        "El Cliente puede solicitar mejorar su plan desde su panel; el cambio se formaliza con una nueva versión de este contrato. Cualquiera de las partes puede terminarlo con aviso de 30 días; los meses ya prestados no son reembolsables.",
      ],
    },
    {
      title: "10. Firma electrónica",
      paras: [
        "Las partes aceptan firmar este contrato electrónicamente, conforme a la Ley No. 126-02 sobre Comercio Electrónico, Documentos y Firmas Digitales de la República Dominicana.",
      ],
    },
  ];
}

/** Texto canónico que se firma: número, versión, partes y cláusulas. */
export function canonicalDocument(c: Contract, client: Client, agency: Agency) {
  return JSON.stringify({
    number: c.number,
    version: c.version,
    title: "Contrato de servicios de marketing digital",
    agency,
    client: { id: client.id, name: client.name, taxId: client.taxId },
    sections: contractSections(c, client, agency),
  });
}

export type ScheduleRow = { period: string; amount: number; status: "paid" | "pending" | "upcoming"; paidAt: string | null };

/**
 * Pagos del contrato vigente: desde el mes de inicio hasta el mes siguiente a hoy.
 * Un mes está "Pagado" si el equipo lo marcó; si no, "Pendiente" (ya venció o vence este mes) o "Próximo".
 */
export function paymentSchedule(
  c: Pick<Contract, "startDate" | "price" | "billingDay">,
  paid: { period: string; paidAt: string }[],
  today = todayRD(),
  limit = 6,
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const paidBy = new Map(paid.map((p) => [p.period, p.paidAt]));
  let period = c.startDate.slice(0, 7);
  const last = addMonths(`${today.slice(0, 7)}-01`, 1).slice(0, 7);
  while (period <= last && rows.length < 60) {
    const due = `${period}-${String(c.billingDay).padStart(2, "0")}`;
    const paidAt = paidBy.get(period) ?? null;
    rows.push({ period, amount: c.price, status: paidAt ? "paid" : due <= today || period === today.slice(0, 7) ? "pending" : "upcoming", paidAt });
    period = addMonths(`${period}-01`, 1).slice(0, 7);
  }
  return rows.reverse().slice(0, limit);
}
