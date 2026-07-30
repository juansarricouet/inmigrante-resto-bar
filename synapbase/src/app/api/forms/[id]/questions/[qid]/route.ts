import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { deleteQuestion, updateQuestion } from "@/server/services/forms";

const patchSchema = z.object({
  type: z.enum(["text", "number", "select", "multiselect", "boolean", "date", "scale"]).optional(),
  label: z.string().min(1).max(200).optional(),
  placeholder: z.string().max(120).nullable().optional(),
  options: z.array(z.string().min(1).max(80)).max(30).optional(),
  required: z.boolean().optional(),
  active: z.boolean().optional(),
  maps_to: z.enum(["name", "phone", "email", "product", "gender", "age", "amount"]).nullable().optional(),
  scale_max: z.number().int().min(2).max(10).nullable().optional(),
});

export const PATCH = withTenant(
  async (tenant, req, ctx: { params: Promise<{ id: string; qid: string }> }) => {
    const { id, qid } = await ctx.params;
    const patch = await parseBody(req, patchSchema);
    const question = updateQuestion(tenant.business.id, id, qid, patch);
    return NextResponse.json({ question });
  },
);

export const DELETE = withTenant(
  async (tenant, _req, ctx: { params: Promise<{ id: string; qid: string }> }) => {
    const { id, qid } = await ctx.params;
    deleteQuestion(tenant.business.id, id, qid);
    return NextResponse.json({ ok: true });
  },
);
