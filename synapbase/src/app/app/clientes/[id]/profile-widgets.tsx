"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardList, MoreHorizontal, Pencil, Plus, StickyNote, Trash2 } from "lucide-react";
import { Badge, TAG_COLORS, type BadgeColor } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { Dropdown, DropdownItem } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";
import type { Tag } from "@/lib/types";
import type { CustomerHistoryEntry } from "@/server/services/customers";

/* ————— Acciones (editar / eliminar) ————— */

interface EditableCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  age: number | null;
}

export function CustomerActions({ customer }: { customer: EditableCustomer }) {
  const router = useRouter();
  const toast = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    gender: customer.gender ?? "",
    age: customer.age?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api(`/api/customers/${customer.id}`, {
        method: "PATCH",
        body: {
          name: form.name,
          phone: form.phone || null,
          email: form.email || null,
          gender: form.gender || null,
          age: form.age ? Number(form.age) : null,
        },
      });
      toast("success", "Cliente actualizado");
      setEditOpen(false);
      router.refresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await api(`/api/customers/${customer.id}`, { method: "DELETE" });
      toast("success", "Cliente eliminado");
      router.push("/app/clientes");
      router.refresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  return (
    <>
      <Dropdown
        trigger={
          <button className="flex size-9 items-center justify-center rounded-[10px] border border-line-strong/80 bg-white text-ink-500 shadow-card transition hover:bg-ink-50">
            <MoreHorizontal className="size-4.5" />
          </button>
        }
      >
        <DropdownItem icon={Pencil} onClick={() => setEditOpen(true)}>
          Editar datos
        </DropdownItem>
        <DropdownItem icon={Trash2} danger onClick={() => setDeleteOpen(true)}>
          Eliminar cliente
        </DropdownItem>
      </Dropdown>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar cliente"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} loading={saving}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nombre">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Género">
              <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Sin dato</option>
                <option>Femenino</option>
                <option>Masculino</option>
                <option>Otro / sin especificar</option>
              </Select>
            </Field>
            <Field label="Edad">
              <Input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="—"
              />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={remove}
        title="¿Eliminar este cliente?"
        description="Se van a borrar sus datos y todo su historial de visitas. Esta acción no se puede deshacer."
      />
    </>
  );
}

/* ————— Notas ————— */

export function NotesCard({ customerId, initialNotes }: { customerId: string; initialNotes: string | null }) {
  const toast = useToast();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api(`/api/customers/${customerId}`, { method: "PATCH", body: { notes: notes || null } });
      toast("success", "Nota guardada");
      setDirty(false);
    } catch {
      toast("error", "No se pudo guardar la nota");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-5">
      <h3 className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-ink-950">
        <StickyNote className="size-4 text-ink-400" />
        Notas internas
      </h3>
      <Textarea
        className="mt-3 text-[13px]"
        placeholder="Ej.: pide siempre leche de almendras, viene con su perro…"
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setDirty(true);
        }}
      />
      {dirty && (
        <div className="mt-2.5 flex justify-end">
          <Button size="sm" onClick={save} loading={saving}>
            Guardar nota
          </Button>
        </div>
      )}
    </section>
  );
}

/* ————— Etiquetas ————— */

export function TagsEditor({
  customerId,
  allTags,
  activeTagIds,
}: {
  customerId: string;
  allTags: Tag[];
  activeTagIds: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [active, setActive] = useState<Set<string>>(new Set(activeTagIds));
  const [tags, setTags] = useState(allTags);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  async function persist(next: Set<string>) {
    setActive(new Set(next));
    try {
      await api(`/api/customers/${customerId}/tags`, { method: "PUT", body: { tagIds: [...next] } });
      router.refresh();
    } catch {
      toast("error", "No se pudieron guardar las etiquetas");
    }
  }

  async function createTag() {
    if (!newName.trim()) return;
    try {
      const { tag } = await api<{ tag: Tag }>("/api/tags", {
        body: { name: newName.trim(), color: TAG_COLORS[tags.length % TAG_COLORS.length] },
      });
      setTags((t) => (t.some((x) => x.id === tag.id) ? t : [...t, tag]));
      setNewName("");
      setCreating(false);
      await persist(new Set([...active, tag.id]));
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo crear la etiqueta");
    }
  }

  return (
    <section className="card p-5">
      <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Etiquetas</h3>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => {
          const on = active.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => {
                const next = new Set(active);
                if (on) next.delete(t.id);
                else next.add(t.id);
                void persist(next);
              }}
              className={cn("transition-transform active:scale-95", !on && "opacity-45 grayscale-[0.4] hover:opacity-80")}
            >
              <Badge color={t.color as BadgeColor}>
                {on && <Check className="size-3" />}
                {t.name}
              </Badge>
            </button>
          );
        })}
        {creating ? (
          <span className="inline-flex items-center gap-1.5">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTag()}
              onBlur={() => (newName.trim() ? createTag() : setCreating(false))}
              placeholder="Nombre…"
              className="h-6.5 w-28 rounded-full border border-brand-300 bg-white px-2.5 text-xs outline-none focus:ring-2 focus:ring-brand-100"
            />
          </span>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink-300 px-2.5 py-0.5 text-xs font-medium text-ink-500 transition hover:border-brand-400 hover:text-brand-700"
          >
            <Plus className="size-3" />
            Nueva
          </button>
        )}
      </div>
    </section>
  );
}

/* ————— Historial ————— */

export function HistoryList({ history }: { history: CustomerHistoryEntry[] }) {
  const [expanded, setExpanded] = useState<string | null>(history[0]?.submission_id ?? null);

  return (
    <section className="card p-5">
      <h3 className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-ink-950">
        <ClipboardList className="size-4 text-ink-400" />
        Historial completo
        <span className="ml-auto text-xs font-normal text-ink-400">{history.length} registros</span>
      </h3>

      <ol className="relative mt-5 space-y-3 before:absolute before:inset-y-1 before:left-[9px] before:w-px before:bg-line">
        {history.map((h) => {
          const open = expanded === h.submission_id;
          return (
            <li key={h.submission_id} className="relative pl-8">
              <span className="absolute left-0 top-1.5 flex size-[19px] items-center justify-center rounded-full border-2 border-white bg-brand-100 ring-1 ring-line">
                <span className="size-1.5 rounded-full bg-brand-600" />
              </span>
              <button
                onClick={() => setExpanded(open ? null : h.submission_id)}
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-left transition-all duration-150",
                  open ? "border-brand-200 bg-brand-50/50" : "border-line bg-white hover:border-ink-300",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-[13.5px] font-medium text-ink-950">
                    {h.product ?? h.form_name}
                    {h.amount != null && h.amount > 0 && (
                      <span className="tabular ml-2 text-[12.5px] font-normal text-ink-500">{formatMoney(h.amount)}</span>
                    )}
                  </p>
                  <span className="text-xs text-ink-400">{formatDateTime(h.created_at)}</span>
                </div>
                {open && (
                  <div className="mt-3 space-y-1.5 border-t border-line/80 pt-3 animate-fade-in">
                    {h.answers.map((a) => (
                      <div key={a.question_id} className="flex items-baseline justify-between gap-4 text-[12.5px]">
                        <span className="text-ink-500">{a.label}</span>
                        <span className="text-right font-medium text-ink-800">
                          {Array.isArray(a.value)
                            ? (a.value as string[]).join(", ")
                            : typeof a.value === "boolean"
                              ? a.value
                                ? "Sí"
                                : "No"
                              : String(a.value ?? "—")}
                        </span>
                      </div>
                    ))}
                    {h.discount_code && (
                      <p className="pt-1 text-right font-mono text-[11px] text-ink-400">Cupón {h.discount_code}</p>
                    )}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
