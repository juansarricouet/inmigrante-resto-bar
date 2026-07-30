import { NextResponse } from "next/server";
import { withTenant } from "@/server/http";
import { dispatchCampaign } from "@/server/services/campaigns";

/**
 * Dispara la campaña: materializa la cola de destinatarios y la marca como
 * enviada. La integración real de WhatsApp/Email se conecta sobre esta misma
 * cola (campaign_recipients) sin cambiar la API.
 */
export const POST = withTenant(async (tenant, _req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const campaign = dispatchCampaign(tenant.business.id, id);
  return NextResponse.json({ campaign });
});
