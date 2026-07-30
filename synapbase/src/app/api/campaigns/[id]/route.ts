import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { campaignSchema } from "@/server/schemas";
import { deleteCampaign, updateCampaign } from "@/server/services/campaigns";

export const PATCH = withTenant(async (tenant, req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const data = await parseBody(req, campaignSchema.partial());
  const campaign = updateCampaign(tenant.business.id, id, data);
  return NextResponse.json({ campaign });
});

export const DELETE = withTenant(async (tenant, _req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  deleteCampaign(tenant.business.id, id);
  return NextResponse.json({ ok: true });
});
