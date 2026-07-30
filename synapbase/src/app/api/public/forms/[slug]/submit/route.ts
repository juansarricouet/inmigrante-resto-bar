import { z } from "zod";
import { NextResponse } from "next/server";
import { parseBody, withPublic } from "@/server/http";
import { submitForm } from "@/server/services/submissions";
import { log } from "@/server/log";

const schema = z.object({
  answers: z.record(z.string(), z.unknown()),
});

/** Límite básico por IP para el endpoint público (mejor esfuerzo, en memoria). */
const lastSubmit = new Map<string, number>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const prev = lastSubmit.get(ip) ?? 0;
  if (now - prev < 4000) return true;
  lastSubmit.set(ip, now);
  if (lastSubmit.size > 5000) lastSubmit.clear();
  return false;
}

export const POST = withPublic(async (req, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (throttled(ip)) {
    return NextResponse.json({ error: "Demasiados envíos seguidos. Esperá unos segundos." }, { status: 429 });
  }
  const { answers } = await parseBody(req, schema);
  const result = submitForm(slug, answers);
  log.info("public.submit", { slug, firstTime: result.first_time });
  return NextResponse.json(result);
});
