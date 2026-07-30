"use client";

import { FileSpreadsheet, FileText, Sheet } from "lucide-react";
import { exportCsv, exportExcel, exportPdf, type ExportTable } from "@/lib/export";
import { formatDate, timeAgo } from "@/lib/utils";
import type { AnalyticsData } from "@/server/services/stats";

export function StatsExport({ analytics: a, businessName }: { analytics: AnalyticsData; businessName: string }) {
  function buildTable(): ExportTable {
    const rows: (string | number | null)[][] = [
      ["— Resumen —", "", ""],
      ["Clientes activos (30 días)", a.active_30d, ""],
      ["Clientes perdidos (30+ días)", a.lost_customers, ""],
      ["Recuperados este mes", a.recovered_this_month, ""],
      ["Días promedio entre visitas", a.avg_days_between_visits ?? "", ""],
      ["Edad promedio", a.avg_age ?? "", ""],
      ["Consumo registrado ($)", a.total_revenue_tracked, ""],
      ["", "", ""],
      ["— Ranking de clientes —", "Visitas", "Última visita"],
      ...a.top_customers.map((c) => [c.name, c.visits, timeAgo(c.last_visit)] as (string | number | null)[]),
      ["", "", ""],
      ["— Ranking de productos —", "Veces pedido", ""],
      ...a.top_products.map((p) => [p.name, p.count, ""] as (string | number | null)[]),
      ["", "", ""],
      ["— Género —", "Clientes", ""],
      ...a.gender_distribution.map((g) => [g.name, g.value, ""] as (string | number | null)[]),
      ["", "", ""],
      ["— Movimiento mensual —", "Nuevos", "Recuperados / Perdidos"],
      ...a.monthly_movement.map(
        (m) => [m.month, m.nuevos, `${m.recuperados} / ${m.perdidos}`] as (string | number | null)[],
      ),
    ];
    return {
      title: `Estadísticas — ${businessName}`,
      columns: ["Métrica", "Valor", "Detalle"],
      rows,
    };
  }

  const name = `synapbase-estadisticas-${new Date().toISOString().slice(0, 10)}`;
  const subtitle = `Reporte generado el ${formatDate(new Date().toISOString())}`;

  const cls =
    "inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line-strong/80 bg-white px-3 text-[12.5px] font-medium text-ink-700 shadow-card transition hover:bg-ink-50";

  return (
    <div className="flex items-center gap-1.5">
      <button className={cls} onClick={() => exportCsv(buildTable(), name)}>
        <Sheet className="size-3.5 text-ink-400" />
        CSV
      </button>
      <button className={cls} onClick={() => exportExcel(buildTable(), name)}>
        <FileSpreadsheet className="size-3.5 text-ink-400" />
        Excel
      </button>
      <button className={cls} onClick={() => void exportPdf(buildTable(), name, subtitle)}>
        <FileText className="size-3.5 text-ink-400" />
        PDF
      </button>
    </div>
  );
}
