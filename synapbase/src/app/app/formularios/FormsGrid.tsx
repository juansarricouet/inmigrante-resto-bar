"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Copy,
  ExternalLink,
  FileStack,
  Link2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  QrCode,
  ScanLine,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { Dropdown, DropdownItem, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { formatNumber, timeAgo } from "@/lib/utils";
import type { Form } from "@/lib/types";

export function FormsGrid({ forms }: { forms: Form[] }) {
  const router = useRouter();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Form | null>(null);

  const regular = forms.filter((f) => !f.is_template);
  const templates = forms.filter((f) => f.is_template);

  async function createForm() {
    if (newName.trim().length < 2) return;
    setCreating(true);
    try {
      const { form } = await api<{ form: Form }>("/api/forms", { body: { name: newName.trim() } });
      toast("success", "Formulario creado");
      router.push(`/app/formularios/${form.id}`);
      router.refresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo crear");
      setCreating(false);
    }
  }

  async function duplicate(form: Form, asTemplate: boolean) {
    try {
      await api(`/api/forms/${form.id}/duplicate`, { body: { asTemplate } });
      toast("success", asTemplate ? "Plantilla guardada" : "Formulario duplicado");
      router.refresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo duplicar");
    }
  }

  async function toggleStatus(form: Form) {
    try {
      await api(`/api/forms/${form.id}`, {
        method: "PATCH",
        body: { status: form.status === "active" ? "paused" : "active" },
      });
      toast("success", form.status === "active" ? "Formulario pausado" : "Formulario activado");
      router.refresh();
    } catch {
      toast("error", "No se pudo cambiar el estado");
    }
  }

  async function remove() {
    if (!toDelete) return;
    try {
      await api(`/api/forms/${toDelete.id}`, { method: "DELETE" });
      toast("success", "Formulario eliminado");
      setToDelete(null);
      router.refresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  function copyLink(form: Form) {
    navigator.clipboard.writeText(`${location.origin}/f/${form.slug}`);
    toast("success", "Link copiado al portapapeles");
  }

  const FormCard = ({ form }: { form: Form }) => (
    <div className="card card-hover group relative flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/app/formularios/${form.id}`} className="min-w-0 flex-1">
          <div className="flex size-10 items-center justify-center rounded-xl text-xl" style={{ background: `${form.theme.color}14` }}>
            {form.theme.emoji || "📋"}
          </div>
          <h3 className="mt-3 truncate text-[15px] font-semibold tracking-tight text-ink-950 group-hover:text-brand-800">
            {form.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-ink-400">/f/{form.slug}</p>
        </Link>
        <div className="flex items-center gap-1.5">
          {form.is_template ? (
            <Badge color="sky">Plantilla</Badge>
          ) : form.status === "active" ? (
            <Badge color="green" dot>Activo</Badge>
          ) : (
            <Badge color="amber" dot>Pausado</Badge>
          )}
          <Dropdown
            trigger={
              <button className="rounded-lg p-1.5 text-ink-400 opacity-0 transition-all hover:bg-ink-100 hover:text-ink-700 group-hover:opacity-100">
                <MoreHorizontal className="size-4" />
              </button>
            }
          >
            {!form.is_template && (
              <>
                <DropdownItem icon={Link2} onClick={() => copyLink(form)}>Copiar link</DropdownItem>
                <DropdownItem icon={QrCode} onClick={() => router.push(`/app/formularios/${form.id}?tab=qr`)}>
                  Ver código QR
                </DropdownItem>
                <DropdownItem icon={form.status === "active" ? Pause : Play} onClick={() => toggleStatus(form)}>
                  {form.status === "active" ? "Pausar" : "Activar"}
                </DropdownItem>
              </>
            )}
            <DropdownItem icon={Copy} onClick={() => duplicate(form, false)}>Duplicar</DropdownItem>
            {!form.is_template && (
              <DropdownItem icon={FileStack} onClick={() => duplicate(form, true)}>Guardar como plantilla</DropdownItem>
            )}
            <DropdownItem icon={Trash2} danger onClick={() => setToDelete(form)}>Eliminar</DropdownItem>
          </Dropdown>
        </div>
      </div>

      {!form.is_template && (
        <div className="mt-4 flex items-center gap-4 border-t border-line pt-3.5 text-[12.5px] text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5 text-ink-400" />
            {formatNumber(form.submissions_count ?? 0)} respuestas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ScanLine className="size-3.5 text-ink-400" />
            {formatNumber(form.scans_count ?? 0)} escaneos
          </span>
          <span className="ml-auto text-ink-400">{timeAgo(form.updated_at)}</span>
        </div>
      )}
      {form.is_template && (
        <div className="mt-4 border-t border-line pt-3.5">
          <button
            onClick={() => duplicate(form, false)}
            className="text-[13px] font-semibold text-brand-700 transition-colors hover:text-brand-600"
          >
            Crear formulario desde esta plantilla →
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Nueva encuesta
        </Button>
      </div>

      {regular.length === 0 && templates.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ClipboardList}
            title="Creá tu primer formulario"
            description="Definí qué querés saber de tus clientes y generá el QR para tu local."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Nueva encuesta
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {regular.map((f) => (
              <FormCard key={f.id} form={f} />
            ))}
          </div>
          {templates.length > 0 && (
            <>
              <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wide text-ink-400">
                Plantillas guardadas
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {templates.map((f) => (
                  <FormCard key={f.id} form={f} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nueva encuesta"
        description="Arranca con las preguntas esenciales; después la personalizás."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={createForm} loading={creating}>Crear y personalizar</Button>
          </>
        }
      >
        <Field label="Nombre" hint="Es interno, tus clientes no lo ven.">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createForm()}
            placeholder="Ej.: Encuesta de mostrador"
            autoFocus
          />
        </Field>
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={`¿Eliminar "${toDelete?.name}"?`}
        description="Se van a borrar el formulario, sus preguntas y todas las respuestas asociadas. Esta acción no se puede deshacer."
      />

      <div className="mt-8 flex items-start gap-2.5 rounded-xl border border-line bg-ink-50/60 px-4 py-3.5 text-[12.5px] leading-relaxed text-ink-500">
        <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Consejo: colocá el QR impreso en mesas, mostrador o vidriera con un cartel del estilo{" "}
          <em className="font-medium text-ink-700">“Escaneá el QR y obtené un 10% de descuento”</em>. El
          descuento es el incentivo; los datos son el verdadero valor.
        </span>
      </div>
    </div>
  );
}
