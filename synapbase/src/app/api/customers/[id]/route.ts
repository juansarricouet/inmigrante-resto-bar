import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { deleteCustomer, updateCustomer } from "@/server/services/customers";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().max(120).nullable().optional(),
  gender: z.string().max(40).nullable().optional(),
  age: z.number().int().min(1).max(120).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

export const PATCH = withTenant(async (tenant, req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const patch = await parseBody(req, patchSchema);
  updateCustomer(tenant.business.id, id, patch);
  return NextResponse.json({ ok: true });
});

export const DELETE = withTenant(async (tenant, _req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  deleteCustomer(tenant.business.id, id);
  return NextResponse.json({ ok: true });
});
