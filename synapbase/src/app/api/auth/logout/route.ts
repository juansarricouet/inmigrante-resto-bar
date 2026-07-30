import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE, BIZ_COOKIE } from "@/server/auth";
import { withPublic } from "@/server/http";

export const POST = withPublic(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) destroySession(token);
  store.delete(SESSION_COOKIE);
  store.delete(BIZ_COOKIE);
  return NextResponse.json({ ok: true });
});
