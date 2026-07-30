import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { ruleSchema } from "@/server/schemas";
import { createSegment, listSegments } from "@/server/services/segments";

export const GET = withTenant(async (tenant) => {
  return NextResponse.json({ segments: listSegments(tenant.business.id) });
});

const createSchema = z.object({
  name: z.string().min(2, "Poné un nombre").max(60),
  description: z.string().max(200).optional(),
  rules: z.array(ruleSchema).min(1, "Agregá al menos una condición").max(12),
});

export const POST = withTenant(async (tenant, req) => {
  const data = await parseBody(req, createSchema);
  const segment = createSegment(tenant.business.id, data);
  return NextResponse.json({ segment });
});
