import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb, nowIso, uid } from "./db";
import { log } from "./log";
import type { Business, Role } from "@/lib/types";

export const SESSION_COOKIE = "sb_session";
export const BIZ_COOKIE = "sb_biz";
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface Tenant {
  user: SessionUser;
  business: Business;
  role: Role;
  memberships: { business_id: string; business_name: string; role: Role }[];
}

/* ————— Passwords (scrypt, sin dependencias nativas) ————— */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

/* ————— Usuarios ————— */

export function createUser(email: string, name: string, password: string): SessionUser {
  const db = getDb();
  const id = uid();
  db.prepare(
    "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, email.trim().toLowerCase(), name.trim(), hashPassword(password), nowIso());
  log.info("user.created", { userId: id });
  return { id, email: email.trim().toLowerCase(), name: name.trim() };
}

export function findUserByEmail(email: string) {
  return getDb()
    .prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as
    | { id: string; email: string; name: string; password_hash: string }
    | undefined;
}

export function authenticate(email: string, password: string): SessionUser | null {
  const row = findUserByEmail(email);
  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return { id: row.id, email: row.email, name: row.name };
}

/* ————— Sesiones (token opaco en cookie, hash en DB) ————— */

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSession(userId: string): { token: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  getDb()
    .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(hashToken(token), userId, expiresAt, nowIso());
  return { token, expiresAt };
}

export function destroySession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(hashToken(token));
}

export function getUserByToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(hashToken(token)) as
    | { id: string; email: string; name: string; expires_at: string }
    | undefined;
  if (!row) return null;
  if (row.expires_at < nowIso()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(hashToken(token));
    return null;
  }
  return { id: row.id, email: row.email, name: row.name };
}

/* ————— Contexto de sesión en Next ————— */

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return getUserByToken(store.get(SESSION_COOKIE)?.value);
}

function rowToBusiness(row: Record<string, unknown>): Business {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    category: (row.category as string) ?? null,
    address: (row.address as string) ?? null,
    phone: (row.phone as string) ?? null,
    logo_url: (row.logo_url as string) ?? null,
    brand_color: (row.brand_color as string) ?? "#5b5bd6",
    hours: (row.hours as string) ?? null,
    plan: (row.plan as string) ?? "pro",
    created_at: row.created_at as string,
  };
}

/**
 * Resuelve el tenant activo del usuario. TODA consulta de datos del panel
 * parte de acá: el business_id nunca viene del cliente.
 */
export async function getTenant(): Promise<Tenant | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = getDb();
  // node:sqlite devuelve filas con prototipo null: copiar a objetos planos
  // para que puedan cruzar el límite Server → Client Component.
  const memberships = (
    db
      .prepare(
        `SELECT m.business_id, m.role, b.name AS business_name
         FROM memberships m JOIN businesses b ON b.id = m.business_id
         WHERE m.user_id = ? ORDER BY m.created_at ASC`,
      )
      .all(user.id) as { business_id: string; role: Role; business_name: string }[]
  ).map((r) => ({ ...r }));
  if (memberships.length === 0) return null;

  const store = await cookies();
  const wanted = store.get(BIZ_COOKIE)?.value;
  const active =
    memberships.find((m) => m.business_id === wanted) ?? memberships[0]!;
  const bizRow = db
    .prepare("SELECT * FROM businesses WHERE id = ?")
    .get(active.business_id) as Record<string, unknown> | undefined;
  if (!bizRow) return null;

  return {
    user,
    business: rowToBusiness(bizRow),
    role: active.role,
    memberships,
  };
}
