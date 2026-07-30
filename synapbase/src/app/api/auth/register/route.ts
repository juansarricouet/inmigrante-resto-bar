import { z } from "zod";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, createUser, findUserByEmail, SESSION_COOKIE } from "@/server/auth";
import { parseBody, withPublic } from "@/server/http";

const schema = z.object({
  name: z.string().min(2, "Contanos tu nombre").max(80),
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(200),
});

export const POST = withPublic(async (req) => {
  const data = await parseBody(req, schema);
  if (findUserByEmail(data.email)) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese email. Probá iniciar sesión." },
      { status: 409 },
    );
  }
  const user = createUser(data.email, data.name, data.password);
  const { token, expiresAt } = createSession(user.id);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    path: "/",
  });
  return NextResponse.json({ ok: true });
});
