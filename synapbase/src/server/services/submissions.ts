import "server-only";
import { getDb, nowIso, uid, shortCode, parseJson, tx, localHour, localWeekday } from "../db";
import { ApiError } from "../http";
import { log } from "../log";
import { getPublicFormBySlug } from "./forms";
import type { Question, SubmissionRow } from "@/lib/types";

/* ————— Registro de escaneos ————— */

export function recordScan(slug: string): boolean {
  const found = getPublicFormBySlug(slug);
  if (!found) return false;
  getDb()
    .prepare("INSERT INTO scans (id, business_id, form_id, created_at) VALUES (?, ?, ?, ?)")
    .run(uid(), found.business.id, found.form.id, nowIso());
  return true;
}

/* ————— Normalización de identidad ————— */

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return digits.slice(-11);
}

function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizeGender(raw: string): string | null {
  const g = raw.trim().toLowerCase();
  if (g.startsWith("f")) return "Femenino";
  if (g.startsWith("m") && !g.startsWith("me")) return "Masculino";
  if (g.length > 0) return "Otro / sin especificar";
  return null;
}

/* ————— Validación de respuestas contra las preguntas ————— */

function coerceAnswer(q: Question, value: unknown): unknown {
  if (value === undefined || value === null || value === "") {
    if (q.required) throw new ApiError(400, `Falta responder: ${q.label}`);
    return null;
  }
  switch (q.type) {
    case "text":
    case "date": {
      const s = String(value).trim().slice(0, 500);
      if (q.required && s.length === 0) throw new ApiError(400, `Falta responder: ${q.label}`);
      return s;
    }
    case "number":
    case "scale": {
      const n = Number(value);
      if (!Number.isFinite(n)) throw new ApiError(400, `Respuesta inválida en: ${q.label}`);
      return n;
    }
    case "boolean":
      return value === true || value === "true" || value === "Sí";
    case "select": {
      const s = String(value);
      if (q.options.length > 0 && !q.options.includes(s))
        throw new ApiError(400, `Opción inválida en: ${q.label}`);
      return s;
    }
    case "multiselect": {
      const arr = Array.isArray(value) ? value.map(String) : [String(value)];
      const invalid = q.options.length > 0 && arr.some((v) => !q.options.includes(v));
      if (invalid) throw new ApiError(400, `Opción inválida en: ${q.label}`);
      if (q.required && arr.length === 0) throw new ApiError(400, `Falta responder: ${q.label}`);
      return arr;
    }
    default:
      return String(value).slice(0, 500);
  }
}

/* ————— Submit público: acá se construye la base de datos ————— */

export interface SubmitResult {
  discount_code: string;
  first_time: boolean;
  customer_name: string;
}

export function submitForm(slug: string, rawAnswers: Record<string, unknown>): SubmitResult {
  const found = getPublicFormBySlug(slug);
  if (!found) throw new ApiError(404, "Este formulario ya no está disponible");
  const { form, business } = found;
  if (form.status !== "active") throw new ApiError(410, "Este formulario está pausado en este momento");

  const questions = form.questions ?? [];
  const clean = new Map<string, unknown>();
  for (const q of questions) {
    clean.set(q.id, coerceAnswer(q, rawAnswers[q.id]));
  }

  // Campos mapeados a la ficha del cliente
  const mapped: Partial<Record<string, unknown>> = {};
  for (const q of questions) {
    if (q.maps_to && clean.get(q.id) != null) mapped[q.maps_to] = clean.get(q.id);
  }

  const name = typeof mapped.name === "string" && mapped.name.trim() ? mapped.name.trim().slice(0, 80) : "Sin nombre";
  const phone = typeof mapped.phone === "string" ? normalizePhone(mapped.phone) : null;
  const email = typeof mapped.email === "string" ? normalizeEmail(mapped.email) : null;
  const gender = typeof mapped.gender === "string" ? normalizeGender(mapped.gender) : null;
  const age = typeof mapped.age === "number" && mapped.age > 0 && mapped.age < 120 ? Math.round(mapped.age) : null;
  const product =
    typeof mapped.product === "string"
      ? mapped.product.trim().slice(0, 200)
      : Array.isArray(mapped.product)
        ? (mapped.product as string[]).join(", ").slice(0, 200)
        : null;
  const amount = typeof mapped.amount === "number" && mapped.amount >= 0 ? mapped.amount : null;

  const db = getDb();
  const now = new Date();
  const nowStr = now.toISOString();

  return tx(() => {
    // Resolución de identidad: teléfono → email → nombre (dentro del negocio)
    let customer = (phone &&
      db.prepare("SELECT * FROM customers WHERE business_id = ? AND phone = ?").get(business.id, phone)) as
      | Record<string, unknown>
      | undefined;
    if (!customer && email) {
      customer = db
        .prepare("SELECT * FROM customers WHERE business_id = ? AND email = ?")
        .get(business.id, email) as Record<string, unknown> | undefined;
    }
    if (!customer && !phone && !email) {
      customer = db
        .prepare("SELECT * FROM customers WHERE business_id = ? AND lower(name) = lower(?) AND phone IS NULL AND email IS NULL")
        .get(business.id, name) as Record<string, unknown> | undefined;
    }

    let customerId: string;
    let firstTime: boolean;
    if (customer) {
      customerId = customer.id as string;
      firstTime = false;
      db.prepare(
        `UPDATE customers SET
           visits = visits + 1,
           last_visit_at = ?,
           name = CASE WHEN name = 'Sin nombre' THEN ? ELSE name END,
           phone = COALESCE(phone, ?),
           email = COALESCE(email, ?),
           gender = COALESCE(gender, ?),
           age = COALESCE(age, ?)
         WHERE id = ?`,
      ).run(nowStr, name, phone, email, gender, age, customerId);
    } else {
      customerId = uid();
      firstTime = true;
      db.prepare(
        `INSERT INTO customers (id, business_id, name, phone, email, gender, age, first_visit_at, last_visit_at, visits, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      ).run(customerId, business.id, name, phone, email, gender, age, nowStr, nowStr, nowStr);
    }

    const submissionId = uid();
    const prefix = business.name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "SYN";
    const discountCode = `${prefix}-${shortCode(4).toUpperCase()}`;
    db.prepare(
      `INSERT INTO submissions (id, business_id, form_id, customer_id, product, amount, discount_code, hour, weekday, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      submissionId,
      business.id,
      form.id,
      customerId,
      product,
      amount,
      discountCode,
      localHour(now),
      localWeekday(now),
      nowStr,
    );

    const insertAnswer = db.prepare(
      "INSERT INTO answers (id, submission_id, question_id, value_json) VALUES (?, ?, ?, ?)",
    );
    for (const [qid, value] of clean) {
      if (value === null) continue;
      insertAnswer.run(uid(), submissionId, qid, JSON.stringify(value));
    }

    log.info("submission.created", { businessId: business.id, formId: form.id, firstTime });
    return { discount_code: discountCode, first_time: firstTime, customer_name: name };
  });
}

/* ————— Lectura para el panel ————— */

export interface ListSubmissionsOptions {
  formId?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export function listSubmissions(businessId: string, opts: ListSubmissionsOptions = {}): { rows: SubmissionRow[]; total: number } {
  const db = getDb();
  const where: string[] = ["s.business_id = ?"];
  const params: (string | number)[] = [businessId];
  if (opts.formId) {
    where.push("s.form_id = ?");
    params.push(opts.formId);
  }
  if (opts.from) {
    where.push("s.created_at >= ?");
    params.push(opts.from);
  }
  if (opts.to) {
    where.push("s.created_at <= ?");
    params.push(opts.to);
  }
  if (opts.search) {
    where.push("(c.name LIKE ? OR s.product LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)");
    const like = `%${opts.search}%`;
    params.push(like, like, like, like);
  }
  const whereSql = where.join(" AND ");
  const total = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM submissions s LEFT JOIN customers c ON c.id = s.customer_id WHERE ${whereSql}`,
      )
      .get(...params) as { c: number }
  ).c;

  const limit = Math.min(opts.limit ?? 100, 500);
  const offset = opts.offset ?? 0;
  const rows = db
    .prepare(
      `SELECT s.id, s.form_id, s.customer_id, s.product, s.amount, s.discount_code, s.created_at,
              c.name AS customer_name, f.name AS form_name
       FROM submissions s
       LEFT JOIN customers c ON c.id = s.customer_id
       JOIN forms f ON f.id = s.form_id
       WHERE ${whereSql}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  const ids = rows.map((r) => r.id as string);
  const answersBySubmission = new Map<string, Record<string, unknown>>();
  if (ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    const answerRows = db
      .prepare(
        `SELECT submission_id, question_id, value_json FROM answers WHERE submission_id IN (${placeholders})`,
      )
      .all(...ids) as { submission_id: string; question_id: string; value_json: string | null }[];
    for (const a of answerRows) {
      const bucket = answersBySubmission.get(a.submission_id) ?? {};
      bucket[a.question_id] = parseJson<unknown>(a.value_json, null);
      answersBySubmission.set(a.submission_id, bucket);
    }
  }

  return {
    total,
    rows: rows.map((r) => ({
      id: r.id as string,
      form_id: r.form_id as string,
      form_name: r.form_name as string,
      customer_id: (r.customer_id as string) ?? null,
      customer_name: (r.customer_name as string) ?? null,
      product: (r.product as string) ?? null,
      amount: (r.amount as number) ?? null,
      discount_code: (r.discount_code as string) ?? null,
      created_at: r.created_at as string,
      answers: answersBySubmission.get(r.id as string) ?? {},
    })),
  };
}

export function updateAnswer(businessId: string, submissionId: string, questionId: string, value: unknown) {
  const db = getDb();
  const sub = db
    .prepare("SELECT id FROM submissions WHERE id = ? AND business_id = ?")
    .get(submissionId, businessId);
  if (!sub) throw new ApiError(404, "Registro no encontrado");
  const existing = db
    .prepare("SELECT id FROM answers WHERE submission_id = ? AND question_id = ?")
    .get(submissionId, questionId) as { id: string } | undefined;
  const json = value === null || value === "" ? null : JSON.stringify(value);
  if (existing) {
    db.prepare("UPDATE answers SET value_json = ? WHERE id = ?").run(json, existing.id);
  } else {
    db.prepare("INSERT INTO answers (id, submission_id, question_id, value_json) VALUES (?, ?, ?, ?)").run(
      uid(),
      submissionId,
      questionId,
      json,
    );
  }
  // Mantener sincronizado el campo desnormalizado si la pregunta mapea a producto
  const q = db.prepare("SELECT maps_to FROM questions WHERE id = ?").get(questionId) as
    | { maps_to: string | null }
    | undefined;
  if (q?.maps_to === "product") {
    db.prepare("UPDATE submissions SET product = ? WHERE id = ?").run(
      typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : null,
      submissionId,
    );
  }
}

export function deleteSubmission(businessId: string, submissionId: string) {
  const db = getDb();
  const sub = db
    .prepare("SELECT customer_id FROM submissions WHERE id = ? AND business_id = ?")
    .get(submissionId, businessId) as { customer_id: string | null } | undefined;
  if (!sub) throw new ApiError(404, "Registro no encontrado");
  tx(() => {
    db.prepare("DELETE FROM submissions WHERE id = ?").run(submissionId);
    if (sub.customer_id) {
      // Recalcular contadores del cliente
      const agg = db
        .prepare(
          "SELECT COUNT(*) AS visits, MIN(created_at) AS first, MAX(created_at) AS last FROM submissions WHERE customer_id = ?",
        )
        .get(sub.customer_id) as { visits: number; first: string | null; last: string | null };
      if (agg.visits === 0) {
        db.prepare("DELETE FROM customers WHERE id = ?").run(sub.customer_id);
      } else {
        db.prepare("UPDATE customers SET visits = ?, first_visit_at = ?, last_visit_at = ? WHERE id = ?").run(
          agg.visits,
          agg.first,
          agg.last,
          sub.customer_id,
        );
      }
    }
  });
}
