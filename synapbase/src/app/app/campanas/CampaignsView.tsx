"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  ChevronRight,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { cn, formatDateTime, formatNumber, timeAgo } from "@/lib/utils";
import type { Campaign, CampaignChannel, Segment } from "@/lib/types";

const VARIABLES = [
  { token: "{{nombre}}", label: "Nombre" },
  { token: "{{producto_favorito}}", label: "Producto favorito" },
  { token: "{{visitas}}", label: "Visitas" },
];

interface AudienceInfo {
  count: number;
  sample: { name: string; favorite_product: string | null; visits: number } | null;
}

function renderPreview(template: string, sample: AudienceInfo["sample"]): string {
  const s = sample ?? { name: "Juan Pérez", favorite_product: "tu pedido de siempre", visits: 6 };
  return template
    .replaceAll("{{nombre}}", s.name.split(" ")[0] ?? s.name)
    .replaceAll("{{nombre_completo}}", s.name)
    .replaceAll("{{producto_favorito}}", s.favorite_product ?? "tu pedido de siempre")
    .replaceAll("{{visitas}}", String(s.visits));
}

export function CampaignsView({
  campaigns,
  segments,
  presetSegmentId,
}: {
  campaigns: Campaign[];
  segments: Segment[];
  presetSegmentId: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [wizardOpen, setWizardOpen] = useState(!!presetSegmentId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>("whatsapp");
  const [segmentId, setSegmentId] = useState<string | null>(presetSegmentId);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState(
    "Hola {{nombre}} 👋 Hace un tiempo que no venís. Esta semana tenés un beneficio especial: mostrá este mensaje y llevate un descuento en {{producto_favorito}}.",
  );
  const [schedule, setSchedule] = useState("");
  const [audience, setAudience] = useState<AudienceInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Campaign | null>(null);
  const [toSend, setToSend] = useState<Campaign | null>(null);

  /* Audiencia en vivo según segmento + canal */
  useEffect(() => {
    if (!wizardOpen) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api<AudienceInfo>("/api/campaigns/audience", {
          body: { segment_id: segmentId, channel },
        });
        if (!cancelled) setAudience(res);
      } catch {
        if (!cancelled) setAudience(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wizardOpen, segmentId, channel]);

  const drafts = campaigns.filter((c) => c.status === "draft");
  const scheduled = campaigns.filter((c) => c.status === "scheduled");
  const sent = campaigns.filter((c) => c.status === "sent");

  function openCreate() {
    setEditingId(null);
    setStep(0);
    setName("");
    setChannel("whatsapp");
    setSegmentId(presetSegmentId);
    setSubject("");
    setMessage(
      "Hola {{nombre}} 👋 Hace un tiempo que no venís. Esta semana tenés un beneficio especial: mostrá este mensaje y llevate un descuento en {{producto_favorito}}.",
    );
    setSchedule("");
    setWizardOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id);
    setStep(0);
    setName(c.name);
    setChannel(c.channel);
    setSegmentId(c.segment_id);
    setSubject(c.subject ?? "");
    setMessage(c.message);
    setSchedule(c.scheduled_for ? c.scheduled_for.slice(0, 16) : "");
    setWizardOpen(true);
  }

  async function persist(status: "draft" | "scheduled") {
    if (name.trim().length < 2) {
      toast("error", "Poné un nombre a la campaña");
      setStep(0);
      return;
    }
    if (status === "scheduled" && !schedule) {
      toast("error", "Elegí fecha y hora de envío");
      return;
    }
    setSaving(true);
    const body = {
      name: name.trim(),
      channel,
      segment_id: segmentId,
      subject: channel === "email" ? subject || null : null,
      message,
      status,
      scheduled_for: status === "scheduled" ? new Date(schedule).toISOString() : null,
    };
    try {
      if (editingId) {
        await api(`/api/campaigns/${editingId}`, { method: "PATCH", body });
      } else {
        await api("/api/campaigns", { body });
      }
      toast("success", status === "draft" ? "Borrador guardado" : "Campaña programada");
      setWizardOpen(false);
      router.refresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function dispatch() {
    if (!toSend) return;
    try {
      await api(`/api/campaigns/${toSend.id}/send`, { body: {} });
      toast("success", "Campaña marcada como enviada: audiencia registrada");
      setToSend(null);
      router.refresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo enviar");
      setToSend(null);
    }
  }

  async function remove() {
    if (!toDelete) return;
    try {
      await api(`/api/campaigns/${toDelete.id}`, { method: "DELETE" });
      toast("success", "Campaña eliminada");
      setToDelete(null);
      router.refresh();
    } catch {
      toast("error", "No se pudo eliminar");
    }
  }

  const selectedSegment = segments.find((s) => s.id === segmentId);
  const steps = ["Campaña", "Audiencia", "Mensaje"];

  const CampaignRow = ({ c }: { c: Campaign }) => (
    <div className="card card-hover flex flex-wrap items-center gap-4 px-5 py-4">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          c.channel === "whatsapp" ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600",
        )}
      >
        {c.channel === "whatsapp" ? <MessageCircle className="size-4.5" /> : <Mail className="size-4.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold tracking-tight text-ink-950">{c.name}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-400">
          {c.segment_name ?? "Todos los clientes"} · {formatNumber(c.audience_count)} destinatarios
          {c.status === "scheduled" && c.scheduled_for && ` · sale ${formatDateTime(c.scheduled_for)}`}
          {c.status === "sent" && c.sent_at && ` · enviada ${timeAgo(c.sent_at)}`}
          {c.status === "draft" && ` · editada ${timeAgo(c.updated_at)}`}
        </p>
      </div>
      {c.status === "draft" && <Badge color="gray">Borrador</Badge>}
      {c.status === "scheduled" && <Badge color="amber" dot>Programada</Badge>}
      {c.status === "sent" && <Badge color="green" dot>Enviada</Badge>}
      <div className="flex items-center gap-1">
        {c.status !== "sent" && (
          <>
            <button
              onClick={() => openEdit(c)}
              className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              title="Editar"
            >
              <Pencil className="size-4" />
            </button>
            <button
              onClick={() => setToSend(c)}
              className="rounded-lg p-2 text-ink-400 transition hover:bg-success-50 hover:text-success-600"
              title="Enviar ahora"
            >
              <Send className="size-4" />
            </button>
          </>
        )}
        <button
          onClick={() => setToDelete(c)}
          className="rounded-lg p-2 text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
          title="Eliminar"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-up">
      <div className="mb-5 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nueva campaña
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Send}
            title="Tu primera campaña de retorno"
            description={'Elegí un segmento y mandá un mensaje personalizado: "Hola Juan, volvió tu hamburguesa favorita". Los datos ya los tenés.'}
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                Nueva campaña
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { title: "Borradores", list: drafts },
            { title: "Programadas", list: scheduled },
            { title: "Historial", list: sent },
          ]
            .filter((s) => s.list.length > 0)
            .map((section) => (
              <section key={section.title}>
                <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-ink-400">
                  {section.title} · {section.list.length}
                </h2>
                <div className="space-y-2.5">
                  {section.list.map((c) => (
                    <CampaignRow key={c.id} c={c} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}

      {/* Wizard */}
      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title={editingId ? "Editar campaña" : "Nueva campaña"}
        wide
        footer={
          <>
            <div className="mr-auto flex items-center gap-2 text-[13px] text-ink-500">
              <Users className="size-4 text-brand-600" />
              {audience ? (
                <span>
                  <strong className="text-ink-950">{formatNumber(audience.count)}</strong> clientes van a recibir este mensaje
                </span>
              ) : (
                "Calculando…"
              )}
            </div>
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Atrás
              </Button>
            )}
            {step < 2 ? (
              <Button onClick={() => setStep(step + 1)}>
                Continuar
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => persist("draft")} loading={saving}>
                  Guardar borrador
                </Button>
                <Button onClick={() => persist("scheduled")} loading={saving} disabled={!schedule}>
                  <CalendarClock className="size-4" />
                  Programar
                </Button>
              </>
            )}
          </>
        }
      >
        {/* Pasos */}
        <div className="mb-5 flex items-center gap-2">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-all",
                i === step ? "bg-ink-950 text-white" : i < step ? "bg-brand-100 text-brand-800" : "bg-ink-100 text-ink-400",
              )}
            >
              {i < step ? <Check className="size-3" /> : <span className="text-[11px] font-bold">{i + 1}</span>}
              {s}
            </button>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <Field label="Nombre de la campaña" hint="Interno, para tu historial.">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Recupero de inactivos — agosto" autoFocus />
            </Field>
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-800">Canal de envío</p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["whatsapp", "WhatsApp", MessageCircle, "Mensajes directos con altísima apertura"],
                    ["email", "Email", Mail, "Ideal para novedades y newsletters"],
                  ] as const
                ).map(([value, label, Icon, hint]) => (
                  <button
                    key={value}
                    onClick={() => setChannel(value)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      channel === value
                        ? "border-brand-400 bg-brand-50/60 shadow-card"
                        : "border-line bg-white hover:border-ink-300",
                    )}
                  >
                    <Icon className={cn("mt-0.5 size-5", channel === value ? "text-brand-600" : "text-ink-400")} />
                    <span>
                      <span className="block text-[14px] font-semibold text-ink-950">{label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-400">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field
              label="Segmento de clientes"
              hint="La audiencia se calcula al momento del envío, siempre actualizada."
            >
              <Select value={segmentId ?? ""} onChange={(e) => setSegmentId(e.target.value || null)}>
                <option value="">Todos los clientes</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({formatNumber(s.count ?? 0)})
                  </option>
                ))}
              </Select>
            </Field>
            {audience && (
              <div className="rounded-xl border border-brand-200/70 bg-brand-50/60 px-4 py-3.5 text-[13px] leading-relaxed text-brand-900">
                De {selectedSegment ? `"${selectedSegment.name}"` : "toda tu base"},{" "}
                <strong>{formatNumber(audience.count)}</strong> clientes tienen{" "}
                {channel === "whatsapp" ? "teléfono" : "email"} y van a recibir el mensaje.
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {channel === "email" && (
              <Field label="Asunto">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ej.: Te extrañamos ❤️" />
              </Field>
            )}
            <Field label="Mensaje">
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-ink-400">Insertar variable:</span>
              {VARIABLES.map((v) => (
                <button
                  key={v.token}
                  onClick={() => setMessage((m) => `${m} ${v.token}`)}
                  className="rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-medium text-brand-700 transition hover:bg-brand-100"
                >
                  {v.token}
                </button>
              ))}
            </div>

            {/* Vista previa con datos reales */}
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink-800">
                Así lo ve {audience?.sample?.name.split(" ")[0] ?? "un cliente"}:
              </p>
              <div
                className={cn(
                  "max-w-sm rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed shadow-card",
                  channel === "whatsapp"
                    ? "rounded-tl-md bg-[#DCF8C6] text-[#111]"
                    : "border border-line bg-white text-ink-800",
                )}
              >
                {channel === "email" && subject && (
                  <p className="mb-1.5 border-b border-ink-950/10 pb-1.5 font-semibold">{renderPreview(subject, audience?.sample ?? null)}</p>
                )}
                {renderPreview(message, audience?.sample ?? null)}
              </div>
            </div>

            <Field label="Programar envío" hint="Opcional: dejalo vacío y guardá como borrador para enviarla cuando quieras." optional>
              <Input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} className="w-fit" />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!toSend}
        onClose={() => setToSend(null)}
        onConfirm={dispatch}
        danger={false}
        confirmLabel="Enviar ahora"
        title={`¿Enviar "${toSend?.name}"?`}
        description={`Se va a registrar el envío a ${formatNumber(toSend?.audience_count ?? 0)} clientes y la campaña pasa al historial. La entrega real por ${toSend?.channel === "whatsapp" ? "WhatsApp" : "email"} se activa al conectar tu cuenta (próximamente).`}
      />

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={`¿Eliminar "${toDelete?.name}"?`}
        description="Se elimina la campaña y su historial de envío."
      />
    </div>
  );
}
