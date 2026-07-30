"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Switch, Tabs } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { PublicFormFlow } from "@/components/PublicFormFlow";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { Form, FormTheme, Question } from "@/lib/types";
import { QuestionsPanel } from "./QuestionsPanel";
import { QrPanel } from "./QrPanel";

type Tab = "preguntas" | "diseno" | "qr";

const SWATCHES = ["#5b5bd6", "#0e7490", "#b45309", "#be185d", "#15803d", "#17171c", "#7c3aed", "#c2410c"];
const EMOJIS = ["👋", "☕", "🍔", "🍕", "🍺", "🍦", "🥐", "🛍️", "💈", "💪", "🌿", "✨"];

export function FormBuilder({
  initialForm,
  business,
  initialTab,
}: {
  initialForm: Form;
  business: { name: string; logo_url: string | null };
  initialTab: Tab;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [form, setForm] = useState<Form>(initialForm);
  const [questions, setQuestions] = useState<Question[]>(initialForm.questions ?? []);
  const [previewKey, setPreviewKey] = useState(0);
  const [saving, setSaving] = useState(false);

  /* Guardado con debounce de los campos de texto/tema */
  const pendingRef = useRef<Record<string, unknown>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queueSave = useCallback(
    (patch: Record<string, unknown>) => {
      pendingRef.current = deepMerge(pendingRef.current, patch);
      if (timerRef.current) clearTimeout(timerRef.current);
      setSaving(true);
      timerRef.current = setTimeout(async () => {
        const body = pendingRef.current;
        pendingRef.current = {};
        try {
          await api(`/api/forms/${initialForm.id}`, { method: "PATCH", body });
        } catch (err) {
          toast("error", err instanceof Error ? err.message : "No se pudo guardar");
        } finally {
          setSaving(false);
        }
      }, 700);
    },
    [initialForm.id, toast],
  );

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function patchLocal(patch: Omit<Partial<Form>, "theme"> & { theme?: Partial<FormTheme> }) {
    setForm((f) => ({ ...f, ...patch, theme: { ...f.theme, ...(patch.theme ?? {}) } }));
    queueSave(patch as Record<string, unknown>);
    setPreviewKey((k) => k + 1);
  }

  const publicUrl = typeof window !== "undefined" ? `${location.origin}/f/${form.slug}` : `/f/${form.slug}`;

  return (
    <div className="animate-fade-up">
      {/* Encabezado del constructor */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <input
            value={form.name}
            onChange={(e) => patchLocal({ name: e.target.value })}
            className="w-full max-w-md truncate rounded-lg border border-transparent bg-transparent px-2 py-1 text-[20px] font-semibold tracking-tight text-ink-950 outline-none transition hover:border-line focus:border-brand-400 focus:bg-white"
          />
          <p className="mt-0.5 flex items-center gap-2 px-2 text-xs text-ink-400">
            {saving ? "Guardando…" : "Guardado"}
            <span className="size-1 rounded-full bg-ink-300" />
            <button
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast("success", "Link copiado");
              }}
              className="inline-flex items-center gap-1 font-medium text-ink-500 hover:text-brand-700"
            >
              <Link2 className="size-3" />
              /f/{form.slug}
            </button>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[13px] font-medium text-ink-600">
            <Switch
              checked={form.status === "active"}
              onChange={(v) => patchLocal({ status: v ? "active" : "paused" })}
            />
            {form.status === "active" ? "Recibiendo respuestas" : "Pausado"}
          </label>
          <a
            href={`/f/${form.slug}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-line-strong/80 bg-white px-3.5 text-[13px] font-medium text-ink-700 shadow-card transition hover:bg-ink-50"
          >
            <ExternalLink className="size-3.5" />
            Probar
          </a>
        </div>
      </div>

      <Tabs<Tab>
        tabs={[
          { value: "preguntas", label: "Preguntas" },
          { value: "diseno", label: "Diseño" },
          { value: "qr", label: "Código QR" },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />

      <div className={cn("grid items-start gap-6", tab !== "qr" && "xl:grid-cols-[1fr_400px]")}>
        <div className="min-w-0">
          {tab === "preguntas" && (
            <QuestionsPanel
              formId={form.id}
              questions={questions}
              onChange={(qs) => {
                setQuestions(qs);
                setPreviewKey((k) => k + 1);
              }}
            />
          )}

          {tab === "diseno" && (
            <div className="space-y-5">
              <section className="card space-y-4 p-5">
                <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Incentivo</h3>
                <Field
                  label="Beneficio que ofrece el QR"
                  hint="Es el gancho para que completen el formulario. Aparece en la bienvenida y al finalizar."
                >
                  <Input
                    value={form.incentive}
                    onChange={(e) => patchLocal({ incentive: e.target.value })}
                    placeholder="Ej.: 10% de descuento en tu próxima visita"
                  />
                </Field>
              </section>

              <section className="card space-y-4 p-5">
                <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Pantalla de bienvenida</h3>
                <Field label="Título">
                  <Input
                    value={form.welcome_title}
                    onChange={(e) => patchLocal({ welcome_title: e.target.value })}
                    placeholder={`¡Hola! Somos ${business.name}`}
                  />
                </Field>
                <Field label="Texto">
                  <Textarea
                    value={form.welcome_text}
                    onChange={(e) => patchLocal({ welcome_text: e.target.value })}
                    placeholder="Contanos quién sos y llevate un beneficio. Te toma 30 segundos."
                  />
                </Field>
              </section>

              <section className="card space-y-4 p-5">
                <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Pantalla final</h3>
                <Field label="Título">
                  <Input
                    value={form.success_title}
                    onChange={(e) => patchLocal({ success_title: e.target.value })}
                    placeholder="¡Gracias por contarnos!"
                  />
                </Field>
                <Field label="Texto">
                  <Textarea
                    value={form.success_text}
                    onChange={(e) => patchLocal({ success_text: e.target.value })}
                    placeholder="Mostrá este código en la caja para usar tu beneficio."
                  />
                </Field>
              </section>

              <section className="card space-y-4 p-5">
                <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Identidad visual</h3>
                <div>
                  <p className="mb-2 text-[13px] font-medium text-ink-800">Color de acento</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {SWATCHES.map((c) => (
                      <button
                        key={c}
                        onClick={() => patchLocal({ theme: { color: c } })}
                        className={cn(
                          "size-8 rounded-full border-2 transition-transform hover:scale-110",
                          form.theme.color === c ? "border-ink-950 ring-2 ring-ink-200" : "border-white shadow-raised",
                        )}
                        style={{ background: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                    <label className="relative ml-1 flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong/80 bg-white px-3 text-xs font-medium text-ink-600 shadow-card transition hover:bg-ink-50">
                      <span className="size-3.5 rounded-full border border-line" style={{ background: form.theme.color }} />
                      Personalizado
                      <input
                        type="color"
                        value={form.theme.color}
                        onChange={(e) => patchLocal({ theme: { color: e.target.value } })}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-medium text-ink-800">Ícono del formulario</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => patchLocal({ theme: { emoji: e } })}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-xl border text-lg transition-all hover:scale-105",
                          form.theme.emoji === e
                            ? "border-brand-400 bg-brand-50 shadow-card"
                            : "border-line bg-white hover:border-ink-300",
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-50/50 px-4 py-3">
                  <span>
                    <span className="block text-[13px] font-medium text-ink-800">Mostrar logo del comercio</span>
                    <span className="block text-xs text-ink-400">
                      {business.logo_url ? "Usa el logo cargado en Ajustes" : "Subí tu logo en Ajustes para activarlo"}
                    </span>
                  </span>
                  <Switch
                    checked={form.theme.showLogo}
                    onChange={(v) => patchLocal({ theme: { showLogo: v } })}
                    disabled={!business.logo_url}
                  />
                </label>
              </section>
            </div>
          )}

          {tab === "qr" && <QrPanel form={form} businessName={business.name} logoUrl={business.logo_url} />}
        </div>

        {/* Vista previa en vivo */}
        {tab !== "qr" && (
          <div className="sticky top-6 hidden justify-center xl:flex">
            <PhonePreview>
              <PublicFormFlow
                key={previewKey}
                form={{ ...form, questions }}
                business={business}
                slug={form.slug}
                preview
                className="h-full min-h-full!"
              />
            </PhonePreview>
          </div>
        )}
      </div>
    </div>
  );
}

function PhonePreview({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[360px]">
      <p className="mb-2.5 text-center text-[11px] font-semibold uppercase tracking-widest text-ink-400">
        Vista previa en vivo
      </p>
      <div className="rounded-[42px] border border-ink-200 bg-ink-950 p-2.5 shadow-modal">
        <div className="relative h-[660px] overflow-hidden rounded-[32px] bg-white">
          <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-ink-950" />
          <div className="h-full overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

function deepMerge(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object" && out[k] !== null) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}
