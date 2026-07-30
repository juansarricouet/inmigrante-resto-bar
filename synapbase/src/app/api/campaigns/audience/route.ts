import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { resolveAudience } from "@/server/services/campaigns";

const schema = z.object({
  segment_id: z.string().nullable(),
  channel: z.enum(["whatsapp", "email"]),
});

/** Cuántos clientes recibirían la campaña + muestra para la vista previa. */
export const POST = withTenant(async (tenant, req) => {
  const { segment_id, channel } = await parseBody(req, schema);
  const audience = resolveAudience(tenant.business.id, segment_id, channel);
  const sample = audience[0];
  return NextResponse.json({
    count: audience.length,
    sample: sample
      ? { name: sample.name, favorite_product: sample.favorite_product, visits: sample.visits }
      : null,
  });
});
