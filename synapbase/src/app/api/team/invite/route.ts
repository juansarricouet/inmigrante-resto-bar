import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, requireRole, withTenant } from "@/server/http";
import { createInvitation } from "@/server/services/business";

const schema = z.object({
  email: z.string().email("Ingresá un email válido"),
  role: z.enum(["admin", "miembro"]),
});

export const POST = withTenant(async (tenant, req) => {
  requireRole(tenant, ["owner", "admin"]);
  const { email, role } = await parseBody(req, schema);
  const invitation = createInvitation(tenant.business.id, email, role);
  return NextResponse.json({ invitation });
});
