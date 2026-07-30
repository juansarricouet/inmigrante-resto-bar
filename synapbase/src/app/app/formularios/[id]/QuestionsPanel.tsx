"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleDot,
  GaugeCircle,
  GripVertical,
  Hash,
  Pencil,
  Plus,
  ToggleLeft,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { MapsTo, Question, QuestionType } from "@/lib/types";

const TYPE_META: Record<QuestionType, { label: string; icon: React.ElementType }> = {
  text: { label: "Texto", icon: AlignLeft },
  number: { label: "Número", icon: Hash },
  select: { label: "Selección única", icon: CircleDot },
  multiselect: { label: "Selección múltiple", icon: CheckSquare },
  boolean: { label: "Sí / No", icon: ToggleLeft },
  date: { label: "Fecha", icon: Calendar },
  scale: { label: "Escala", icon: GaugeCircle },
};

const MAPS_TO_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "No guardar como dato del cliente" },
  { value: "name", label: "Nombre del cliente" },
  { value: "product", label: "Producto consumido" },
  { value: "phone", label: "Teléfono" },
  { value: "email", label: "Email" },
  { value: "gender", label: "Género" },
  { value: "age", label: "Edad" },
  { value: "amount", label: "Monto gastado" },
];

const MAPS_TO_BADGE: Record<string, string> = {
  name: "Nombre",
  product: "Producto",
  phone: "Teléfono",
  email: "Email",
  gender: "Género",
  age: "Edad",
  amount: "Monto",
};

interface EditorState {
  id: string | null; // null = nueva
  type: QuestionType;
  label: string;
  placeholder: string;
  optionsText: string;
  required: boolean;
  maps_to: string;
  scale_max: number;
}

const emptyEditor = (type: QuestionType = "text"): EditorState => ({
  id: null,
  type,
  label: "",
  placeholder: "",
  optionsText: "",
  required: false,
  maps_to: "",
  scale_max: 10,
});

export function QuestionsPanel({
  formId,
  questions,
  onChange,
}: {
  formId: string;
  questions: Question[];
  onChange: (qs: Question[]) => void;
}) {
  const toast = useToast();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    const next = arrayMove(questions, oldIndex, newIndex).map((q, i) => ({ ...q, position: i }));
    onChange(next);
    try {
      await api(`/api/forms/${formId}/questions`, {
        method: "PUT",
        body: { orderedIds: next.map((q) => q.id) },
      });
    } catch {
      toast("error", "No se pudo guardar el orden");
    }
  }

  async function toggleActive(q: Question, active: boolean) {
    onChange(questions.map((x) => (x.id === q.id ? { ...x, active } : x)));
    try {
      await api(`/api/forms/${formId}/questions/${q.id}`, { method: "PATCH", body: { active } });
    } catch {
      toast("error", "No se pudo actualizar");
    }
  }

  async function saveEditor() {
    if (!editor) return;
    if (editor.label.trim().length === 0) {
      toast("error", "Escribí el texto de la pregunta");
      return;
    }
    const needsOptions = editor.type === "select" || editor.type === "multiselect";
    const options = editor.optionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (needsOptions && options.length < 2) {
      toast("error", "Agregá al menos dos opciones (una por línea)");
      return;
    }
    setSaving(true);
    const body = {
      type: editor.type,
      label: editor.label.trim(),
      placeholder: editor.placeholder.trim() || undefined,
      options: needsOptions ? options : [],
      required: editor.required,
      maps_to: (editor.maps_to || null) as MapsTo,
      scale_max: editor.type === "scale" ? editor.scale_max : null,
    };
    try {
      if (editor.id) {
        const { question } = await api<{ question: Question }>(
          `/api/forms/${formId}/questions/${editor.id}`,
          { method: "PATCH", body },
        );
        onChange(questions.map((q) => (q.id === editor.id ? question : q)));
      } else {
        const { question } = await api<{ question: Question }>(`/api/forms/${formId}/questions`, { body });
        onChange([...questions, question]);
      }
      setEditor(null);
      toast("success", "Pregunta guardada");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    try {
      await api(`/api/forms/${formId}/questions/${toDelete.id}`, { method: "DELETE" });
      onChange(questions.filter((q) => q.id !== toDelete.id));
      setToDelete(null);
      toast("success", "Pregunta eliminada");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  function openEdit(q: Question) {
    setEditor({
      id: q.id,
      type: q.type,
      label: q.label,
      placeholder: q.placeholder ?? "",
      optionsText: q.options.join("\n"),
      required: q.required,
      maps_to: q.maps_to ?? "",
      scale_max: q.scale_max ?? 10,
    });
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {questions.map((q, i) => (
              <SortableQuestion
                key={q.id}
                question={q}
                index={i}
                onEdit={() => openEdit(q)}
                onDelete={() => setToDelete(q)}
                onToggle={(v) => toggleActive(q, v)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {/* Agregar pregunta */}
      <div className="relative mt-4">
        <button
          onClick={() => setAddMenuOpen((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-white/60 py-3.5 text-sm font-medium text-ink-500 transition-all hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-700"
        >
          <Plus className="size-4" />
          Agregar pregunta
          <ChevronDown className={cn("size-3.5 transition-transform", addMenuOpen && "rotate-180")} />
        </button>
        {addMenuOpen && (
          <div className="absolute inset-x-0 z-30 mt-2 grid grid-cols-2 gap-1 rounded-xl border border-line bg-white p-1.5 shadow-pop animate-scale-in sm:grid-cols-4">
            {(Object.keys(TYPE_META) as QuestionType[]).map((t) => {
              const Meta = TYPE_META[t];
              return (
                <button
                  key={t}
                  onClick={() => {
                    setAddMenuOpen(false);
                    setEditor(emptyEditor(t));
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-lg px-3 py-3 text-center transition-colors hover:bg-brand-50"
                >
                  <Meta.icon className="size-4.5 text-brand-600" strokeWidth={1.75} />
                  <span className="text-xs font-medium text-ink-700">{Meta.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor */}
      <Modal
        open={!!editor}
        onClose={() => setEditor(null)}
        title={editor?.id ? "Editar pregunta" : "Nueva pregunta"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditor(null)}>Cancelar</Button>
            <Button onClick={saveEditor} loading={saving}>Guardar pregunta</Button>
          </>
        }
      >
        {editor && (
          <div className="space-y-4">
            <Field label="Pregunta">
              <Input
                value={editor.label}
                onChange={(e) => setEditor({ ...editor, label: e.target.value })}
                placeholder="Ej.: ¿Qué consumiste hoy?"
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo de respuesta">
                <Select
                  value={editor.type}
                  onChange={(e) => setEditor({ ...editor, type: e.target.value as QuestionType })}
                >
                  {(Object.keys(TYPE_META) as QuestionType[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_META[t].label}
                    </option>
                  ))}
                </Select>
              </Field>
              {editor.type === "scale" ? (
                <Field label="Escala hasta">
                  <Select
                    value={String(editor.scale_max)}
                    onChange={(e) => setEditor({ ...editor, scale_max: Number(e.target.value) })}
                  >
                    <option value="5">1 a 5</option>
                    <option value="10">1 a 10</option>
                  </Select>
                </Field>
              ) : (
                <Field label="Texto de ayuda" optional>
                  <Input
                    value={editor.placeholder}
                    onChange={(e) => setEditor({ ...editor, placeholder: e.target.value })}
                    placeholder="Placeholder…"
                  />
                </Field>
              )}
            </div>

            {(editor.type === "select" || editor.type === "multiselect") && (
              <Field label="Opciones" hint="Una opción por línea. Ideal para cargar tu carta o menú.">
                <textarea
                  value={editor.optionsText}
                  onChange={(e) => setEditor({ ...editor, optionsText: e.target.value })}
                  rows={5}
                  placeholder={"Café\nMedialunas\nTostado"}
                  className="w-full rounded-[10px] border border-line-strong/80 bg-white px-3.5 py-2.5 text-sm leading-relaxed shadow-[0_1px_2px_rgb(23_23_28/0.04)] outline-none transition-all placeholder:text-ink-400 focus:border-brand-500 focus:ring-[3px] focus:ring-brand-100"
                />
              </Field>
            )}

            <Field
              label="Dato del cliente"
              hint="Si la respuesta corresponde a un dato de la ficha (nombre, teléfono, producto…), elegilo acá y SynapBase lo guarda automáticamente."
            >
              <Select
                value={editor.maps_to}
                onChange={(e) => setEditor({ ...editor, maps_to: e.target.value })}
              >
                {MAPS_TO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <label className="flex items-center justify-between rounded-xl border border-line bg-ink-50/50 px-4 py-3">
              <span className="text-[13px] font-medium text-ink-800">Respuesta obligatoria</span>
              <Switch checked={editor.required} onChange={(v) => setEditor({ ...editor, required: v })} />
            </label>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title="¿Eliminar esta pregunta?"
        description="También se eliminan las respuestas ya guardadas de esta pregunta."
      />
    </div>
  );
}

function SortableQuestion({
  question: q,
  index,
  onEdit,
  onDelete,
  onToggle,
}: {
  question: Question;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const Meta = TYPE_META[q.type];

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "card flex items-center gap-3 px-3.5 py-3 transition-shadow",
        isDragging && "z-10 shadow-pop ring-2 ring-brand-200",
        !q.active && "opacity-55",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded-lg p-1.5 text-ink-300 transition-colors hover:bg-ink-100 hover:text-ink-600 active:cursor-grabbing"
        aria-label="Reordenar"
      >
        <GripVertical className="size-4" />
      </button>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[11.5px] font-bold text-brand-700">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink-950">
          {q.label}
          {q.required && <span className="ml-1 text-danger-600">*</span>}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-ink-100/80 px-1.5 py-0.5 text-[11px] font-medium text-ink-500">
            <Meta.icon className="size-3" />
            {Meta.label}
          </span>
          {q.maps_to && <Badge color="violet">{MAPS_TO_BADGE[q.maps_to]}</Badge>}
          {q.options.length > 0 && (
            <span className="text-[11px] text-ink-400">{q.options.length} opciones</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Switch size="sm" checked={q.active} onChange={onToggle} />
        <button
          onClick={onEdit}
          className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          aria-label="Editar"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
          aria-label="Eliminar"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
