import { z } from "zod";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  BIZ_COOKIE,
  createSession,
  createUser,
  findUserByEmail,
  getCurrentUser,
  SESSION_COOKIE,
} from "@/server/auth";
import { parseBody, withPublic } from "@/server/http";
import { acceptInvitation, getInvitationByToken } from "@/server/services/business";

const schema = z.object({
  token: z.string().min(4),
  name: z.string().min(2).max(80).optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(200).optional(),
});

export const POST = withPublic(async (req) => {
  const { token, name, password } = await parseBody(req, schema);
  const invitation = getInvitationByToken(token);
  if (!invitation) {
    return NextResponse.json({ error: "La invitación no existe o ya fue usada" }, { status: 404 });
  }

  let user = await getCurrentUser();
  const store = await cookies();

  if (!user) {
    // Sin sesión: usar cuenta existente del email invitado o crear una nueva
    const existing = findUserByEmail(invitation.email);
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email. Iniciá sesión y volvé a abrir el enlace." },
        { status: 409 },
      );
    }
    if (!name || !password) {
      return NextResponse.json({ error: "Completá tu nombre y una contraseña" }, { status: 400 });
    }
    user = createUser(invitation.email, name, password);
    const { token: sessionToken, expiresAt } = createSession(user.id);
    store.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(expiresAt),
      path: "/",
    });
  }

  const businessId = acceptInvitation(token, user.id);
  store.set(BIZ_COOKIE, businessId, { httpOnly: true, sameSite: "lax", path: "/" });
  return NextResponse.json({ ok: true });
});
