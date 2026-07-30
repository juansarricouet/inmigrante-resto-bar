import "server-only";
import { getDb, nowIso, uid, parseJson } from "../db";
import { ApiError } from "../http";
import { getCustomerFacts, type CustomerFacts } from "./customers";
import type { Segment, SegmentRule } from "@/lib/types";

function rowToSegment(r: Record<string, unknown>): Segment {
  return {
    id: r.id as string,
    business_id: r.business_id as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    rules: parseJson<SegmentRule[]>(r.rules_json, []),
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

/* ————— Motor de reglas (todas las condiciones se combinan con AND) ————— */

function includesInsensitive(haystack: string | null | undefined, needle: string): boolean {
  return (haystack ?? "").toLowerCase().includes(needle.toLowerCase());
}

export function matchesRule(c: CustomerFacts, rule: SegmentRule): boolean {
  switch (rule.field) {
    case "visits": {
      const v = c.visits;
      if (rule.op === "gte") return v >= Number(rule.value);
      if (rule.op === "lte") return v <= Number(rule.value);
      return v === Number(rule.value);
    }
    case "last_visit_days": {
      const days = Math.floor((Date.now() - new Date(c.last_visit_at).getTime()) / 86400000);
      if (rule.op === "gte") return days >= Number(rule.value);
      return days <= Number(rule.value);
    }
    case "age": {
      if (c.age == null) return false;
      if (rule.op === "between") return c.age >= (rule.min ?? 0) && c.age <= (rule.max ?? 200);
      if (rule.op === "gte") return c.age >= Number(rule.value);
      if (rule.op === "lte") return c.age <= Number(rule.value);
      return c.age === Number(rule.value);
    }
    case "gender": {
      if (rule.op === "neq") return (c.gender ?? "") !== String(rule.value);
      return (c.gender ?? "") === String(rule.value);
    }
    case "product": {
      // Consumió alguna vez
      const target = String(rule.value ?? "");
      const has = c.products.some((p) => includesInsensitive(p, target));
      return rule.op === "neq" ? !has : has;
    }
    case "favorite_product": {
      if (rule.op === "contains") return includesInsensitive(c.favorite_product, String(rule.value ?? ""));
      return (c.favorite_product ?? "") === String(rule.value);
    }
    case "total_spent": {
      if (rule.op === "gte") return c.total_spent >= Number(rule.value);
      return c.total_spent <= Number(rule.value);
    }
    case "has_phone":
      return rule.value === false ? !c.phone : !!c.phone;
    case "has_email":
      return rule.value === false ? !c.email : !!c.email;
    case "tag":
      return c.tags.some((t) => t.id === rule.value || t.name === rule.value);
    case "question": {
      if (!rule.questionId) return false;
      const values = c.answers[rule.questionId] ?? [];
      if (values.length === 0) return false;
      if (rule.value === undefined || rule.value === "") return true; // respondió, sin importar qué
      return values.some((v) => {
        const flat = Array.isArray(v) ? v.map(String) : [String(v)];
        switch (rule.op) {
          case "contains":
            return flat.some((s) => includesInsensitive(s, String(rule.value)));
          case "gte":
            return flat.some((s) => Number(s) >= Number(rule.value));
          case "lte":
            return flat.some((s) => Number(s) <= Number(rule.value));
          case "neq":
            return !flat.includes(String(rule.value));
          default:
            return flat.includes(String(rule.value));
        }
      });
    }
    default:
      return false;
  }
}

export function evaluateRules(businessId: string, rules: SegmentRule[]): CustomerFacts[] {
  const facts = getCustomerFacts(businessId);
  if (rules.length === 0) return facts;
  return facts.filter((c) => rules.every((r) => matchesRule(c, r)));
}

/* ————— CRUD ————— */

export function listSegments(businessId: string, withCounts = true): Segment[] {
  const rows = getDb()
    .prepare("SELECT * FROM segments WHERE business_id = ? ORDER BY created_at DESC")
    .all(businessId) as Record<string, unknown>[];
  const segments = rows.map(rowToSegment);
  if (withCounts && segments.length > 0) {
    const facts = getCustomerFacts(businessId);
    for (const s of segments) {
      s.count = s.rules.length === 0 ? facts.length : facts.filter((c) => s.rules.every((r) => matchesRule(c, r))).length;
    }
  }
  return segments;
}

export function getSegment(businessId: string, segmentId: string): Segment | null {
  const row = getDb()
    .prepare("SELECT * FROM segments WHERE id = ? AND business_id = ?")
    .get(segmentId, businessId) as Record<string, unknown> | undefined;
  return row ? rowToSegment(row) : null;
}

export function createSegment(
  businessId: string,
  data: { name: string; description?: string; rules: SegmentRule[] },
): Segment {
  const id = uid();
  const now = nowIso();
  getDb()
    .prepare(
      "INSERT INTO segments (id, business_id, name, description, rules_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(id, businessId, data.name.trim(), data.description ?? null, JSON.stringify(data.rules), now, now);
  return getSegment(businessId, id)!;
}

export function updateSegment(
  businessId: string,
  segmentId: string,
  data: { name?: string; description?: string; rules?: SegmentRule[] },
): Segment {
  const existing = getSegment(businessId, segmentId);
  if (!existing) throw new ApiError(404, "Segmento no encontrado");
  getDb()
    .prepare("UPDATE segments SET name = ?, description = ?, rules_json = ?, updated_at = ? WHERE id = ? AND business_id = ?")
    .run(
      data.name ?? existing.name,
      data.description !== undefined ? data.description : existing.description,
      JSON.stringify(data.rules ?? existing.rules),
      nowIso(),
      segmentId,
      businessId,
    );
  return getSegment(businessId, segmentId)!;
}

export function deleteSegment(businessId: string, segmentId: string) {
  const res = getDb()
    .prepare("DELETE FROM segments WHERE id = ? AND business_id = ?")
    .run(segmentId, businessId);
  if (res.changes === 0) throw new ApiError(404, "Segmento no encontrado");
}
