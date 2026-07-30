import {
  CalendarRange,
  HeartPulse,
  RotateCcw,
  UserMinus,
  Users,
  Wallet,
} from "lucide-react";
import { requireTenant } from "@/server/guard";
import { getAnalytics } from "@/server/services/stats";
import { PageHeader } from "@/components/shell/PageHeader";
import { Avatar } from "@/components/ui/misc";
import {
  ChartCard,
  DonutChart,
  GroupedBarsChart,
  OptionBars,
  VBarChart,
} from "@/components/charts";
import { CHART_COLORS, formatMoney, formatNumber, timeAgo } from "@/lib/utils";
import { StatsExport } from "./StatsExport";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const tenant = await requireTenant();
  const a = getAnalytics(tenant.business.id);

  return (
    <div>
      <PageHeader
        title="Estadísticas"
        description="El análisis profundo de tu base: adquisición, retención, consumo, demografía y encuestas."
        actions={<StatsExport analytics={a} businessName={tenant.business.name} />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={<HeartPulse className="size-4" />} label="Activos (30 días)" value={formatNumber(a.active_30d)} />
        <Kpi icon={<UserMinus className="size-4" />} label="Perdidos (30+ días)" value={formatNumber(a.lost_customers)} warn />
        <Kpi icon={<RotateCcw className="size-4" />} label="Recuperados este mes" value={formatNumber(a.recovered_this_month)} good />
        <Kpi
          icon={<CalendarRange className="size-4" />}
          label="Entre visitas"
          value={a.avg_days_between_visits != null ? `${a.avg_days_between_visits} días` : "—"}
        />
        <Kpi icon={<Users className="size-4" />} label="Edad promedio" value={a.avg_age != null ? `${a.avg_age} años` : "—"} />
        <Kpi
          icon={<Wallet className="size-4" />}
          label="Consumo registrado"
          value={a.total_revenue_tracked > 0 ? formatMoney(a.total_revenue_tracked) : "—"}
        />
      </div>

      {/* Movimiento + género */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Movimiento de clientes"
          subtitle="Nuevos, recuperados y perdidos por mes"
          className="xl:col-span-2"
        >
          <GroupedBarsChart
            data={a.monthly_movement as unknown as Record<string, unknown>[]}
            xKey="month"
            xFormat="month"
            series={[
              { key: "nuevos", name: "Nuevos", color: CHART_COLORS[0]! },
              { key: "recuperados", name: "Recuperados", color: CHART_COLORS[2]! },
              { key: "perdidos", name: "Perdidos", color: CHART_COLORS[4]! },
            ]}
            height={250}
          />
        </ChartCard>
        <ChartCard title="Distribución por género" subtitle="Según lo que declaran tus clientes">
          <DonutChart data={a.gender_distribution} height={250} centerLabel="clientes" />
        </ChartCard>
      </div>

      {/* Demografía + semana */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Edades" subtitle="Distribución etaria de tu base">
          <VBarChart
            data={a.age_histogram as unknown as Record<string, unknown>[]}
            xKey="bucket"
            yKey="count"
            name="Clientes"
            height={230}
          />
        </ChartCard>
        <ChartCard title="Días de mayor consumo" subtitle="Registros por día de la semana">
          <VBarChart
            data={a.weekday_distribution as unknown as Record<string, unknown>[]}
            xKey="day"
            yKey="count"
            name="Registros"
            color={CHART_COLORS[1]}
            height={230}
          />
        </ChartCard>
      </div>

      {/* Rankings */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Ranking de clientes</h3>
          <p className="mt-0.5 text-xs text-ink-400">Tus mejores clientes por cantidad de visitas</p>
          <ol className="mt-4 space-y-1">
            {a.top_customers.map((c, i) => (
              <li key={c.id}>
                <Link
                  href={`/app/clientes/${c.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-ink-50"
                >
                  <span className="w-5 text-center text-[12px] font-bold text-ink-300">{i + 1}</span>
                  <Avatar name={c.name} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink-900">{c.name}</span>
                    <span className="block truncate text-xs text-ink-400">
                      {c.favorite ?? "—"} · última {timeAgo(c.last_visit)}
                    </span>
                  </span>
                  {c.spent > 0 && <span className="tabular text-xs text-ink-400">{formatMoney(c.spent)}</span>}
                  <span className="tabular rounded-lg bg-brand-50 px-2 py-0.5 text-[12.5px] font-bold text-brand-700">
                    {c.visits}
                  </span>
                </Link>
              </li>
            ))}
            {a.top_customers.length === 0 && <p className="px-2 py-6 text-center text-sm text-ink-400">Sin datos aún</p>}
          </ol>
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Ranking de productos</h3>
            <p className="mt-0.5 text-xs text-ink-400">Lo más consumido según los formularios</p>
            <div className="mt-4">
              <OptionBars options={a.top_products.map((p) => ({ label: p.name, count: p.count }))} />
              {a.top_products.length === 0 && <p className="py-4 text-center text-sm text-ink-400">Sin datos aún</p>}
            </div>
          </section>
          <section className="card p-5">
            <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Ranking de preguntas</h3>
            <p className="mt-0.5 text-xs text-ink-400">Las que más respuestas juntaron</p>
            <ol className="mt-3 space-y-1.5">
              {a.question_ranking.slice(0, 6).map((q, i) => (
                <li key={i} className="flex items-baseline gap-2.5 text-[13px]">
                  <span className="w-4 text-center text-[11px] font-bold text-ink-300">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-700">{q.label}</span>
                  <span className="tabular shrink-0 text-xs text-ink-400">{formatNumber(q.responses)} resp.</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {/* Encuestas */}
      {a.question_breakdowns.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wide text-ink-400">
            Respuestas de encuestas
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {a.question_breakdowns.map((q) => (
              <section key={q.question_id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">{q.label}</h3>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {q.form_name} · {formatNumber(q.responses)} respuestas
                      {q.average != null && (
                        <span className="ml-1.5 rounded-md bg-brand-50 px-1.5 py-0.5 font-semibold text-brand-700">
                          promedio {q.average}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  {q.options && q.options.length > 0 ? (
                    <OptionBars options={q.options.slice(0, 8)} />
                  ) : q.samples && q.samples.length > 0 ? (
                    <ul className="space-y-1.5">
                      {q.samples.map((s, i) => (
                        <li key={i} className="rounded-lg bg-ink-50 px-3 py-2 text-[12.5px] italic text-ink-600">
                          “{s}”
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-400">Respuestas numéricas</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  good,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  good?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="card card-hover p-4">
      <span
        className={`flex size-7.5 items-center justify-center rounded-lg ${
          good ? "bg-success-100 text-success-600" : warn ? "bg-warning-100 text-warning-600" : "bg-brand-50 text-brand-600"
        }`}
      >
        {icon}
      </span>
      <p className="tabular mt-2.5 truncate text-[19px] font-semibold leading-none tracking-tight text-ink-950">{value}</p>
      <p className="mt-1.5 text-[11.5px] font-medium text-ink-500">{label}</p>
    </div>
  );
}
