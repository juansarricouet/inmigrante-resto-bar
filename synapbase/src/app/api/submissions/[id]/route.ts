import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withTenant } from "@/server/http";
import { deleteSubmission, updateAnswer } from "@/server/services/submissions";

const schema = z.object({
  questionId: z.string(),
  value: z.unknown(),
});

export const PATCH = withTenant(async (tenant, req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { questionId, value } = await parseBody(req, schema);
  updateAnswer(tenant.business.id, id, questionId, value ?? null);
  return NextResponse.json({ ok: true });
});

export const DELETE = withTenant(async (tenant, _req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  deleteSubmission(tenant.business.id, id);
  return NextResponse.json({ ok: true });
});
