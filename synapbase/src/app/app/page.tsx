import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardList,
  MousePointerClick,
  QrCode,
  Repeat,
  ScanLine,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { requireTenant } from "@/server/guard";
import { getDashboardStats } from "@/server/services/stats";
import { listForms } from "@/server/services/forms";
import { PageHeader } from "@/components/shell/PageHeader";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/Badge";
import {
  ChartCard,
  GroupedBarsChart,
  MonthlyCustomersChart,
  TopProductsChart,
  VBarChart,
} from "@/components/charts";
import { CHART_COLORS, formatNumber, formatPercent, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const tenant = await requireTenant();
  const stats = getDashboardStats(tenant.business.id);
  const forms = listForms(tenant.business.id);
  const mainForm = forms.find((f) => !f.is_template);
  const firstName = tenant.user.name.split(" ")[0] ?? tenant.user.name;

  const delta =
    stats.new_prev_month > 0
      ? Math.round(((stats.new_this_month - stats.new_prev_month) / stats.new_prev_month) * 100)
      : null;

  const hourData = stats.visits_by_hour.filter((h) => h.hour >= 7 && h.hour <= 23);

  return (
    <div>
      <PageHeader
        title={`Hola, ${firstName} 👋`}
        description="Así está creciendo la base de clientes de tu comercio."
        actions={
          mainForm && (
            <Link
              href={`/app/formularios/${mainForm.id}?tab=qr`}
              className="inline-flex h-9.5 items-center gap-2 rounded-[10px] bg-ink-950 px-4 text-sm font-medium text-white shadow-raised transition hover:bg-ink-800"
            >
              <QrCode className="size-4" />
              Descargar mi QR
            </Link>
          )
        }
      />

      {stats.total_submissions === 0 ? (
        <SetupChecklist formId={mainForm?.id} slug={mainForm?.slug} />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
            <StatCard
              icon={<Users className="size-4" />}
              label="Clientes registrados"
              value={formatNumber(stats.total_customers)}
              sub={`${formatNumber(stats.recurrent_customers)} recurrentes`}
            />
            <StatCard
              icon={<UserPlus className="size-4" />}
              label="Nuevos este mes"
              value={formatNumber(stats.new_this_month)}
              delta={delta}
              sub={`${formatNumber(stats.new_prev_month)} el mes pasado`}
            />
            <StatCard
              icon={<Repeat className="size-4" />}
              label="Tasa de retorno"
              value={formatPercent(stats.return_rate)}
              sub="clientes que volvieron"
            />
            <StatCard
              icon={<ScanLine className="size-4" />}
              label="Escaneos del QR"
              value={formatNumber(stats.total_scans)}
              sub={`${formatPercent(stats.conversion_rate)} completó el formulario`}
            />
          </div>

          {/* Fila principal */}
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <ChartCard
              title="Clientes por mes"
              subtitle="Nuevos registrados y clientes que volvieron"
              className="xl:col-span-2"
            >
              <MonthlyCustomersChart data={stats.customers_by_month} height={252} />
            </ChartCard>

            <section className="card card-hover flex flex-col p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Últimos registros</h3>
                <Link
                  href="/app/base"
                  className="flex items-center gap-1 text-xs font-medium text-brand-700 transition-colors hover:text-brand-600"
                >
                  Ver todos
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
              <div className="-mx-2 flex-1 space-y-0.5 overflow-y-auto">
                {stats.recent_submissions.map((s) => (
                  <Link
                    key={s.id}
                    href={s.customer_id ? `/app/clientes/${s.customer_id}` : "/app/base"}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-ink-50"
                  >
                    <Avatar name={s.customer_name ?? "?"} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink-900">
                        {s.customer_name ?? "Sin nombre"}
                      </span>
                      <span className="block truncate text-xs text-ink-400">{s.product ?? s.form_name}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-ink-400">{timeAgo(s.created_at)}</span>
                  </Link>
                ))}
                {stats.recent_submissions.length === 0 && (
                  <p className="px-2 py-8 text-center text-sm text-ink-400">Todavía no hay registros</p>
                )}
              </div>
            </section>
          </div>

          {/* Segunda fila */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard title="Productos más consumidos" subtitle="Según lo que declaran tus clientes">
              <TopProductsChart data={stats.top_products} height={252} />
            </ChartCard>
            <ChartCard title="Horarios de consumo" subtitle="Cantidad de registros por hora del día">
              <VBarChart
                data={hourData as unknown as Record<string, unknown>[]}
                xKey="hour"
                yKey="count"
                name="Registros"
                height={252}
                xFormat="hour"
              />
            </ChartCard>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard title="Nuevos vs. recurrentes" subtitle="Composición mensual de tus visitas">
              <GroupedBarsChart
                data={stats.customers_by_month.slice(-6) as unknown as Record<string, unknown>[]}
                xKey="month"
                xFormat="month"
                series={[
                  { key: "nuevos", name: "Nuevos", color: CHART_COLORS[0]! },
                  { key: "recurrentes", name: "Recurrentes", color: CHART_COLORS[2]! },
                ]}
                height={240}
              />
            </ChartCard>
            <ChartCard title="Frecuencia de visitas" subtitle="Cuántas veces vino cada cliente">
              <VBarChart
                data={stats.visit_frequency as unknown as Record<string, unknown>[]}
                xKey="bucket"
                yKey="count"
                name="Clientes"
                color={CHART_COLORS[1]}
                height={240}
              />
            </ChartCard>
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-xs text-ink-400">
            <MousePointerClick className="size-3.5" />
            Todos los gráficos son interactivos: pasá el cursor para ver el detalle.
          </p>
        </>
      )}
    </div>
  );
}

/* ————— Piezas ————— */

function StatCard({
  icon,
  label,
  value,
  sub,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
}) {
  return (
    <div className="card card-hover p-4.5">
      <div className="flex items-center justify-between">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</span>
        {delta != null && (
          <Badge color={delta >= 0 ? "green" : "red"}>
            {delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {delta >= 0 ? "+" : ""}
            {delta}%
          </Badge>
        )}
      </div>
      <p className="tabular mt-3 text-[24px] font-semibold leading-none tracking-tight text-ink-950">{value}</p>
      <p className="mt-1.5 text-[12.5px] font-medium text-ink-500">{label}</p>
      {sub && <p className="mt-0.5 text-[11.5px] text-ink-400">{sub}</p>}
    </div>
  );
}

function SetupChecklist({ formId, slug }: { formId?: string; slug?: string }) {
  const steps = [
    {
      icon: ClipboardList,
      title: "Personalizá tu formulario",
      text: "Definí qué querés saber de tus clientes: qué consumen, cómo te conocieron, lo que necesites.",
      href: formId ? `/app/formularios/${formId}` : "/app/formularios",
      cta: "Abrir constructor",
    },
    {
      icon: QrCode,
      title: "Descargá tu QR",
      text: "Imprimilo y ponelo en mesas, mostrador o vidriera con el mensaje del beneficio.",
      href: formId ? `/app/formularios/${formId}?tab=qr` : "/app/formularios",
      cta: "Generar QR",
    },
    {
      icon: Share2,
      title: "Empezá a capturar clientes",
      text: "Cada escaneo se convierte en un registro con nombre, consumo y contacto.",
      href: slug ? `/f/${slug}` : "/app",
      cta: "Probar como cliente",
      external: true,
    },
  ];
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line bg-hero-glow px-7 py-8 text-center">
        <span className="mx-auto flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-card">
          <Sparkles className="size-3.5" />
          Tu panel está listo
        </span>
        <h2 className="mx-auto mt-4 max-w-md text-balance text-xl font-semibold tracking-tight text-ink-950">
          Tres pasos para empezar a construir tu base de clientes
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
          En cuanto alguien escanee tu QR y complete el formulario, este panel se llena de datos.
        </p>
      </div>
      <div className="grid gap-px bg-line sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="flex flex-col bg-white p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl border border-line bg-ink-50">
                <s.icon className="size-4.5 text-ink-600" strokeWidth={1.75} />
              </span>
              <span className="text-xs font-semibold text-ink-400">Paso {i + 1}</span>
            </div>
            <h3 className="mt-3.5 text-[14.5px] font-semibold tracking-tight text-ink-950">{s.title}</h3>
            <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-500">{s.text}</p>
            {s.external ? (
              <a
                href={s.href}
                target="_blank"
                className="mt-4 inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:text-brand-600"
              >
                {s.cta}
                <ArrowUpRight className="size-3.5" />
              </a>
            ) : (
              <Link
                href={s.href}
                className="mt-4 inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:text-brand-600"
              >
                {s.cta}
                <ArrowUpRight className="size-3.5" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
