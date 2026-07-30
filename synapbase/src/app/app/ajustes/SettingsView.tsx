"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Link2, Mail, Send, Trash2, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Avatar, Tabs } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { cn, formatNumber } from "@/lib/utils";
import type { Business, Role } from "@/lib/types";
import type { Invitation, Member } from "@/server/services/business";

type Tab = "negocio" | "equipo" | "facturacion";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "para siempre",
    features: ["1 formulario con QR", "Hasta 100 clientes", "Panel y métricas básicas"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29.900",
    period: "por mes",
    features: [
      "Formularios y clientes ilimitados",
      "Segmentos y campañas",
      "Estadísticas avanzadas y exportación",
      "QR personalizado con tu marca",
    ],
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    price: "$59.900",
    period: "por mes",
    features: ["Todo lo de Pro", "Múltiples sucursales", "Roles y permisos avanzados", "Soporte prioritario"],
  },
];

export function SettingsView({
  business,
  role,
  currentUserId,
  members,
  invitations,
  usage,
}: {
  business: Business;
  role: Role;
  currentUserId: string;
  members: Member[];
  invitations: Invitation[];
  usage: { customers: number; forms: number; submissions: number };
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("negocio");
  const canAdmin = role === "owner" || role === "admin";

  /* ————— Negocio ————— */
  const [form, setForm] = useState({
    name: business.name,
    category: business.category ?? "",
    address: business.address ?? "",
    phone: business.phone ?? "",
    hours: business.hours ?? "",
    brand_color: business.brand_color,
    logo_url: business.logo_url,
  });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveBusiness() {
    setSaving(true);
    try {
      await api("/api/business", {
        method: "PATCH",
        body: {
          name: form.name,
          category: form.category || null,
          address: form.address || null,
          phone: form.phone || null,
          hours: form.hours || null,
          brand_color: form.brand_color,
          logo_url: form.logo_url,
        },
      });
      toast("success", "Perfil del comercio actualizado");
      router.refresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  function onLogoPick(file: File) {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        // Redimensionar a 256px y comprimir para guardar como data URL
        const canvas = document.createElement("canvas");
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        setForm((f) => ({ ...f, logo_url: canvas.toDataURL("image/png") }));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  /* ————— Equipo ————— */
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "miembro">("miembro");
  const [inviting, setInviting] = useState(false);
  const [localInvitations, setLocalInvitations] = useState(invitations);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      const { invitation } = await api<{ invitation: Invitation }>("/api/team/invite", {
        body: { email: inviteEmail, role: inviteRole },
      });
      setLocalInvitations((l) => [invitation, ...l]);
      setInviteEmail("");
      toast("success", "Invitación creada: copiá el enlace y envíaselo");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo invitar");
    } finally {
      setInviting(false);
    }
  }

  async function revoke(id: string) {
    try {
      await api(`/api/team/invite/${id}`, { method: "DELETE" });
      setLocalInvitations((l) => l.filter((i) => i.id !== id));
      toast("success", "Invitación revocada");
    } catch {
      toast("error", "No se pudo revocar");
    }
  }

  async function changeRole(membershipId: string, newRole: string) {
    try {
      await api(`/api/team/members/${membershipId}`, { method: "PATCH", body: { role: newRole } });
      toast("success", "Rol actualizado");
      router.refresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo cambiar el rol");
    }
  }

  async function removeMember(membershipId: string) {
    try {
      await api(`/api/team/members/${membershipId}`, { method: "DELETE" });
      toast("success", "Se quitó a la persona del equipo");
      router.refresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo quitar");
    }
  }

  /* ————— Facturación ————— */
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  async function changePlan(planId: string) {
    setChangingPlan(planId);
    try {
      await api("/api/business", { method: "PATCH", body: { plan: planId } });
      toast("success", "Plan actualizado. La facturación se conecta con tu pasarela de pagos.");
      router.refresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo cambiar el plan");
    } finally {
      setChangingPlan(null);
    }
  }

  return (
    <div className="animate-fade-up">
      <Tabs<Tab>
        tabs={[
          { value: "negocio", label: "Negocio" },
          { value: "equipo", label: "Equipo" },
          { value: "facturacion", label: "Plan y facturación" },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === "negocio" && (
        <div className="max-w-2xl space-y-5">
          <section className="card space-y-4 p-6">
            <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Identidad</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="group relative flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-ink-300 bg-ink-50 transition hover:border-brand-400"
                title="Subir logo"
              >
                {form.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logo_url} alt="Logo" className="size-full object-cover" />
                ) : (
                  <ImagePlus className="size-5 text-ink-400 group-hover:text-brand-600" />
                )}
              </button>
              <div className="text-[12.5px] leading-relaxed text-ink-500">
                <p className="font-medium text-ink-800">Logo del comercio</p>
                <p>Aparece en el formulario público y el QR.</p>
                {form.logo_url && (
                  <button
                    onClick={() => setForm((f) => ({ ...f, logo_url: null }))}
                    className="mt-0.5 font-medium text-danger-600 hover:underline"
                  >
                    Quitar logo
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onLogoPick(e.target.files[0])}
              />
              <label className="ml-auto flex flex-col items-center gap-1.5 text-[11px] font-medium text-ink-500">
                Color de marca
                <span className="relative">
                  <span className="block size-9 rounded-xl border border-line shadow-card" style={{ background: form.brand_color }} />
                  <input
                    type="color"
                    value={form.brand_color}
                    onChange={(e) => setForm((f) => ({ ...f, brand_color: e.target.value }))}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </span>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre del comercio">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canAdmin} />
              </Field>
              <Field label="Rubro">
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} disabled={!canAdmin} />
              </Field>
            </div>
          </section>

          <section className="card space-y-4 p-6">
            <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Ubicación y contacto</h3>
            <Field label="Dirección / sucursal">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle, número, barrio" disabled={!canAdmin} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Teléfono">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!canAdmin} />
              </Field>
              <Field label="Horarios">
                <Input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="Lun a Vie 8–20 h" disabled={!canAdmin} />
              </Field>
            </div>
          </section>

          {canAdmin && (
            <div className="flex justify-end">
              <Button onClick={saveBusiness} loading={saving}>Guardar cambios</Button>
            </div>
          )}
        </div>
      )}

      {tab === "equipo" && (
        <div className="max-w-2xl space-y-5">
          <section className="card p-6">
            <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Personas con acceso</h3>
            <p className="mt-0.5 text-xs text-ink-400">
              Owner administra todo · Admin gestiona datos y campañas · Miembro solo consulta
            </p>
            <ul className="mt-4 divide-y divide-line">
              {members.map((m) => (
                <li key={m.membership_id} className="flex items-center gap-3 py-3">
                  <Avatar name={m.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink-950">
                      {m.name}
                      {m.user_id === currentUserId && <span className="ml-1.5 text-xs font-normal text-ink-400">(vos)</span>}
                    </p>
                    <p className="truncate text-xs text-ink-400">{m.email}</p>
                  </div>
                  {m.role === "owner" ? (
                    <Badge color="violet">Propietario</Badge>
                  ) : role === "owner" ? (
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.membership_id, e.target.value)}
                      className="h-8 rounded-lg border border-line-strong/80 bg-white px-2 text-[12.5px] outline-none focus:border-brand-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="miembro">Miembro</option>
                    </select>
                  ) : (
                    <Badge color="gray">{m.role === "admin" ? "Admin" : "Miembro"}</Badge>
                  )}
                  {canAdmin && m.role !== "owner" && m.user_id !== currentUserId && (
                    <button
                      onClick={() => removeMember(m.membership_id)}
                      className="rounded-lg p-2 text-ink-300 transition hover:bg-danger-50 hover:text-danger-600"
                      title="Quitar"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {canAdmin && (
            <section className="card p-6">
              <h3 className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-ink-950">
                <UserPlus className="size-4 text-ink-400" />
                Invitar al equipo
              </h3>
              <form onSubmit={invite} className="mt-4 flex flex-wrap items-end gap-3">
                <Field label="Email" className="min-w-52 flex-1">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="persona@email.com"
                    required
                  />
                </Field>
                <Field label="Rol" className="w-36">
                  <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "admin" | "miembro")}>
                    <option value="miembro">Miembro</option>
                    <option value="admin">Admin</option>
                  </Select>
                </Field>
                <Button type="submit" loading={inviting}>
                  <Send className="size-4" />
                  Invitar
                </Button>
              </form>

              {localInvitations.length > 0 && (
                <ul className="mt-5 space-y-2">
                  {localInvitations.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-ink-50/50 px-4 py-2.5"
                    >
                      <Mail className="size-4 text-ink-400" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-800">{inv.email}</span>
                      <Badge color="amber" dot>Pendiente</Badge>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${location.origin}/invite/${inv.token}`);
                          toast("success", "Enlace de invitación copiado");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong/80 bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink-600 transition hover:bg-white hover:text-brand-700"
                      >
                        <Link2 className="size-3" />
                        Copiar enlace
                      </button>
                      <button
                        onClick={() => revoke(inv.id)}
                        className="rounded-lg p-1.5 text-ink-300 transition hover:bg-danger-50 hover:text-danger-600"
                        title="Revocar"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      {tab === "facturacion" && (
        <div className="space-y-5">
          <section className="card max-w-2xl p-6">
            <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Uso actual</h3>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                ["Clientes", usage.customers],
                ["Formularios", usage.forms],
                ["Registros", usage.submissions],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line bg-ink-50/50 p-3.5 text-center">
                  <p className="tabular text-xl font-semibold text-ink-950">{formatNumber(Number(value))}</p>
                  <p className="mt-0.5 text-[11.5px] font-medium text-ink-500">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            {PLANS.map((p) => {
              const current = business.plan === p.id;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "card relative flex flex-col p-6",
                    p.highlight && "border-brand-300 shadow-pop",
                    current && "ring-2 ring-brand-400",
                  )}
                >
                  {p.highlight && (
                    <span className="absolute -top-2.5 left-6 rounded-full bg-brand-600 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">
                      Recomendado
                    </span>
                  )}
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-[15px] font-semibold text-ink-950">{p.name}</h4>
                    {current && <Badge color="violet">Tu plan</Badge>}
                  </div>
                  <p className="mt-2">
                    <span className="text-[26px] font-semibold tracking-tight text-ink-950">{p.price}</span>
                    <span className="ml-1.5 text-xs text-ink-400">{p.period}</span>
                  </p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px] text-ink-600">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-success-600" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={current ? "secondary" : p.highlight ? "brand" : "primary"}
                    className="mt-5 w-full"
                    disabled={current || !canAdmin}
                    loading={changingPlan === p.id}
                    onClick={() => changePlan(p.id)}
                  >
                    {current ? "Plan actual" : `Pasar a ${p.name}`}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-ink-400">
            Los precios son de referencia. El cobro se activa al conectar la pasarela de pagos (Mercado Pago /
            Stripe); la arquitectura ya contempla el campo de plan por comercio.
          </p>
        </div>
      )}
    </div>
  );
}
