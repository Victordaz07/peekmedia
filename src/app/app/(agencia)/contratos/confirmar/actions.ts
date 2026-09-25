"use server";

import { revalidatePath } from "next/cache";
import { requireTeam } from "@/lib/auth";
import { getClient, listClientUsers } from "@/lib/data/clients";
import { applyEndRequest, EndRequestError, findEndRequest } from "@/lib/data/contract-end";
import { getContract } from "@/lib/data/contracts";
import { longDate } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import { siteUrl } from "@/lib/site";

/** Paso 2: el dueño confirma desde el enlace de su correo. Se aplica y se avisa a los Administradores del cliente. */
export async function confirmEndContractAction(token: string): Promise<{ ok: true; clientId: string } | { ok: false; error: string }> {
  const viewer = await requireTeam();
  if (viewer.role !== "owner") return { ok: false, error: "Solo el dueño de la agencia puede confirmar esto." };
  const request = typeof token === "string" ? await findEndRequest(token) : null;
  if (!request || request.requestedBy !== viewer.id) return { ok: false, error: "Este enlace no es válido para tu cuenta." };
  let status: "voided" | "terminated";
  try {
    status = await applyEndRequest(request.id, viewer.id);
  } catch (e) {
    if (e instanceof EndRequestError) return { ok: false, error: e.message };
    throw e;
  }

  const contract = await getContract(request.contractId);
  const client = contract ? await getClient(contract.clientId) : null;
  if (contract && client) {
    // Al cliente se le avisa el hecho y la fecha; el motivo interno no sale del equipo.
    const admins = (await listClientUsers(client.id)).filter((u) => u.active && u.role === "admin");
    for (const a of admins) {
      await sendMail({
        to: a.email,
        subject: status === "voided" ? "Peek Media anuló el contrato pendiente de firma" : "Tu contrato con Peek Media fue finalizado",
        text: [
          `Hola, ${a.name}:`,
          ``,
          status === "voided"
            ? `El contrato ${contract.number} v${contract.version} (${contract.planName}) que estaba pendiente de firma fue anulado. Ya no hace falta firmarlo.`
            : `El contrato ${contract.number} v${contract.version} (${contract.planName}) de ${client.name} queda finalizado a partir del ${longDate(request.endDate)}.`,
          `Puedes ver el detalle y descargar el documento en tu panel: ${siteUrl}/app/c/${client.id}/plan`,
          ``,
          `Si tienes preguntas, escríbenos.`,
          `— Peek Media`,
        ].join("\n"),
      }).catch(() => {});
    }
  }
  revalidatePath(`/app/c/${contract?.clientId ?? ""}`, "layout");
  revalidatePath("/app", "layout");
  return { ok: true, clientId: contract?.clientId ?? "" };
}
