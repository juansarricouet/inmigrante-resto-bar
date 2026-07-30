import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { createForm, listForms } from "@/server/services/forms";

export const GET = withTenant(async (tenant) => {
  return NextResponse.json({ forms: listForms(tenant.business.id) });
});

const schema = z.object({
  name: z.string().min(2, "Poné un nombre").max(80),
  withDefaults: z.boolean().optional(),
});

export const POST = withTenant(async (tenant, req) => {
  const { name, withDefaults } = await parseBody(req, schema);
  const form = createForm(tenant.business.id, name, { withDefaults });
  return NextResponse.json({ form });
});
