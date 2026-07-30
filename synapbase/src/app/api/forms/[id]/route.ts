import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { deleteForm, getForm, updateForm } from "@/server/services/forms";

export const GET = withTenant(async (tenant, _req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const form = getForm(tenant.business.id, id);
  if (!form) return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 });
  return NextResponse.json({ form });
});

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  status: z.enum(["active", "paused"]).optional(),
  incentive: z.string().max(120).optional(),
  welcome_title: z.string().max(120).optional(),
  welcome_text: z.string().max(400).optional(),
  success_title: z.string().max(120).optional(),
  success_text: z.string().max(400).optional(),
  theme: z
    .object({
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      showLogo: z.boolean().optional(),
      emoji: z.string().max(8).optional(),
    })
    .optional(),
});

export const PATCH = withTenant(async (tenant, req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const patch = await parseBody(req, patchSchema);
  const form = updateForm(tenant.business.id, id, patch);
  return NextResponse.json({ form });
});

export const DELETE = withTenant(async (tenant, _req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  deleteForm(tenant.business.id, id);
  return NextResponse.json({ ok: true });
});
