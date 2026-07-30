import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { evaluateRules } from "@/server/services/segments";
import { ruleSchema } from "@/server/schemas";

const schema = z.object({ rules: z.array(ruleSchema).max(12) });

/** Conteo en vivo de la audiencia mientras se arma el segmento. */
export const POST = withTenant(async (tenant, req) => {
  const { rules } = await parseBody(req, schema);
  const matched = evaluateRules(tenant.business.id, rules);
  return NextResponse.json({
    count: matched.length,
    with_phone: matched.filter((c) => c.phone).length,
    with_email: matched.filter((c) => c.email).length,
    sample: matched.slice(0, 5).map((c) => c.name),
  });
});
