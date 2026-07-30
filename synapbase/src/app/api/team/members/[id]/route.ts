import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, requireRole, withTenant } from "@/server/http";
import { removeMember, updateMemberRole } from "@/server/services/business";

const schema = z.object({ role: z.enum(["admin", "miembro"]) });

export const PATCH = withTenant(async (tenant, req, ctx: { params: Promise<{ id: string }> }) => {
  requireRole(tenant, ["owner"]);
  const { id } = await ctx.params;
  const { role } = await parseBody(req, schema);
  updateMemberRole(tenant.business.id, id, role);
  return NextResponse.json({ ok: true });
});

export const DELETE = withTenant(async (tenant, _req, ctx: { params: Promise<{ id: string }> }) => {
  requireRole(tenant, ["owner", "admin"]);
  const { id } = await ctx.params;
  removeMember(tenant.business.id, id);
  return NextResponse.json({ ok: true });
});
