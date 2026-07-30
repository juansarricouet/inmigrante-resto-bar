import { z } from "zod";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BIZ_COOKIE } from "@/server/auth";
import { parseBody, withTenant } from "@/server/http";

const schema = z.object({ businessId: z.string() });

export const POST = withTenant(async (tenant, req) => {
  const { businessId } = await parseBody(req, schema);
  const allowed = tenant.memberships.some((m) => m.business_id === businessId);
  if (!allowed) return NextResponse.json({ error: "No pertenecés a ese comercio" }, { status: 403 });
  const store = await cookies();
  store.set(BIZ_COOKIE, businessId, { httpOnly: true, sameSite: "lax", path: "/" });
  return NextResponse.json({ ok: true });
});
