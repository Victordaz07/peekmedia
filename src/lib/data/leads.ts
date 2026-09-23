import "server-only";
import { randomUUID } from "node:crypto";
import { isLocalMode } from "@/lib/env";
import type { Lead, LeadStatus, NewLead } from "@/lib/leads/schema";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";
import { readJson, writeJson } from "./local-store";

type LeadRow = {
  id: string;
  name: string;
  business: string;
  notes: string;
  services: Lead["services"];
  total_monthly: number;
  total_once: number;
  source: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
};

const fromRow = (r: LeadRow): Lead => ({
  id: r.id,
  name: r.name,
  business: r.business,
  notes: r.notes,
  services: r.services,
  totalMonthly: Number(r.total_monthly),
  totalOnce: Number(r.total_once),
  source: r.source,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** Crea un prospecto desde el sitio público. Usa la clave secreta: los visitantes no tienen permisos en la tabla. */
export async function createLead(lead: NewLead): Promise<void> {
  if (isLocalMode()) {
    const all = (await readJson<Lead[]>("leads")) ?? [];
    const now = new Date().toISOString();
    all.unshift({ ...lead, id: randomUUID(), status: "new", createdAt: now, updatedAt: now });
    await writeJson("leads", all);
    return;
  }
  const { error } = await createAdminClient()
    .from("leads")
    .insert({
      name: lead.name,
      business: lead.business,
      notes: lead.notes,
      services: lead.services,
      total_monthly: lead.totalMonthly,
      total_once: lead.totalOnce,
      source: lead.source,
    });
  if (error) throw new Error(`No se pudo guardar el prospecto: ${error.message}`);
}

export async function listLeads(): Promise<Lead[]> {
  if (isLocalMode()) return (await readJson<Lead[]>("leads")) ?? [];
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(`No se pudieron leer los prospectos: ${error.message}`);
  return (data as LeadRow[]).map(fromRow);
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<void> {
  if (isLocalMode()) {
    const all = (await readJson<Lead[]>("leads")) ?? [];
    const lead = all.find((l) => l.id === id);
    if (!lead) throw new Error("Ese prospecto no existe");
    lead.status = status;
    lead.updatedAt = new Date().toISOString();
    await writeJson("leads", all);
    return;
  }
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from("leads").update({ status }).eq("id", id).select("id");
  if (error) throw new Error(`No se pudo actualizar: ${error.message}`);
  if (!data.length) throw new Error("Ese prospecto no existe o no tienes acceso");
}
