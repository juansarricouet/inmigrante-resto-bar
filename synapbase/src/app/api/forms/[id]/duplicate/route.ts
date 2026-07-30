import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { duplicateForm } from "@/server/services/forms";

const schema = z.object({
  asTemplate: z.boolean().optional(),
  name: z.string().min(2).max(80).optional(),
});

export const POST = withTenant(async (tenant, req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const data = await parseBody(req, schema);
  const form = duplicateForm(tenant.business.id, id, data);
  return NextResponse.json({ form });
});
