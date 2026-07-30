import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { campaignSchema } from "@/server/schemas";
import { createCampaign, listCampaigns } from "@/server/services/campaigns";

export const GET = withTenant(async (tenant) => {
  return NextResponse.json({ campaigns: listCampaigns(tenant.business.id) });
});

export const POST = withTenant(async (tenant, req) => {
  const data = await parseBody(req, campaignSchema);
  const campaign = createCampaign(tenant.business.id, data);
  return NextResponse.json({ campaign });
});
