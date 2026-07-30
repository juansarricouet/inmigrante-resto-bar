import "server-only";
import { getDb, nowIso, uid, shortCode, tx } from "../db";
import { ApiError } from "../http";
import { log } from "../log";
import { slugify } from "@/lib/utils";
import { createForm } from "./forms";
import type { Business, Role } from "@/lib/types";

function uniqueBizSlug(base: string): string {
  const db = getDb();
  let candidate = base || `comercio-${shortCode(4)}`;
  while (db.prepare("SELECT 1 FROM businesses WHERE slug = ?").get(candidate)) {
    candidate = `${base}-${shortCode(3)}`;
  }
  return candidate;
}

export function createBusiness(
  userId: string,
  data: { name: string; category?: string; address?: string; phone?: string },
): Business {
  const db = getDb();
  const id = uid();
  const now = nowIso();
  const slug = uniqueBizSlug(slugify(data.name));
  tx(() => {
    db.prepare(
      `INSERT INTO businesses (id, name, slug, category, address, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, data.name.trim(), slug, data.category ?? null, data.address ?? null, data.phone ?? null, now);
    db.prepare(
      "INSERT INTO memberships (id, user_id, business_id, role, created_at) VALUES (?, ?, ?, 'owner', ?)",
    ).run(uid(), userId, id, now);
    const defaultTags = [
      ["VIP", "amber"],
      ["Frecuente", "violet"],
      ["Nuevo", "sky"],
    ] as const;
    for (const [name, color] of defaultTags) {
      db.prepare(
        "INSERT INTO tags (id, business_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(uid(), id, name, color, now);
    }
  });
  // Formulario inicial listo para usar apenas se crea el negocio.
  createForm(id, "Formulario principal", { slugBase: slug });
  log.info("business.created", { businessId: id, userId });
  return getBusiness(id)!;
}

export function getBusiness(id: string): Business | null {
  const row = getDb().prepare("SELECT * FROM businesses WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
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

const BIZ_FIELDS = ["name", "category", "address", "phone", "logo_url", "brand_color", "hours", "plan"] as const;

export function updateBusiness(
  businessId: string,
  patch: Partial<Pick<Business, (typeof BIZ_FIELDS)[number]>>,
): Business {
  const sets: string[] = [];
  const values: (string | null)[] = [];
  for (const f of BIZ_FIELDS) {
    if (patch[f] !== undefined) {
      sets.push(`${f} = ?`);
      values.push(patch[f] as string | null);
    }
  }
  if (sets.length === 0) throw new ApiError(400, "Nada para actualizar");
  values.push(businessId);
  getDb().prepare(`UPDATE businesses SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  log.info("business.updated", { businessId, fields: sets.length });
  return getBusiness(businessId)!;
}

/* ————— Equipo ————— */

export interface Member {
  membership_id: string;
  user_id: string;
  name: string;
  email: string;
  role: Role;
  joined_at: string;
}

export function listMembers(businessId: string): Member[] {
  return (
    getDb()
      .prepare(
        `SELECT m.id AS membership_id, u.id AS user_id, u.name, u.email, m.role, m.created_at AS joined_at
         FROM memberships m JOIN users u ON u.id = m.user_id
         WHERE m.business_id = ? ORDER BY m.created_at ASC`,
      )
      .all(businessId) as unknown as Member[]
  ).map((r) => ({ ...r }));
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  token: string;
  status: string;
  created_at: string;
}

export function listInvitations(businessId: string): Invitation[] {
  return (
    getDb()
      .prepare(
        "SELECT id, email, role, token, status, created_at FROM invitations WHERE business_id = ? AND status = 'pending' ORDER BY created_at DESC",
      )
      .all(businessId) as unknown as Invitation[]
  ).map((r) => ({ ...r }));
}

export function createInvitation(businessId: string, email: string, role: Role): Invitation {
  const db = getDb();
  const existingUser = db
    .prepare(
      `SELECT m.id FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE m.business_id = ? AND u.email = ?`,
    )
    .get(businessId, email.toLowerCase().trim());
  if (existingUser) throw new ApiError(409, "Esa persona ya es parte del equipo");
  const id = uid();
  const token = shortCode(12);
  db.prepare(
    "INSERT INTO invitations (id, business_id, email, role, token, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
  ).run(id, businessId, email.toLowerCase().trim(), role, token, nowIso());
  log.info("invitation.created", { businessId });
  return { id, email: email.toLowerCase().trim(), role, token, status: "pending", created_at: nowIso() };
}

export function revokeInvitation(businessId: string, invitationId: string) {
  const res = getDb()
    .prepare("DELETE FROM invitations WHERE id = ? AND business_id = ?")
    .run(invitationId, businessId);
  if (res.changes === 0) throw new ApiError(404, "Invitación no encontrada");
}

export function getInvitationByToken(token: string) {
  return getDb()
    .prepare(
      `SELECT i.*, b.name AS business_name FROM invitations i
       JOIN businesses b ON b.id = i.business_id
       WHERE i.token = ? AND i.status = 'pending'`,
    )
    .get(token) as
    | { id: string; business_id: string; email: string; role: Role; business_name: string }
    | undefined;
}

export function acceptInvitation(token: string, userId: string) {
  const db = getDb();
  const inv = getInvitationByToken(token);
  if (!inv) throw new ApiError(404, "La invitación no existe o ya fue usada");
  tx(() => {
    const already = db
      .prepare("SELECT 1 FROM memberships WHERE user_id = ? AND business_id = ?")
      .get(userId, inv.business_id);
    if (!already) {
      db.prepare(
        "INSERT INTO memberships (id, user_id, business_id, role, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(uid(), userId, inv.business_id, inv.role, nowIso());
    }
    db.prepare("UPDATE invitations SET status = 'accepted' WHERE id = ?").run(inv.id);
  });
  return inv.business_id;
}

export function updateMemberRole(businessId: string, membershipId: string, role: Role) {
  const res = getDb()
    .prepare("UPDATE memberships SET role = ? WHERE id = ? AND business_id = ? AND role != 'owner'")
    .run(role, membershipId, businessId);
  if (res.changes === 0) throw new ApiError(400, "No se pudo cambiar el rol");
}

export function removeMember(businessId: string, membershipId: string) {
  const res = getDb()
    .prepare("DELETE FROM memberships WHERE id = ? AND business_id = ? AND role != 'owner'")
    .run(membershipId, businessId);
  if (res.changes === 0) throw new ApiError(400, "No se pudo quitar a esta persona");
}
