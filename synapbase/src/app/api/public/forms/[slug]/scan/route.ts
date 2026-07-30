import { NextResponse } from "next/server";
import { withPublic } from "@/server/http";
import { recordScan } from "@/server/services/submissions";

export const POST = withPublic(async (_req, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  recordScan(slug);
  return NextResponse.json({ ok: true });
});
