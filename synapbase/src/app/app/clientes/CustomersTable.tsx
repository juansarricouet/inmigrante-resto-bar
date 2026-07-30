"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Users } from "lucide-react";
import { Avatar, EmptyState, SearchInput } from "@/components/ui/misc";
import { Badge, type BadgeColor } from "@/components/ui/Badge";
import { cn, daysSince, downloadBlob, formatMoney, formatNumber, timeAgo } from "@/lib/utils";
import type { Tag } from "@/lib/types";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  age: number | null;
  visits: number;
  first_visit_at: string;
  last_visit_at: string;
  favorite_product: string | null;
  total_spent: number;
  tags: Tag[];
}

type SortKey = "name" | "visits" | "last_visit_at" | "total_spent" | "first_visit_at";
type QuickFilter = "todos" | "frecuentes" | "inactivos" | "nuevos" | "con_contacto";

const FILTERS: { value: QuickFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "frecuentes", label: "Frecuentes (5+)" },
  { value: "inactivos", label: "Inactivos 30 días" },
  { value: "nuevos", label: "Nuevos (30 días)" },
  { value: "con_contacto", label: "Con contacto" },
];

const PAGE_SIZE = 25;

export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<QuickFilter>("todos");
  const [sortKey, setSortKey] = useState<SortKey>("last_visit_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").includes(q) ||
        (r.favorite_product ?? "").toLowerCase().includes(q) ||
        r.tags.some((t) => t.name.toLowerCase().includes(q)),
    );
    switch (filter) {
      case "frecuentes":
        out = out.filter((r) => r.visits >= 5);
        break;
      case "inactivos":
        out = out.filter((r) => (daysSince(r.last_visit_at) ?? 0) > 30);
        break;
      case "nuevos":
        out = out.filter((r) => (daysSince(r.first_visit_at) ?? 999) <= 30);
        break;
      case "con_contacto":
        out = out.filter((r) => r.phone || r.email);
        break;
    }
    out.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "es") * dir;
    });
    return out;
  }, [rows, search, filter, sortKey, sortDir]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
    setPage(0);
  }

  function exportCsv() {
    const header = ["Nombre", "Teléfono", "Email", "Género", "Edad", "Visitas", "Primera visita", "Última visita", "Producto favorito", "Total gastado", "Etiquetas"];
    const lines = filtered.map((r) =>
      [r.name, r.phone ?? "", r.email ?? "", r.gender ?? "", r.age ?? "", r.visits, r.first_visit_at.slice(0, 10), r.last_visit_at.slice(0, 10), r.favorite_product ?? "", r.total_spent, r.tags.map((t) => t.name).join(" | ")]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(","),
    );
    downloadBlob("﻿" + [header.join(","), ...lines].join("\n"), "clientes-synapbase.csv", "text/csv;charset=utf-8");
  }

  const Th = ({ label, k, className }: { label: string; k?: SortKey; className?: string }) => (
    <th
      onClick={k ? () => toggleSort(k) : undefined}
      className={cn(
        "whitespace-nowrap px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-ink-400",
        k && "cursor-pointer select-none transition-colors hover:text-ink-700",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {k && sortKey === k && (sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </span>
    </th>
  );

  return (
    <div className="animate-fade-up">
      {/* Controles */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Buscar por nombre, contacto, producto…" className="w-full sm:w-72" />
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(0); }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all duration-150",
                filter === f.value
                  ? "border-ink-950 bg-ink-950 text-white shadow-raised"
                  : "border-line-strong/80 bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={exportCsv}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-[10px] border border-line-strong/80 bg-white px-3.5 text-[13px] font-medium text-ink-700 shadow-card transition hover:bg-ink-50"
        >
          <Download className="size-3.5" />
          Exportar CSV
        </button>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="border-b border-line bg-ink-50/60">
              <tr>
                <Th label="Cliente" k="name" />
                <Th label="Contacto" />
                <Th label="Última visita" k="last_visit_at" />
                <Th label="Visitas" k="visits" className="text-right" />
                <Th label="Producto favorito" />
                <Th label="Gastado" k="total_spent" />
                <Th label="Etiquetas" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const inactive = (daysSince(r.last_visit_at) ?? 0) > 30;
                return (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/app/clientes/${r.id}`)}
                    className="group cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-brand-50/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name} size={34} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-950 group-hover:text-brand-800">{r.name}</p>
                          <p className="truncate text-xs text-ink-400">
                            {[r.gender, r.age ? `${r.age} años` : null].filter(Boolean).join(" · ") || "Sin datos demográficos"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] text-ink-700">{r.phone ?? "—"}</p>
                      <p className="truncate text-xs text-ink-400">{r.email ?? ""}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={cn("text-[13px]", inactive ? "text-warning-600" : "text-ink-700")}>
                        {timeAgo(r.last_visit_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="tabular inline-flex min-w-8 justify-center rounded-lg bg-ink-100/80 px-2 py-0.5 text-[13px] font-semibold text-ink-800">
                        {formatNumber(r.visits)}
                      </span>
                    </td>
                    <td className="max-w-44 truncate px-4 py-3 text-[13px] text-ink-700">
                      {r.favorite_product ?? "—"}
                    </td>
                    <td className="tabular whitespace-nowrap px-4 py-3 text-[13px] text-ink-700">
                      {r.total_spent > 0 ? formatMoney(r.total_spent) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.tags.slice(0, 2).map((t) => (
                          <Badge key={t.id} color={t.color as BadgeColor}>{t.name}</Badge>
                        ))}
                        {r.tags.length > 2 && <Badge color="gray">+{r.tags.length - 2}</Badge>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <EmptyState
            icon={Users}
            title={search || filter !== "todos" ? "Sin resultados" : "Todavía no hay clientes"}
            description={
              search || filter !== "todos"
                ? "Probá con otra búsqueda u otro filtro."
                : "Cuando alguien escanee tu QR y complete el formulario, va a aparecer acá automáticamente."
            }
          />
        )}

        {/* Paginación */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-line bg-ink-50/40 px-4 py-2.5 text-[13px] text-ink-500">
            <span>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {formatNumber(filtered.length)}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-line-strong/80 bg-white p-1.5 transition hover:bg-ink-50 disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="px-1 font-medium text-ink-700">
                {page + 1} / {pages}
              </span>
              <button
                disabled={page >= pages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-line-strong/80 bg-white p-1.5 transition hover:bg-ink-50 disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
