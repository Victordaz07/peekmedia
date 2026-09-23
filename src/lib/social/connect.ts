import "server-only";
import type { Client } from "@/lib/clients/schema";
import { upsertAccount } from "@/lib/data/social";
import type { MetaPage } from "@/lib/integrations/meta";

/** Guarda la página de Facebook y su Instagram (si el cliente maneja esas redes). */
export async function connectMetaPage(client: Client, page: MetaPage) {
  if (client.platforms.includes("facebook")) {
    await upsertAccount({ clientId: client.id, platform: "facebook", mode: "meta", status: "connected", externalId: page.id, accountName: page.name, accessToken: page.token });
  }
  if (client.platforms.includes("instagram") && page.ig) {
    await upsertAccount({
      clientId: client.id,
      platform: "instagram",
      mode: "meta",
      status: "connected",
      externalId: page.ig.id,
      accountName: page.ig.username ? `@${page.ig.username}` : page.name,
      accessToken: page.token,
      meta: { pageId: page.id },
    });
  }
}
