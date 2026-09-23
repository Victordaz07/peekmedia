import { z } from "zod";
import { networkIds, type Network } from "@/lib/design/tokens";
import { postTypes, type PostType } from "./platforms";

export type ConnectionStatus = "none" | "waiting" | "verifying" | "connected";

/** Cómo quedó conectada la cuenta: API directa, agregador, acceso manual como socio o demo (solo modo local). */
export type ConnectionMode = "meta" | "ayrshare" | "manual" | "demo";

/** Lo que el navegador puede ver de una cuenta conectada. Los tokens nunca salen del servidor. */
export type SocialAccount = {
  id: string;
  clientId: string;
  platform: Network;
  mode: ConnectionMode;
  status: ConnectionStatus;
  externalId: string;
  accountName: string;
  connectedAt: string | null;
  error: string | null;
};

export type MediaItem = { id: string; url: string; mime: string; name: string };

export const postStatuses = ["draft", "pending", "changes", "approved", "scheduled", "published", "failed"] as const;
export type PostStatus = (typeof postStatuses)[number];

export type TargetStatus = "scheduled" | "published" | "failed" | "manual";

export type PostMetrics = { reach: number; likes: number; comments: number; shares: number; saves: number };

export type PostTarget = {
  platform: Network;
  status: TargetStatus;
  externalId: string | null;
  url: string | null;
  error: string | null;
  publishedAt: string | null;
  metrics: PostMetrics | null;
};

export type Post = {
  id: string;
  clientId: string;
  type: PostType;
  caption: string;
  firstComment: string;
  altText: string;
  media: MediaItem[];
  platforms: Network[];
  scheduledAt: string | null;
  status: PostStatus;
  version: number;
  feedback: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  targets: PostTarget[];
};

export type Approval = {
  id: string;
  postId: string;
  version: number;
  action: "approve" | "changes" | "submit";
  comment: string;
  byName: string;
  byUserId: string;
  at: string;
};

const network = z.enum(networkIds as [Network, ...Network[]]);

export const postInputSchema = z.object({
  type: z.enum(postTypes as unknown as [PostType, ...PostType[]]),
  caption: z.string().max(63206),
  firstComment: z.string().max(2200),
  altText: z.string().max(1000),
  media: z
    .array(
      z.object({
        id: z.string().max(80),
        // https en producción; en modo local, la ruta propia /api/media/…
        url: z.string().max(1000).refine((u) => /^https?:\/\//.test(u) || u.startsWith("/api/media/"), "Archivo no válido"),
        mime: z.string().max(100),
        name: z.string().max(200),
      }),
    )
    .max(10),
  platforms: z.array(network).min(1, "Elige al menos una red."),
  scheduledAt: z.string().datetime({ offset: true }).nullable(),
});

export type PostInput = z.infer<typeof postInputSchema>;

export type InboxKind = "comment" | "dm" | "review";

export type InboxItem = {
  id: string;
  clientId: string;
  platform: Network;
  kind: InboxKind;
  externalId: string;
  /** Hilo o destinatario para responder (id de comentario, id del remitente del DM, id de reseña). */
  replyTo: string;
  author: string;
  text: string;
  stars: number | null;
  postRef: string | null;
  receivedAt: string;
  reply: string | null;
  repliedBy: string | null;
  repliedAt: string | null;
};

export const metricNames = ["followers", "reach", "interactions", "profile_views"] as const;
export type MetricName = (typeof metricNames)[number];
export type MetricRow = { platform: Network; date: string; metric: MetricName; value: number };

export type Audience = { platform: Network; ages: { label: string; value: number }[]; cities: { label: string; value: number }[]; updatedAt: string };

export type ClientNote = { id: string; clientId: string; text: string; byName: string; at: string };
