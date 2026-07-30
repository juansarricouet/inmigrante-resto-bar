"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Pencil, Plus, Send, Target, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { cn, formatNumber } from "@/lib/utils";
import type { Segment, SegmentRule, Tag } from "@/lib/types";
import Link from "next/link";

export interface QuestionOption {
  id: string;
  label: string;
  type: string;
  options: string[];
  form_name: string;
}

const FIELD_DEFS: { value: SegmentRule["field"]; label: string }[] = [
  { value: "visits", label: "Cantidad de visitas" },
  { value: "last_visit_days", label: "Días desde la última visita" },
  { value: "product", label: "Consumió (alguna vez)" },
  { value: "favorite_product", label: "Producto favorito" },
  { value: "total_spent", label: "Total gastado ($)" },
  { value: "age", label: "Edad" },
  { value: "gender", label: "Género" },
  { value: "has_phone", label: "Tiene teléfono" },
  { value: "has_email", label: "Tiene email" },
  { value: "tag", label: "Etiqueta" },
  { value: "question", label: "Respondió una pregunta" },
];

const PRESETS: { label: string; name: string; description: string; rules: SegmentRule[] }[] = [
  {
    label: "⭐ Frecuentes",
    name: "Clientes frecuentes",
    description: "Vinieron 5 veces o más",
    rules: [{ field: "visits", op: "gte", value: 5 }],
  },
  {
    label: "😴 Inactivos 30+ días",
    name: "Inactivos hace 30+ días",
    description: "Para campañas de recupero",
    rules: [{ field: "last_visit_days", op: "gte", value: 30 }],
  },
  {
    label: "🆕 Vinieron una sola vez",
    name: "Vinieron una sola vez",
    description: "Para convertirlos en recurrentes",
    rules: [{ field: "visits", op: "eq", value: 1 }],
  },
  {
    label: "📱 Contactables por WhatsApp",
    name: "Contactables por WhatsApp",
    description: "Dejaron su teléfono",
    rules: [{ field: "has_phone", op: "eq", value: true }],
  },
];

function defaultRule(field: SegmentRule["field"]): SegmentRule {
  switch (field) {
    case "visits": return { field, op: "gte", value: 5 };
    case "last_visit_days": return { field, op: "gte", value: 30 };
    case "age": return { field, op: "between", min: 18, max: 35 };
    case "gender": return { field, op: "eq", value: "Femenino" };
    case "total_spent": return { field, op: "gte", value: 10000 };
    case "has_phone":
    case "has_email": return { field, op: "eq", value: true };
    case "tag": return { field, op: "eq", value: "" };
    case "question": return { field, op: "contains", value: "", questionId: "" };
    default: return { field, op: "contains", value: "" };
  }
}

export function SegmentsView({
  segments,
  tags,
  questions,
  totalCustomers,
}: {
  segments: Segment[];
  tags: Tag[];
  questions: QuestionOption[];
  totalCustomers: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<SegmentRule[]>([defaultRule("visits")]);
  const [preview, setPreview] = useState<{ count: number; with_phone: number; with_email: number; sample: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Segment | null>(null);

  /* Conteo en vivo con debounce */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!editorOpen) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await api<{ count: number; with_phone: number; with_email: number; sample: string[] }>(
          "/api/segments/preview",
          { body: { rules } },
        );
        setPreview(res);
      } catch {
        setPreview(null);
      }
    }, 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [rules, editorOpen]);

  function openCreate(preset?: (typeof PRESETS)[number]) {
    setEditingId(null);
    setName(preset?.name ?? "");
    setDescription(preset?.description ?? "");
    setRules(preset?.rules.map((r) => ({ ...r })) ?? [defaultRule("visits")]);
    setPreview(null);
    setEditorOpen(true);
  }

  function openEdit(s: Segment) {
    setEditingId(s.id);
    setName(s.name);
    setDescription(s.description ?? "");
    setRules(s.rules.map((r) => ({ ...r })));
    setPreview(null);
    setEditorOpen(true);
  }

  async function save() {
    if (name.trim().length < 2) {
      toast("error", "Poné un nombre al segmento");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api(`/api/segments/${editingId}`, { method: "PATCH", body: { name, description, rules } });
        toast("success", "Segmento actualizado");
      } else {
        await api("/api/segments", { body: { name, description: description || undefined, rules } });
        toast("success", "Segmento creado");
      }
      setEditorOpen(false);
      router.refresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    try {
      await api(`/api/segments/${toDelete.id}`, { method: "DELETE" });
      toast("success", "Segmento eliminado");
      setToDelete(null);
      router.refresh();
    } catch {
      toast("error", "No se pudo eliminar");
    }
  }

  const ruleSummary = useMemo(() => describeRules, []);

  return (
    <div className="animate-fade-up">
      {/* Presets + crear */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => openCreate(p)}
            className="rounded-full border border-line-strong/80 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-ink-600 shadow-card transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
          >
            {p.label}
          </button>
        ))}
        <Button onClick={() => openCreate()} className="ml-auto">
          <Plus className="size-4" />
          Nuevo segmento
        </Button>
      </div>

      {segments.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Target}
            title="Creá tu primer segmento"
            description="Por ejemplo: clientes que hace más de 30 días que no vienen, o los que consumieron cerveza. Usá los atajos de arriba para empezar."
            action={
              <Button onClick={() => openCreate()}>
                <Plus className="size-4" />
                Nuevo segmento
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {segments.map((s) => {
            const pct = totalCustomers > 0 ? Math.round(((s.count ?? 0) / totalCustomers) * 100) : 0;
            return (
              <div key={s.id} className="card card-hover group flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-brand-50">
                    <Target className="size-4.5 text-brand-600" strokeWidth={1.75} />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openEdit(s)}
                      className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setToDelete(s)}
                      className="rounded-lg p-1.5 text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="mt-3 text-[15px] font-semibold tracking-tight text-ink-950">{s.name}</h3>
                {s.description && <p className="mt-0.5 text-[12.5px] text-ink-400">{s.description}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.rules.slice(0, 3).map((r, i) => (
                    <span key={i} className="rounded-md bg-ink-100/80 px-2 py-0.5 text-[11px] font-medium text-ink-600">
                      {ruleSummary(r, tags, questions)}
                    </span>
                  ))}
                  {s.rules.length > 3 && (
                    <span className="text-[11px] text-ink-400">+{s.rules.length - 3} más</span>
                  )}
                </div>
                <div className="mt-4 border-t border-line pt-3.5">
                  <div className="flex items-baseline justify-between">
                    <span className="tabular text-[22px] font-semibold tracking-tight text-ink-950">
                      {formatNumber(s.count ?? 0)}
                    </span>
                    <span className="text-[11.5px] text-ink-400">{pct}% de tu base</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-brand-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <Link
                    href={`/app/campanas?segmento=${s.id}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-700 transition-colors hover:text-brand-600"
                  >
                    <Send className="size-3.5" />
                    Crear campaña para este segmento
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingId ? "Editar segmento" : "Nuevo segmento"}
        description="Los clientes que cumplan todas las condiciones entran al segmento (se actualiza solo)."
        wide
        footer={
          <>
            <div className="mr-auto flex items-center gap-2 text-[13px] text-ink-500">
              <Users className="size-4 text-brand-600" />
              {preview ? (
                <span>
                  <strong className="text-ink-950">{formatNumber(preview.count)}</strong> clientes ·{" "}
                  {formatNumber(preview.with_phone)} con teléfono · {formatNumber(preview.with_email)} con email
                </span>
              ) : (
                "Calculando audiencia…"
              )}
            </div>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Guardar segmento</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Fans de la cerveza" autoFocus />
            </Field>
            <Field label="Descripción" optional>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Para qué lo vas a usar" />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-800">Condiciones</p>
            <div className="space-y-2">
              {rules.map((rule, i) => (
                <RuleRow
                  key={i}
                  rule={rule}
                  tags={tags}
                  questions={questions}
                  showAnd={i > 0}
                  onChange={(r) => setRules(rules.map((x, j) => (j === i ? r : x)))}
                  onRemove={rules.length > 1 ? () => setRules(rules.filter((_, j) => j !== i)) : undefined}
                />
              ))}
            </div>
            <button
              onClick={() => setRules([...rules, defaultRule("product")])}
              className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700 transition-colors hover:text-brand-600"
            >
              <Plus className="size-3.5" />
              Agregar condición
            </button>
          </div>

          {preview && preview.sample.length > 0 && (
            <div className="rounded-xl border border-line bg-ink-50/60 px-4 py-3 text-[12.5px] text-ink-500">
              <span className="font-medium text-ink-700">Algunos clientes que entran:</span>{" "}
              {preview.sample.join(", ")}
              {preview.count > preview.sample.length && "…"}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={`¿Eliminar "${toDelete?.name}"?`}
        description="Las campañas que lo usan van a quedar sin segmento asignado."
      />
    </div>
  );
}

/* ————— Fila de condición ————— */

function RuleRow({
  rule,
  tags,
  questions,
  showAnd,
  onChange,
  onRemove,
}: {
  rule: SegmentRule;
  tags: Tag[];
  questions: QuestionOption[];
  showAnd: boolean;
  onChange: (r: SegmentRule) => void;
  onRemove?: () => void;
}) {
  const numberOps = [
    ["gte", "es al menos"],
    ["lte", "es como máximo"],
    ["eq", "es exactamente"],
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-2.5">
      <span className={cn("w-10 text-center text-[11px] font-bold uppercase", showAnd ? "text-brand-600" : "text-ink-300")}>
        {showAnd ? "Y" : "Si"}
      </span>
      <select
        value={rule.field}
        onChange={(e) => onChange(defaultRule(e.target.value as SegmentRule["field"]))}
        className="h-8.5 rounded-lg border border-line-strong/80 bg-white px-2.5 text-[13px] outline-none transition focus:border-brand-500"
      >
        {FIELD_DEFS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      {(rule.field === "visits" || rule.field === "last_visit_days" || rule.field === "total_spent") && (
        <>
          <select
            value={rule.op}
            onChange={(e) => onChange({ ...rule, op: e.target.value as SegmentRule["op"] })}
            className="h-8.5 rounded-lg border border-line-strong/80 bg-white px-2.5 text-[13px] outline-none focus:border-brand-500"
          >
            {numberOps.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={Number(rule.value ?? 0)}
            onChange={(e) => onChange({ ...rule, value: Number(e.target.value) })}
            className="h-8.5 w-24 rounded-lg border border-line-strong/80 bg-white px-2.5 text-[13px] outline-none focus:border-brand-500"
          />
          {rule.field === "last_visit_days" && <span className="text-[12.5px] text-ink-400">días</span>}
        </>
      )}

      {rule.field === "age" && (
        <>
          <span className="text-[13px] text-ink-500">entre</span>
          <input
            type="number"
            value={rule.min ?? 18}
            onChange={(e) => onChange({ ...rule, min: Number(e.target.value) })}
            className="h-8.5 w-20 rounded-lg border border-line-strong/80 bg-white px-2.5 text-[13px] outline-none focus:border-brand-500"
          />
          <span className="text-[13px] text-ink-500">y</span>
          <input
            type="number"
            value={rule.max ?? 35}
            onChange={(e) => onChange({ ...rule, max: Number(e.target.value) })}
            className="h-8.5 w-20 rounded-lg border border-line-strong/80 bg-white px-2.5 text-[13px] outline-none focus:border-brand-500"
          />
          <span className="text-[12.5px] text-ink-400">años</span>
        </>
      )}

      {rule.field === "gender" && (
        <select
          value={String(rule.value ?? "")}
          onChange={(e) => onChange({ ...rule, value: e.target.value })}
          className="h-8.5 rounded-lg border border-line-strong/80 bg-white px-2.5 text-[13px] outline-none focus:border-brand-500"
        >
          <option>Femenino</option>
          <option>Masculino</option>
          <option>Otro / sin especificar</option>
        </select>
      )}

      {(rule.field === "product" || rule.field === "favorite_product") && (
        <>
          <span className="text-[13px] text-ink-500">incluye</span>
          <input
            value={String(rule.value ?? "")}
            onChange={(e) => onChange({ ...rule, value: e.target.value, op: "contains" })}
            placeholder="Ej.: cerveza"
            className="h-8.5 w-44 rounded-lg border border-line-strong/80 bg-white px-2.5 text-[13px] outline-none focus:border-brand-500"
          />
        </>
      )}

      {(rule.field === "has_phone" || rule.field === "has_email") && (
        <select
          value={rule.value === false ? "no" : "si"}
          onChange={(e) => onChange({ ...rule, value: e.target.value === "si" })}
          className="h-8.5 rounded-lg border border-line-strong/80 bg-white px-2.5 text-[13px] outline-none focus:border-brand-500"
        >
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
      )}

      {rule.field === "tag" && (
        <select
          value={String(rule.value ?? "")}
          onChange={(e) => onChange({ ...rule, value: e.target.value })}
          className="h-8.5 rounded-lg border border-line-strong/80 bg-white px-2.5 text-[13px] outline-none focus:border-brand-500"
        >
          <option value="">Elegí una etiqueta…</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}

      {rule.field === "question" && (
        <>
          <select
            value={rule.questionId ?? ""}
            onChange={(e) => onChange({ ...rule, questionId: e.target.value })}
            className="h-8.5 max-w-56 rounded-lg border border-line-strong/80 bg-white px-2.5 text-[13px] outline-none focus:border-brand-500"
          >
            <option value="">Elegí la pregunta…</option>
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
          <span className="text-[13px] text-ink-500">respuesta incluye</span>
          <input
            value={String(rule.value ?? "")}
            onChange={(e) => onChange({ ...rule, value: e.target.value })}
            placeholder="cualquiera"
            className="h-8.5 w-36 rounded-lg border border-line-strong/80 bg-white px-2.5 text-[13px] outline-none focus:border-brand-500"
          />
        </>
      )}

      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-auto rounded-lg p-1.5 text-ink-300 transition hover:bg-danger-50 hover:text-danger-600"
          aria-label="Quitar condición"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/* ————— Resumen legible de una regla ————— */

function describeRules(r: SegmentRule, tags: Tag[], questions: QuestionOption[]): string {
  const ops: Record<string, string> = { gte: "≥", lte: "≤", eq: "=", neq: "≠", contains: "incluye" };
  switch (r.field) {
    case "visits": return `Visitas ${ops[r.op]} ${r.value}`;
    case "last_visit_days": return r.op === "gte" ? `Inactivo ${r.value}+ días` : `Activo en ${r.value} días`;
    case "age": return r.op === "between" ? `Edad ${r.min}–${r.max}` : `Edad ${ops[r.op]} ${r.value}`;
    case "gender": return `${r.value}`;
    case "product": return `Consumió "${r.value}"`;
    case "favorite_product": return `Favorito: "${r.value}"`;
    case "total_spent": return `Gastó ${ops[r.op]} $${formatNumber(Number(r.value ?? 0))}`;
    case "has_phone": return r.value === false ? "Sin teléfono" : "Con teléfono";
    case "has_email": return r.value === false ? "Sin email" : "Con email";
    case "tag": {
      const tag = tags.find((t) => t.id === r.value || t.name === r.value);
      return `Etiqueta: ${tag?.name ?? r.value}`;
    }
    case "question": {
      const q = questions.find((x) => x.id === r.questionId);
      return r.value ? `"${q?.label ?? "Pregunta"}" ${ops[r.op] ?? ""} ${r.value}` : `Respondió "${q?.label ?? "pregunta"}"`;
    }
    default: return "";
  }
}
