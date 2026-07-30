import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { addQuestion, reorderQuestions } from "@/server/services/forms";

const questionSchema = z.object({
  type: z.enum(["text", "number", "select", "multiselect", "boolean", "date", "scale"]),
  label: z.string().min(1, "Escribí la pregunta").max(200),
  placeholder: z.string().max(120).optional(),
  options: z.array(z.string().min(1).max(80)).max(30).optional(),
  required: z.boolean().optional(),
  active: z.boolean().optional(),
  maps_to: z.enum(["name", "phone", "email", "product", "gender", "age", "amount"]).nullable().optional(),
  scale_max: z.number().int().min(2).max(10).nullable().optional(),
});

export const POST = withTenant(async (tenant, req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const data = await parseBody(req, questionSchema);
  const question = addQuestion(tenant.business.id, id, data);
  return NextResponse.json({ question });
});

const reorderSchema = z.object({ orderedIds: z.array(z.string()).min(1).max(100) });

export const PUT = withTenant(async (tenant, req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { orderedIds } = await parseBody(req, reorderSchema);
  reorderQuestions(tenant.business.id, id, orderedIds);
  return NextResponse.json({ ok: true });
});
