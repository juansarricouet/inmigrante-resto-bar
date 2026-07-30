import { z } from "zod";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticate, createSession, SESSION_COOKIE } from "@/server/auth";
import { parseBody, withPublic } from "@/server/http";
import { log } from "@/server/log";

const schema = z.object({
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export const POST = withPublic(async (req) => {
  const data = await parseBody(req, schema);
  const user = authenticate(data.email, data.password);
  if (!user) {
    log.warn("auth.login_failed", {});
    return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 });
  }
  const { token, expiresAt } = createSession(user.id);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    path: "/",
  });
  log.info("auth.login", { userId: user.id });
  return NextResponse.json({ ok: true });
});
