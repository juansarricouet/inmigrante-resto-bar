import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { setCustomerTags } from "@/server/services/customers";

const schema = z.object({ tagIds: z.array(z.string()).max(50) });

export const PUT = withTenant(async (tenant, req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { tagIds } = await parseBody(req, schema);
  setCustomerTags(tenant.business.id, id, tagIds);
  return NextResponse.json({ ok: true });
});
