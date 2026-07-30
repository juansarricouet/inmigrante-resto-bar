import { z } from "zod";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BIZ_COOKIE, getCurrentUser } from "@/server/auth";
import { parseBody, withPublic, withTenant, requireRole } from "@/server/http";
import { createBusiness, updateBusiness } from "@/server/services/business";

const createSchema = z.object({
  name: z.string().min(2, "Contanos el nombre de tu comercio").max(80),
  category: z.string().max(60).optional(),
  address: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
});

/** Creación del negocio (onboarding). Solo requiere usuario logueado. */
export const POST = withPublic(async (req) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const data = await parseBody(req, createSchema);
  const business = createBusiness(user.id, data);
  const store = await cookies();
  store.set(BIZ_COOKIE, business.id, { httpOnly: true, sameSite: "lax", path: "/" });
  return NextResponse.json({ business });
});

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  category: z.string().max(60).nullable().optional(),
  address: z.string().max(160).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  hours: z.string().max(300).nullable().optional(),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido").optional(),
  logo_url: z.string().max(500000).nullable().optional(),
  plan: z.enum(["free", "pro", "business"]).optional(),
});

export const PATCH = withTenant(async (tenant, req) => {
  requireRole(tenant, ["owner", "admin"]);
  const data = await parseBody(req, updateSchema);
  const business = updateBusiness(tenant.business.id, data);
  return NextResponse.json({ business });
});
