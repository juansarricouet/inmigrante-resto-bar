import { NextResponse } from "next/server";
import { requireRole, withTenant } from "@/server/http";
import { revokeInvitation } from "@/server/services/business";

export const DELETE = withTenant(async (tenant, _req, ctx: { params: Promise<{ id: string }> }) => {
  requireRole(tenant, ["owner", "admin"]);
  const { id } = await ctx.params;
  revokeInvitation(tenant.business.id, id);
  return NextResponse.json({ ok: true });
});
