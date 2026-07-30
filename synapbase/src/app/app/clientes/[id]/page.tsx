import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Coffee,
  Mail,
  MessageCircle,
  Phone,
  Repeat,
  Target,
  Wallet,
} from "lucide-react";
import { requireTenant } from "@/server/guard";
import { getCustomer, getCustomerHistory, listTags } from "@/server/services/customers";
import { listSegments, matchesRule } from "@/server/services/segments";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/misc";
import { formatDate, formatMoney, formatNumber, timeAgo } from "@/lib/utils";
import { CustomerActions, HistoryList, NotesCard, TagsEditor } from "./profile-widgets";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const tenant = await requireTenant();
  const customer = getCustomer(tenant.business.id, id);
  if (!customer) notFound();

  const history = getCustomerHistory(tenant.business.id, id);
  const allTags = listTags(tenant.business.id);
  const segments = listSegments(tenant.business.id, false).filter(
    (s) => s.rules.length > 0 && s.rules.every((r) => matchesRule(customer, r)),
  );

  const frequency =
    customer.avg_days_between_visits != null
      ? customer.avg_days_between_visits === 0
        ? "Varias veces por día"
        : `Cada ${customer.avg_days_between_visits} días`
      : "Vino una vez";

  const waLink = customer.phone ? `https://wa.me/54${customer.phone.replace(/\D/g, "")}` : null;

  return (
    <div>
      <Link
        href="/app/clientes"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="size-3.5" />
        Volver a clientes
      </Link>

      {/* Encabezado */}
      <div className="card animate-fade-up p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={customer.name} size={56} />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-ink-950">{customer.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-500">
                {customer.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    {customer.email}
                  </span>
                )}
                {(customer.gender || customer.age) && (
                  <span>{[customer.gender, customer.age ? `${customer.age} años` : null].filter(Boolean).join(" · ")}</span>
                )}
                <span className="text-ink-400">Cliente desde {formatDate(customer.first_visit_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#25D366] px-3.5 text-[13px] font-semibold text-white shadow-raised transition hover:brightness-105"
              >
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            )}
            <CustomerActions customer={{
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
              gender: customer.gender,
              age: customer.age,
            }} />
          </div>
        </div>

        {/* Métricas del cliente */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat icon={<Repeat className="size-4" />} label="Visitas" value={formatNumber(customer.visits)} />
          <MiniStat
            icon={<Coffee className="size-4" />}
            label="Producto favorito"
            value={customer.favorite_product ?? "—"}
            small
          />
          <MiniStat
            icon={<CalendarClock className="size-4" />}
            label="Última visita"
            value={timeAgo(customer.last_visit_at)}
            sub={frequency !== "Vino una vez" ? `Vuelve ${frequency.toLowerCase()}` : undefined}
          />
          <MiniStat
            icon={<Wallet className="size-4" />}
            label="Total gastado"
            value={customer.total_spent > 0 ? formatMoney(customer.total_spent) : "—"}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Historial */}
        <div className="lg:col-span-2">
          <HistoryList history={history} />
        </div>

        {/* Columna lateral */}
        <div className="space-y-4">
          <NotesCard customerId={customer.id} initialNotes={customer.notes} />
          <TagsEditor customerId={customer.id} allTags={allTags} activeTagIds={customer.tags.map((t) => t.id)} />

          <section className="card p-5">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-ink-950">
              <Target className="size-4 text-ink-400" />
              Segmentos
            </h3>
            {segments.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {segments.map((s) => (
                  <Link key={s.id} href="/app/segmentos">
                    <Badge color="violet" className="cursor-pointer transition hover:bg-brand-200">
                      {s.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink-400">
                No pertenece a ningún segmento todavía.
              </p>
            )}
          </section>

          {customer.products.length > 0 && (
            <section className="card p-5">
              <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Todo lo que consumió</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {customer.products.map((p) => (
                  <span key={p} className="rounded-full border border-line bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-600">
                    {p}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  sub,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-ink-50/50 p-3.5">
      <div className="flex items-center gap-1.5 text-ink-400">
        {icon}
        <span className="text-[11.5px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-1.5 truncate font-semibold tracking-tight text-ink-950 ${small ? "text-[15px]" : "text-lg"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11.5px] text-ink-400">{sub}</p>}
    </div>
  );
}
