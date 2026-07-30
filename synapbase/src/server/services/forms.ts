import "server-only";
import { getDb, nowIso, uid, shortCode, parseJson, tx } from "../db";
import { ApiError } from "../http";
import { log } from "../log";
import { slugify } from "@/lib/utils";
import type { Form, FormTheme, MapsTo, Question, QuestionType } from "@/lib/types";

const DEFAULT_THEME: FormTheme = { color: "#5b5bd6", showLogo: true, emoji: "👋" };

function rowToQuestion(r: Record<string, unknown>): Question {
  return {
    id: r.id as string,
    form_id: r.form_id as string,
    type: r.type as QuestionType,
    label: r.label as string,
    placeholder: (r.placeholder as string) ?? null,
    options: parseJson<string[]>(r.options_json, []),
    required: !!r.required,
    active: !!r.active,
    position: r.position as number,
    maps_to: (r.maps_to as MapsTo) ?? null,
    scale_max: (r.scale_max as number) ?? null,
  };
}

function rowToForm(r: Record<string, unknown>): Form {
  return {
    id: r.id as string,
    business_id: r.business_id as string,
    name: r.name as string,
    slug: r.slug as string,
    status: (r.status as Form["status"]) ?? "active",
    incentive: r.incentive as string,
    welcome_title: (r.welcome_title as string) ?? "",
    welcome_text: (r.welcome_text as string) ?? "",
    success_title: (r.success_title as string) ?? "",
    success_text: (r.success_text as string) ?? "",
    theme: { ...DEFAULT_THEME, ...parseJson<Partial<FormTheme>>(r.theme_json, {}) },
    is_template: !!r.is_template,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export function listForms(businessId: string): Form[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT f.*,
        (SELECT COUNT(*) FROM submissions s WHERE s.form_id = f.id) AS submissions_count,
        (SELECT COUNT(*) FROM scans sc WHERE sc.form_id = f.id) AS scans_count
       FROM forms f WHERE f.business_id = ? ORDER BY f.is_template ASC, f.created_at ASC`,
    )
    .all(businessId) as Record<string, unknown>[];
  return rows.map((r) => ({
    ...rowToForm(r),
    submissions_count: r.submissions_count as number,
    scans_count: r.scans_count as number,
  }));
}

export function getForm(businessId: string, formId: string): Form | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM forms WHERE id = ? AND business_id = ?")
    .get(formId, businessId) as Record<string, unknown> | undefined;
  if (!row) return null;
  const form = rowToForm(row);
  form.questions = listQuestions(formId);
  return form;
}

export function listQuestions(formId: string): Question[] {
  const rows = getDb()
    .prepare("SELECT * FROM questions WHERE form_id = ? ORDER BY position ASC, created_at ASC")
    .all(formId) as Record<string, unknown>[];
  return rows.map(rowToQuestion);
}

export function getPublicFormBySlug(
  slug: string,
): { form: Form; business: { id: string; name: string; logo_url: string | null; brand_color: string } } | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM forms WHERE slug = ? AND is_template = 0")
    .get(slug) as Record<string, unknown> | undefined;
  if (!row) return null;
  const form = rowToForm(row);
  form.questions = listQuestions(form.id).filter((q) => q.active);
  const biz = db
    .prepare("SELECT id, name, logo_url, brand_color FROM businesses WHERE id = ?")
    .get(form.business_id) as
    | { id: string; name: string; logo_url: string | null; brand_color: string }
    | undefined;
  if (!biz) return null;
  return { form, business: { ...biz } };
}

function uniqueSlug(base: string): string {
  const db = getDb();
  let candidate = base || `form-${shortCode(4)}`;
  let i = 0;
  while (db.prepare("SELECT 1 FROM forms WHERE slug = ?").get(candidate)) {
    i++;
    candidate = `${base}-${shortCode(3)}`;
    if (i > 20) candidate = `${base}-${uid().slice(0, 8)}`;
  }
  return candidate;
}

interface QuestionSeed {
  type: QuestionType;
  label: string;
  placeholder?: string | null;
  options?: string[];
  required?: boolean;
  active?: boolean;
  maps_to?: MapsTo;
  scale_max?: number | null;
}

const DEFAULT_QUESTIONS: QuestionSeed[] = [
  { type: "text", label: "¿Cómo te llamás?", placeholder: "Tu nombre", required: true, maps_to: "name" },
  { type: "text", label: "¿Qué consumiste hoy?", placeholder: "Ej.: hamburguesa completa y limonada", required: true, maps_to: "product" },
  { type: "text", label: "Tu teléfono", placeholder: "Ej.: 11 5555 0000", maps_to: "phone" },
  { type: "text", label: "Tu email", placeholder: "nombre@email.com", maps_to: "email" },
  { type: "select", label: "¿Cómo nos conociste?", options: ["Pasaba por el local", "Redes sociales", "Me lo recomendaron", "Otro"] },
  { type: "scale", label: "¿Qué tan probable es que nos recomiendes?", scale_max: 10 },
  { type: "select", label: "Género", options: ["Femenino", "Masculino", "Prefiero no decirlo"], active: false, maps_to: "gender" },
  { type: "number", label: "¿Cuántos años tenés?", placeholder: "Ej.: 28", active: false, maps_to: "age" },
];

export function insertQuestions(formId: string, seeds: QuestionSeed[], startPos = 0) {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO questions (id, form_id, type, label, placeholder, options_json, required, active, position, maps_to, scale_max, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  seeds.forEach((q, i) => {
    stmt.run(
      uid(),
      formId,
      q.type,
      q.label,
      q.placeholder ?? null,
      JSON.stringify(q.options ?? []),
      q.required ? 1 : 0,
      q.active === false ? 0 : 1,
      startPos + i,
      q.maps_to ?? null,
      q.scale_max ?? null,
      nowIso(),
    );
  });
}

export function createForm(
  businessId: string,
  name: string,
  opts?: { slugBase?: string; withDefaults?: boolean; incentive?: string },
): Form {
  const db = getDb();
  const id = uid();
  const slug = uniqueSlug(slugify(opts?.slugBase ?? name));
  const now = nowIso();
  tx(() => {
    db.prepare(
      `INSERT INTO forms (id, business_id, name, slug, status, incentive, theme_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
    ).run(
      id,
      businessId,
      name,
      slug,
      opts?.incentive ?? "5% de descuento en tu consumo",
      JSON.stringify(DEFAULT_THEME),
      now,
      now,
    );
    if (opts?.withDefaults !== false) insertQuestions(id, DEFAULT_QUESTIONS);
  });
  log.info("form.created", { businessId, formId: id });
  return getForm(businessId, id)!;
}

const FORM_PATCH_FIELDS = [
  "name",
  "status",
  "incentive",
  "welcome_title",
  "welcome_text",
  "success_title",
  "success_text",
] as const;

export function updateForm(
  businessId: string,
  formId: string,
  patch: Partial<Pick<Form, (typeof FORM_PATCH_FIELDS)[number]>> & { theme?: Partial<FormTheme> },
): Form {
  const db = getDb();
  const existing = getForm(businessId, formId);
  if (!existing) throw new ApiError(404, "Formulario no encontrado");
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  for (const field of FORM_PATCH_FIELDS) {
    if (patch[field] !== undefined) {
      sets.push(`${field} = ?`);
      values.push(patch[field] as string);
    }
  }
  if (patch.theme) {
    sets.push("theme_json = ?");
    values.push(JSON.stringify({ ...existing.theme, ...patch.theme }));
  }
  sets.push("updated_at = ?");
  values.push(nowIso());
  values.push(formId, businessId);
  db.prepare(`UPDATE forms SET ${sets.join(", ")} WHERE id = ? AND business_id = ?`).run(...values);
  return getForm(businessId, formId)!;
}

export function deleteForm(businessId: string, formId: string) {
  const res = getDb()
    .prepare("DELETE FROM forms WHERE id = ? AND business_id = ?")
    .run(formId, businessId);
  if (res.changes === 0) throw new ApiError(404, "Formulario no encontrado");
  log.info("form.deleted", { businessId, formId });
}

export function duplicateForm(
  businessId: string,
  formId: string,
  opts?: { asTemplate?: boolean; name?: string },
): Form {
  const db = getDb();
  const source = getForm(businessId, formId);
  if (!source) throw new ApiError(404, "Formulario no encontrado");
  const id = uid();
  const now = nowIso();
  const name =
    opts?.name ?? (opts?.asTemplate ? `${source.name} (plantilla)` : `${source.name} (copia)`);
  tx(() => {
    db.prepare(
      `INSERT INTO forms (id, business_id, name, slug, status, incentive, welcome_title, welcome_text, success_title, success_text, theme_json, is_template, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      businessId,
      name,
      uniqueSlug(slugify(name)),
      opts?.asTemplate ? "paused" : "active",
      source.incentive,
      source.welcome_title,
      source.welcome_text,
      source.success_title,
      source.success_text,
      JSON.stringify(source.theme),
      opts?.asTemplate ? 1 : 0,
      now,
      now,
    );
    insertQuestions(
      id,
      (source.questions ?? []).map((q) => ({
        type: q.type,
        label: q.label,
        placeholder: q.placeholder ?? undefined,
        options: q.options,
        required: q.required,
        active: q.active,
        maps_to: q.maps_to,
        scale_max: q.scale_max ?? undefined,
      })),
    );
  });
  return getForm(businessId, id)!;
}

/* ————— Preguntas ————— */

function assertFormOwnership(businessId: string, formId: string) {
  const row = getDb()
    .prepare("SELECT 1 FROM forms WHERE id = ? AND business_id = ?")
    .get(formId, businessId);
  if (!row) throw new ApiError(404, "Formulario no encontrado");
}

export function addQuestion(businessId: string, formId: string, data: QuestionSeed): Question {
  assertFormOwnership(businessId, formId);
  const db = getDb();
  const max = db
    .prepare("SELECT COALESCE(MAX(position), -1) AS m FROM questions WHERE form_id = ?")
    .get(formId) as { m: number };
  const id = uid();
  db.prepare(
    `INSERT INTO questions (id, form_id, type, label, placeholder, options_json, required, active, position, maps_to, scale_max, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    formId,
    data.type,
    data.label,
    data.placeholder ?? null,
    JSON.stringify(data.options ?? []),
    data.required ? 1 : 0,
    data.active === false ? 0 : 1,
    max.m + 1,
    data.maps_to ?? null,
    data.scale_max ?? null,
    nowIso(),
  );
  touchForm(formId);
  const row = db.prepare("SELECT * FROM questions WHERE id = ?").get(id) as Record<string, unknown>;
  return rowToQuestion(row);
}

export function updateQuestion(
  businessId: string,
  formId: string,
  questionId: string,
  patch: Partial<QuestionSeed> & { required?: boolean; active?: boolean },
): Question {
  assertFormOwnership(businessId, formId);
  const db = getDb();
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.label !== undefined) { sets.push("label = ?"); values.push(patch.label); }
  if (patch.type !== undefined) { sets.push("type = ?"); values.push(patch.type); }
  if (patch.placeholder !== undefined) { sets.push("placeholder = ?"); values.push(patch.placeholder ?? null); }
  if (patch.options !== undefined) { sets.push("options_json = ?"); values.push(JSON.stringify(patch.options)); }
  if (patch.required !== undefined) { sets.push("required = ?"); values.push(patch.required ? 1 : 0); }
  if (patch.active !== undefined) { sets.push("active = ?"); values.push(patch.active ? 1 : 0); }
  if (patch.maps_to !== undefined) { sets.push("maps_to = ?"); values.push(patch.maps_to ?? null); }
  if (patch.scale_max !== undefined) { sets.push("scale_max = ?"); values.push(patch.scale_max ?? null); }
  if (sets.length === 0) throw new ApiError(400, "Nada para actualizar");
  values.push(questionId, formId);
  const res = db
    .prepare(`UPDATE questions SET ${sets.join(", ")} WHERE id = ? AND form_id = ?`)
    .run(...values);
  if (res.changes === 0) throw new ApiError(404, "Pregunta no encontrada");
  touchForm(formId);
  const row = db.prepare("SELECT * FROM questions WHERE id = ?").get(questionId) as Record<string, unknown>;
  return rowToQuestion(row);
}

export function deleteQuestion(businessId: string, formId: string, questionId: string) {
  assertFormOwnership(businessId, formId);
  const res = getDb()
    .prepare("DELETE FROM questions WHERE id = ? AND form_id = ?")
    .run(questionId, formId);
  if (res.changes === 0) throw new ApiError(404, "Pregunta no encontrada");
  touchForm(formId);
}

export function reorderQuestions(businessId: string, formId: string, orderedIds: string[]) {
  assertFormOwnership(businessId, formId);
  const db = getDb();
  tx(() => {
    const stmt = db.prepare("UPDATE questions SET position = ? WHERE id = ? AND form_id = ?");
    orderedIds.forEach((qid, i) => stmt.run(i, qid, formId));
  });
  touchForm(formId);
}

function touchForm(formId: string) {
  getDb().prepare("UPDATE forms SET updated_at = ? WHERE id = ?").run(nowIso(), formId);
}
