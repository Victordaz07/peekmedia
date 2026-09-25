import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { TeamUser } from "@/lib/auth";
import { clientRoleLabel, type ClientInput, type ClientRole } from "@/lib/clients/schema";
import { quoteTotals } from "@/lib/content/helpers";
import { getAgency } from "@/lib/contracts/agency";
import { contractPlans, type ContractPlan } from "@/lib/contracts/catalog";
import { canonicalDocument } from "@/lib/contracts/document";
import type { ContractTerms } from "@/lib/contracts/schema";
import { defaultTerms } from "@/lib/contracts/terms";
import * as clients from "@/lib/data/clients";
import { getSiteContent } from "@/lib/data/content";
import * as contracts from "@/lib/data/contracts";
import { DEMO_LEAD_SOURCE, insertDemoPlanRequest, listDemoClientIds, markClientDemo } from "@/lib/data/demo";
import { createLoginUser } from "@/lib/data/identity";
import { addClientNote } from "@/lib/data/insights";
import { createLead, listLeads, setLeadStatus } from "@/lib/data/leads";
import { addApproval, insertPostAdmin } from "@/lib/data/posts";
import type { Network } from "@/lib/design/tokens";
import { addMonths, todayRD } from "@/lib/format";
import { connectDemo } from "@/lib/integrations/demo";
import type { LeadStatus } from "@/lib/leads/schema";
import type { Post, PostStatus } from "@/lib/social/schema";

/**
 * Carga los clientes de ejemplo del prototipo (Café Colonial, Clínica Sonrisa y Torre Mar) con accesos,
 * contratos (firmado, por firmar y con solicitud de mejora), redes con 90 días de métricas, bandeja,
 * publicaciones en todos los estados, notas y prospectos. Todo queda marcado para borrarlo con purgeDemo().
 */

type DemoUser = { name: string; email: string; role: ClientRole; code: string };

type DemoClient = {
  input: ClientInput;
  users: DemoUser[];
  contract: { planId: string; startOffsetMonths: number; months: number; priceExtra: number; addons: ContractTerms["addons"]; status: "signed" | "sent" };
  captions: string[];
  notes: string[];
  tasks: { text: string; done: boolean }[];
  news: string[];
  /** Comentario del cliente en la pieza con cambios pedidos. */
  feedback: string;
  request?: { type: "plan" | "addon"; target: string };
};

const DEMO: DemoClient[] = [
  {
    input: {
      name: "Café Colonial",
      industry: "Cafetería · Zona Colonial",
      handle: "cafecolonial.rd",
      avatarColor: "coral",
      platforms: ["instagram", "facebook", "tiktok", "google", "threads", "pinterest"],
      contactName: "Laura Guzmán",
      contactEmail: "cafe@demo.do",
      contactPhone: "809-555-0101",
      taxId: "1-31-00001-1",
      status: "active",
      fee: 12000,
    },
    users: [{ name: "Laura Guzmán · Dueña", email: "cafe@demo.do", role: "admin", code: "CAFE-2026" }],
    contract: { planId: "basico", startOffsetMonths: -6, months: 12, priceExtra: 0, addons: [], status: "signed" },
    captions: [
      "Tu primer café del día merece este lugar.",
      "Nuevo: cold brew de cacao dominicano.",
      "Así se prepara nuestro café de Jarabacoa.",
      "Sábado de brunch en la Zona Colonial.",
      "Adivina el ingrediente secreto de este postre.",
      "3 cafés que tienes que probar este mes.",
      "Detrás de la barra con nuestro barista.",
      "Promo 2x1 los martes antes de las 10 a. m.",
    ],
    notes: ["Prefiere fotos con luz natural de la mañana.", "Quiere empujar el brunch de los sábados este trimestre."],
    tasks: [
      { text: "Sesión de fotos del menú de otoño", done: false },
      { text: "Actualizar horario en Google", done: true },
    ],
    feedback: "Cambien la foto por una con más luz y agreguen el horario del martes.",
    news: ["Este mes el reel del cold brew fue el más visto de la cuenta. Vamos a repetir el formato con el menú de otoño."],
  },
  {
    input: {
      name: "Clínica Sonrisa",
      industry: "Odontología · Piantini",
      handle: "clinicasonrisa",
      avatarColor: "ocean",
      platforms: ["instagram", "facebook", "tiktok", "youtube", "google", "threads"],
      contactName: "Dra. Carla Rosario",
      contactEmail: "clinica@demo.do",
      contactPhone: "809-555-0102",
      taxId: "1-31-00002-2",
      status: "active",
      fee: 25000,
    },
    users: [
      { name: "Dra. Carla Rosario · Dirección", email: "clinica@demo.do", role: "admin", code: "SONR-2026" },
      { name: "Recepción", email: "recepcion@demo.do", role: "viewer", code: "RECP-2026" },
    ],
    contract: { planId: "estrategico", startOffsetMonths: 1, months: 6, priceExtra: 0, addons: [], status: "sent" },
    captions: [
      "5 hábitos que tu dentista quiere que sepas.",
      "¿Blanqueamiento o limpieza? Te explicamos.",
      "Conoce a nuestro equipo en Piantini.",
      "Antes y después: ortodoncia invisible.",
      "Mitos del cepillado que debes olvidar.",
      "Tu sonrisa, nuestro trabajo diario.",
      "Preguntas frecuentes sobre implantes.",
      "Agenda tu evaluación este mes.",
    ],
    notes: ["Todo contenido clínico lo revisa la Dra. Rosario antes de publicar.", "No mostrar pacientes sin autorización firmada."],
    tasks: [
      { text: "Esperar la firma del contrato", done: false },
      { text: "Pedir fotos del equipo médico", done: false },
    ],
    feedback: "Quiten el precio del texto; preferimos que nos escriban por WhatsApp.",
    news: ["¡Bienvenidos a Peek! Ya preparamos las primeras piezas. Revisa y aprueba en la pestaña Aprobaciones."],
  },
  {
    input: {
      name: "Torre Mar Residences",
      industry: "Inmobiliaria · Juan Dolio",
      handle: "torremar.rd",
      avatarColor: "cyan",
      platforms: ["instagram", "facebook", "youtube", "linkedin", "x", "pinterest"],
      contactName: "Miguel Taveras",
      contactEmail: "torre@demo.do",
      contactPhone: "809-555-0103",
      taxId: "1-31-00003-3",
      status: "active",
      fee: 28000,
    },
    users: [
      { name: "Miguel Taveras · Dirección", email: "direccion.torre@demo.do", role: "admin", code: "TMAR-2026" },
      { name: "Gerencia comercial", email: "torre@demo.do", role: "approver", code: "TORR-2026" },
    ],
    contract: { planId: "estrategico", startOffsetMonths: -8, months: 12, priceExtra: 3000, addons: ["Sesión de fotos o video"], status: "signed" },
    captions: [
      "Vista al mar desde el piso 12.",
      "Avance de obra de este mes.",
      "Así se vive en Juan Dolio.",
      "Planos de 2 y 3 habitaciones.",
      "Tour virtual del apartamento modelo.",
      "Invertir en la costa: lo que debes saber.",
      "Amenidades: piscina infinita y gimnasio.",
      "Plan de pagos y fecha estimada de entrega.",
    ],
    notes: ["Lanzamiento de la torre B en diciembre: preparar campaña desde noviembre.", "Los leads de LinkedIn son los de mejor calidad."],
    tasks: [
      { text: "Video de avance de obra (drone)", done: false },
      { text: "Reporte de campañas de septiembre", done: true },
    ],
    feedback: "Usen el render nuevo de la piscina y mencionen la entrega en 2027.",
    news: ["El tour virtual superó las 4,000 reproducciones. Recomendamos invertir más en ese formato para la torre B."],
    request: { type: "plan", target: "premium" },
  },
];

const DEMO_LEADS: { name: string; business: string; notes: string; serviceIds: string[]; status: LeadStatus }[] = [
  { name: "Ramón Vásquez", business: "Ferretería El Progreso", notes: "Quiere vender más por Instagram.", serviceIds: ["redes", "diseno"], status: "new" },
  { name: "Yohanna Reyes", business: "Salón Bella Piel", notes: "Tiene poco tiempo para publicar.", serviceIds: ["redes", "reels", "meta-ads"], status: "contacted" },
  { name: "Pedro Castillo", business: "Gym Fuerza RD", notes: "Promoción de inscripción para enero.", serviceIds: ["reels", "meta-ads", "reporte"], status: "proposal" },
];

export class DemoAlreadyLoadedError extends Error {
  constructor() {
    super("Ya hay datos de demostración. Bórralos antes de cargarlos otra vez.");
  }
}

export type DemoAccess = { client: string; name: string; email: string; role: string; code: string };

/** Accesos de ejemplo para entrar como cliente durante la demostración (son fijos y se borran con la demo). */
export function demoAccesses(): DemoAccess[] {
  return DEMO.flatMap((d) => d.users.map((u) => ({ client: d.input.name, name: u.name, email: u.email, role: clientRoleLabel[u.role], code: u.code })));
}

const HOUR = 3_600_000;

/** Números "al azar" pero estables para cada cliente (la demo siempre se ve igual). */
function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hora fija en RD (UTC−4) a `days` de hoy. */
function atRD(days: number, hour: number) {
  const d = new Date(`${todayRD()}T00:00:00-04:00`);
  d.setTime(d.getTime() + days * 24 * HOUR + hour * HOUR);
  return d.toISOString();
}

function demoPost(clientId: string, caption: string, platforms: Network[], status: PostStatus, scheduledAt: string | null, i: number, extra: Partial<Post> = {}): Post {
  const type = (["reel", "carousel", "post", "story"] as const)[i % 4];
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    clientId,
    type,
    caption,
    firstComment: "",
    altText: "",
    media: [],
    platforms,
    scheduledAt,
    status,
    version: 1,
    feedback: null,
    createdBy: "",
    createdByName: "Equipo Peek",
    createdAt: now,
    updatedAt: now,
    targets: platforms.map((platform) => ({ platform, status: "scheduled", externalId: null, url: null, error: null, publishedAt: null, metrics: null })),
    ...extra,
  };
}

export async function seedDemo(by: TeamUser): Promise<{ accesses: DemoAccess[] }> {
  if ((await listDemoClientIds()).length) throw new DemoAlreadyLoadedError();

  const site = await getSiteContent();
  const plans = contractPlans(site.plans);
  const agency = await getAgency();

  for (const demo of DEMO) {
    const client = await clients.createClient(demo.input);
    await markClientDemo(client.id);

    // Accesos (el código es la contraseña de cada persona).
    const userIds: Record<string, string> = {};
    for (const u of demo.users) {
      const userId = await createLoginUser(u.email, u.name, u.code);
      await clients.insertClientUser({ clientId: client.id, userId, name: u.name, email: u.email, role: u.role, active: true });
      userIds[u.email] = userId;
    }
    const admin = demo.users.find((u) => u.role === "admin")!;

    // Contrato: firmado (con su historial de pagos) o enviado y pendiente de firma.
    const plan: ContractPlan = plans.find((p) => p.id === demo.contract.planId) ?? plans[0];
    const start = addMonths(`${todayRD().slice(0, 7)}-01`, demo.contract.startOffsetMonths);
    const terms: ContractTerms = {
      ...defaultTerms(plan),
      price: (plan.priceFrom || 1) + demo.contract.priceExtra,
      startDate: start,
      months: demo.contract.months,
      addons: demo.contract.addons,
      // El contrato de ejemplo cubre todas las redes conectadas y los reels de ejemplo (así las barras de uso no salen pasadas).
      deliverables: { ...plan.deliverables, reels: Math.max(plan.deliverables.reels, 4), networks: demo.input.platforms.length },
    };
    const draft = await contracts.saveContractDraft(client.id, terms, plan);
    await contracts.markContractSent(draft.id);
    if (demo.contract.status === "signed") {
      const sent = (await contracts.getContract(draft.id))!;
      const document = canonicalDocument(sent, client, agency);
      await contracts.recordSignature({
        contractId: sent.id,
        signerUserId: userIds[admin.email],
        signerName: admin.name.split(" · ")[0],
        signerRole: clientRoleLabel.admin,
        method: "typed",
        image: null,
        signedAt: new Date().toISOString(),
        ip: "",
        userAgent: "Datos de demostración",
        docSha256: createHash("sha256").update(document, "utf8").digest("hex"),
        document,
        verificationCode: `SIG-DEMO${randomUUID().slice(0, 4).toUpperCase()}`,
      });
      const today = todayRD();
      for (let m = 0; ; m++) {
        const period = addMonths(start, m).slice(0, 7);
        if (period >= today.slice(0, 7)) break;
        await contracts.setPaymentPaid(client.id, period, terms.price, true);
      }
    }
    if (demo.request) {
      const requester = demo.users.find((u) => u.role === "admin")!;
      await insertDemoPlanRequest({ clientId: client.id, ...demo.request, byName: requester.name, byUserId: userIds[requester.email] });
    }

    // Redes con 90 días de métricas, audiencia, bandeja y publicaciones ya publicadas.
    // Todas conectadas menos la última, para enseñar cómo se conecta una red (como el prototipo).
    const connected = demo.input.platforms.slice(0, -1);
    for (const platform of connected) await connectDemo(client.id, client.name, platform);

    // Un mes lleno: publicaciones casi a diario en varias redes, con métricas por red.
    const r = seeded(client.name);
    for (let i = 0; i < 16; i++) {
      const count = 1 + Math.floor(r() * Math.min(4, connected.length));
      const nets = [...connected].sort(() => r() - 0.5).slice(0, count);
      const when = atRD(-(1 + Math.floor(i * 1.8)), [9, 11, 13, 18, 20][i % 5] + (r() < 0.5 ? 0.5 : 0));
      const post = demoPost(client.id, demo.captions[(i + 2) % demo.captions.length], nets, "published", when, i);
      post.targets = nets.map((platform) => ({
        platform,
        status: "published",
        externalId: `demo-${i}-${platform}`,
        url: null,
        error: null,
        publishedAt: when,
        metrics: {
          reach: Math.round(600 + r() * 3200),
          likes: Math.round(30 + r() * 260),
          comments: Math.round(r() * 35),
          shares: Math.round(r() * 25),
          saves: Math.round(r() * 40),
        },
      }));
      await insertPostAdmin(post);
    }

    // Publicaciones en todos los estados: programadas, por aprobar, con cambios pedidos y borrador.
    const main = demo.input.platforms.slice(0, 2);
    const c = demo.captions;
    await insertPostAdmin(demoPost(client.id, c[0], main, "scheduled", atRD(1, 9), 0));
    await insertPostAdmin(demoPost(client.id, c[1], main, "scheduled", atRD(3, 18), 1));
    await insertPostAdmin(demoPost(client.id, c[2], [demo.input.platforms[0]], "scheduled", atRD(6, 12), 2));
    await insertPostAdmin(demoPost(client.id, c[3], main, "pending", atRD(4, 10), 3));
    await insertPostAdmin(demoPost(client.id, c[4], main, "pending", atRD(8, 19), 4));
    await insertPostAdmin(demoPost(client.id, c[7], demo.input.platforms.slice(0, 4), "pending", atRD(10, 18), 7));
    await insertPostAdmin(demoPost(client.id, c[1], [demo.input.platforms.at(-1)!], "pending", atRD(12, 9), 1));
    const reviewer = demo.users.find((u) => u.role === "admin" || u.role === "approver")!;
    const changes = demoPost(client.id, c[5], main, "changes", atRD(5, 17), 5, { feedback: demo.feedback });
    await insertPostAdmin(changes);
    await addApproval({ postId: changes.id, version: 1, action: "submit", comment: "", byName: by.name, byUserId: by.id });
    await addApproval({ postId: changes.id, version: 1, action: "changes", comment: changes.feedback ?? "", byName: reviewer.name, byUserId: userIds[reviewer.email] });
    await insertPostAdmin(demoPost(client.id, c[6], [demo.input.platforms[0]], "draft", null, 6));

    // CRM interno y novedades para el cliente.
    for (const n of demo.notes) await clients.addNote(client.id, n, by);
    for (const t of demo.tasks) {
      await clients.addTask(client.id, t.text);
      if (t.done) {
        const task = (await clients.listTasks(client.id)).find((x) => x.text === t.text);
        if (task) await clients.setTaskDone(task.id, true);
      }
    }
    for (const n of demo.news) await addClientNote(client.id, n, by);
  }

  // Prospectos que "llegaron" desde el cotizador del sitio.
  for (const l of DEMO_LEADS) {
    const services = site.quoteServices
      .filter((s) => l.serviceIds.includes(s.id))
      .map(({ id, name, priceFrom, billing }) => ({ id, name, priceFrom, billing }));
    const totals = quoteTotals(services);
    await createLead({ name: l.name, business: l.business, notes: l.notes, services, totalMonthly: totals.monthly, totalOnce: totals.once, source: DEMO_LEAD_SOURCE });
  }
  const leads = await listLeads();
  for (const l of DEMO_LEADS) {
    const lead = leads.find((x) => x.source === DEMO_LEAD_SOURCE && x.name === l.name);
    if (lead && l.status !== "new") await setLeadStatus(lead.id, l.status);
  }

  return { accesses: demoAccesses() };
}
