import { z } from "zod";
import { avatarColors, networkIds, type AvatarColor, type Network } from "@/lib/design/tokens";

export const clientStatuses = ["prospect", "active", "paused", "ended"] as const;
export type ClientStatus = (typeof clientStatuses)[number];

export const clientRoles = ["admin", "approver", "viewer"] as const;
export type ClientRole = (typeof clientRoles)[number];

export const clientRoleLabel: Record<ClientRole, string> = {
  admin: "Administrador",
  approver: "Aprobador",
  viewer: "Solo lectura",
};

export const clientRoleHelp: Record<ClientRole, string> = {
  admin: "Aprueba, firma el contrato y ve todo.",
  approver: "Aprueba publicaciones.",
  viewer: "Ve reportes y calendario.",
};

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || z.email().safeParse(v).success, "Email no válido");

export const clientInputSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del negocio").max(80),
  industry: z.string().trim().max(80),
  handle: z
    .string()
    .trim()
    .max(60)
    .transform((v) => v.replace(/^@/, "")),
  avatarColor: z.enum(Object.keys(avatarColors) as [AvatarColor, ...AvatarColor[]]),
  platforms: z.array(z.enum(networkIds as [Network, ...Network[]])).min(1, "Elige al menos una red"),
  contactName: z.string().trim().max(100),
  contactEmail: optionalEmail,
  contactPhone: z.string().trim().max(30),
  /** RNC o cédula: aparece en el contrato. */
  taxId: z.string().trim().max(20),
  status: z.enum(clientStatuses),
  fee: z.number().nonnegative().max(10_000_000).nullable(),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

export type Client = ClientInput & { id: string; createdAt: string };

export const inviteSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email("Escribe un correo válido")),
  role: z.enum(clientRoles),
});

export type ClientUser = {
  id: string;
  clientId: string;
  userId: string;
  name: string;
  email: string;
  role: ClientRole;
  active: boolean;
  invitedAt: string;
  codeUpdatedAt: string;
};

export type Note = { id: string; clientId: string; text: string; by: string; at: string };
export type Task = { id: string; clientId: string; text: string; done: boolean; createdAt: string };
