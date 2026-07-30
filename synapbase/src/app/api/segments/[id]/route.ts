import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { deleteSegment, updateSegment } from "@/server/services/segments";
import { ruleSchema } from "@/server/schemas";

const patchSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  description: z.string().max(200).optional(),
  rules: z.array(ruleSchema).min(1).max(12).optional(),
});

export const PATCH = withTenant(async (tenant, req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const data = await parseBody(req, patchSchema);
  const segment = updateSegment(tenant.business.id, id, data);
  return NextResponse.json({ segment });
});

export const DELETE = withTenant(async (tenant, _req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  deleteSegment(tenant.business.id, id);
  return NextResponse.json({ ok: true });
});
