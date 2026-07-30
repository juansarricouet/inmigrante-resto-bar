import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { createTag, listTags } from "@/server/services/customers";

export const GET = withTenant(async (tenant) => {
  return NextResponse.json({ tags: listTags(tenant.business.id) });
});

const schema = z.object({
  name: z.string().min(1, "Poné un nombre").max(30),
  color: z.string().max(20).optional(),
});

export const POST = withTenant(async (tenant, req) => {
  const { name, color } = await parseBody(req, schema);
  const tag = createTag(tenant.business.id, name, color);
  return NextResponse.json({ tag });
});
