import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, findUserByEmail, SESSION_COOKIE, BIZ_COOKIE } from "@/server/auth";
import { withPublic } from "@/server/http";
import { getDb } from "@/server/db";
import { log } from "@/server/log";
import { ensureDemoData, DEMO_EMAIL } from "@/server/demo-seed.mjs";

/** Prepara (si hace falta) y abre la cuenta demo con datos de ejemplo. */
export const POST = withPublic(async () => {
  const result = ensureDemoData() as { created: boolean };
  if (result.created) log.info("demo.seeded", {});
  const user = findUserByEmail(DEMO_EMAIL as string);
  if (!user) return NextResponse.json({ error: "No pudimos preparar la demo" }, { status: 500 });

  const membership = getDb()
    .prepare("SELECT business_id FROM memberships WHERE user_id = ? ORDER BY created_at ASC LIMIT 1")
    .get(user.id) as { business_id: string } | undefined;

  const { token, expiresAt } = createSession(user.id);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    path: "/",
  });
  if (membership) {
    store.set(BIZ_COOKIE, membership.business_id, { httpOnly: true, sameSite: "lax", path: "/" });
  }
  return NextResponse.json({ ok: true });
});
