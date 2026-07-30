"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Database, FileSpreadsheet, FileText, Layers, Sheet, Trash2, X } from "lucide-react";
import { EmptyState, SearchInput } from "@/components/ui/misc";
import { Select } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { exportCsv, exportExcel, exportPdf, type ExportTable } from "@/lib/export";
import { cn, formatDateTime, formatMoney, formatNumber } from "@/lib/utils";
import type { SubmissionRow } from "@/lib/types";

interface FormDef {
  id: string;
  name: string;
  questions: { id: string; label: string; type: string; options: string[] }[];
}

type GroupBy = "none" | "form" | "product" | "day";
type DateRange = "all" | "7" | "30" | "90";

const EDITABLE_TYPES = new Set(["text", "number", "select", "scale", "boolean"]);

export function DataGrid({
  rows: initialRows,
  forms,
  businessName,
}: {
  rows: SubmissionRow[];
  forms: FormDef[];
  businessName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState(initialRows);
  const [formFilter, setFormFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRange>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [editing, setEditing] = useState<{ rowId: string; questionId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [toDelete, setToDelete] = useState<string | null>(null);

  const activeForm = formFilter === "all" ? null : forms.find((f) => f.id === formFilter) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minDate = range === "all" ? null : Date.now() - Number(range) * 86400000;
    return rows.filter((r) => {
      if (formFilter !== "all" && r.form_id !== formFilter) return false;
      if (minDate && new Date(r.created_at).getTime() < minDate) return false;
      if (q) {
        const hay = [r.customer_name, r.product, r.form_name, r.discount_code, ...Object.values(r.answers).map((v) => String(v))]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, formFilter, search, range]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "", label: null as string | null, rows: filtered }];
    const map = new Map<string, SubmissionRow[]>();
    for (const r of filtered) {
      const key =
        groupBy === "form"
          ? r.form_name ?? "Formulario"
          : groupBy === "product"
            ? r.product ?? "Sin producto"
            : new Date(r.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return [...map.entries()].map(([key, groupRows]) => ({ key, label: key, rows: groupRows }));
  }, [filtered, groupBy]);

  const questionCols = activeForm?.questions ?? [];

  function displayValue(v: unknown): string {
    if (v == null || v === "") return "—";
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === "boolean") return v ? "Sí" : "No";
    return String(v);
  }

  async function saveEdit() {
    if (!editing) return;
    const q = questionCols.find((x) => x.id === editing.questionId);
    let value: unknown = editValue;
    if (q?.type === "number" || q?.type === "scale") value = editValue === "" ? null : Number(editValue);
    if (q?.type === "boolean") value = editValue === "Sí";
    try {
      await api(`/api/submissions/${editing.rowId}`, {
        method: "PATCH",
        body: { questionId: editing.questionId, value },
      });
      setRows((rs) =>
        rs.map((r) =>
          r.id === editing.rowId
            ? {
                ...r,
                answers: { ...r.answers, [editing.questionId]: value },
                product: q?.type && r.product !== null && questionColIsProduct(q.id) ? String(value) : r.product,
              }
            : r,
        ),
      );
      toast("success", "Celda actualizada");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setEditing(null);
    }
  }

  function questionColIsProduct(_qid: string) {
    return false; // el backend sincroniza `product`; el refresh lo trae
  }

  async function removeRow() {
    if (!toDelete) return;
    try {
      await api(`/api/submissions/${toDelete}`, { method: "DELETE" });
      setRows((rs) => rs.filter((r) => r.id !== toDelete));
      toast("success", "Registro eliminado");
      router.refresh();
    } catch {
      toast("error", "No se pudo eliminar");
    } finally {
      setToDelete(null);
    }
  }

  function buildExport(): ExportTable {
    const columns = ["Fecha", "Cliente", "Formulario", "Producto", "Monto", "Cupón", ...questionCols.map((q) => q.label)];
    const exportRows = filtered.map((r) => [
      formatDateTime(r.created_at),
      r.customer_name ?? "",
      r.form_name ?? "",
      r.product ?? "",
      r.amount ?? null,
      r.discount_code ?? "",
      ...questionCols.map((q) => {
        const v = r.answers[q.id];
        return v == null ? "" : Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Sí" : "No") : (v as string | number);
      }),
    ]);
    return { title: `Base de datos — ${businessName}`, columns, rows: exportRows };
  }

  const exportName = `synapbase-registros-${new Date().toISOString().slice(0, 10)}`;

  return (
    <div className="animate-fade-up">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar en los registros…" className="w-full sm:w-64" />
        <Select value={formFilter} onChange={(e) => setFormFilter(e.target.value)} className="!h-9.5 w-52">
          <option value="all">Todos los formularios</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
        <Select value={range} onChange={(e) => setRange(e.target.value as DateRange)} className="!h-9.5 w-40">
          <option value="all">Todo el período</option>
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
        </Select>
        <div className="flex items-center gap-1.5 rounded-[10px] border border-line-strong/80 bg-white px-1.5 py-1 shadow-card">
          <Layers className="ml-1 size-3.5 text-ink-400" />
          {(
            [
              ["none", "Sin agrupar"],
              ["form", "Formulario"],
              ["product", "Producto"],
              ["day", "Día"],
            ] as [GroupBy, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setGroupBy(v)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[12px] font-medium transition-all",
                groupBy === v ? "bg-ink-950 text-white" : "text-ink-500 hover:text-ink-900",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <ExportBtn icon={Sheet} label="CSV" onClick={() => exportCsv(buildExport(), exportName)} />
          <ExportBtn icon={FileSpreadsheet} label="Excel" onClick={() => exportExcel(buildExport(), exportName)} />
          <ExportBtn icon={FileText} label="PDF" onClick={() => void exportPdf(buildExport(), exportName, `${formatNumber(filtered.length)} registros`)} />
        </div>
      </div>

      {/* Grilla */}
      <div className="card overflow-hidden">
        <div className="max-h-[calc(100dvh-280px)] overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-ink-50 shadow-[0_1px_0_var(--color-line)]">
              <tr>
                <Th>Fecha</Th>
                <Th>Cliente</Th>
                {formFilter === "all" && <Th>Formulario</Th>}
                <Th>Producto</Th>
                <Th>Monto</Th>
                {questionCols.map((q) => (
                  <Th key={q.id}>
                    {q.label}
                    <span className="ml-1 rounded bg-brand-100 px-1 py-px text-[9px] font-semibold uppercase text-brand-700">
                      editable
                    </span>
                  </Th>
                ))}
                <Th className="w-10"> </Th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.key || "all"}>
                  {g.label && (
                    <tr className="sticky top-[37px] z-[5]">
                      <td
                        colSpan={99}
                        className="border-b border-line bg-brand-50/90 px-4 py-1.5 text-[12px] font-semibold text-brand-900 backdrop-blur"
                      >
                        {g.label}
                        <span className="ml-2 font-normal text-brand-700/70">{g.rows.length} registros</span>
                      </td>
                    </tr>
                  )}
                  {g.rows.map((r) => (
                    <tr key={r.id} className="group border-b border-line/70 transition-colors last:border-0 hover:bg-ink-50/60">
                      <td className="whitespace-nowrap px-4 py-2.5 text-[12.5px] text-ink-500">
                        {formatDateTime(r.created_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.customer_id ? (
                          <Link href={`/app/clientes/${r.customer_id}`} className="font-medium text-ink-900 hover:text-brand-700">
                            {r.customer_name ?? "—"}
                          </Link>
                        ) : (
                          <span className="text-ink-400">{r.customer_name ?? "—"}</span>
                        )}
                      </td>
                      {formFilter === "all" && (
                        <td className="whitespace-nowrap px-4 py-2.5 text-[12.5px] text-ink-500">{r.form_name}</td>
                      )}
                      <td className="max-w-52 truncate px-4 py-2.5 text-[13px] text-ink-700">{r.product ?? "—"}</td>
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-[13px] text-ink-700">
                        {r.amount != null && r.amount > 0 ? formatMoney(r.amount) : "—"}
                      </td>
                      {questionCols.map((q) => {
                        const isEditing = editing?.rowId === r.id && editing.questionId === q.id;
                        const value = r.answers[q.id];
                        const editable = EDITABLE_TYPES.has(q.type);
                        return (
                          <td
                            key={q.id}
                            className={cn(
                              "max-w-56 px-4 py-2.5 text-[13px] text-ink-700",
                              editable && !isEditing && "cursor-pointer hover:bg-brand-50/70",
                            )}
                            onClick={() => {
                              if (!editable || isEditing) return;
                              setEditing({ rowId: r.id, questionId: q.id });
                              setEditValue(
                                value == null ? "" : typeof value === "boolean" ? (value ? "Sí" : "No") : String(value),
                              );
                            }}
                          >
                            {isEditing ? (
                              <span className="flex items-center gap-1">
                                {q.type === "select" || q.type === "boolean" ? (
                                  <select
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="h-7 w-full rounded-md border border-brand-400 bg-white px-1.5 text-[12.5px] outline-none ring-2 ring-brand-100"
                                  >
                                    <option value="">—</option>
                                    {(q.type === "boolean" ? ["Sí", "No"] : q.options).map((o) => (
                                      <option key={o}>{o}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") void saveEdit();
                                      if (e.key === "Escape") setEditing(null);
                                    }}
                                    className="h-7 w-full min-w-24 rounded-md border border-brand-400 bg-white px-1.5 text-[12.5px] outline-none ring-2 ring-brand-100"
                                  />
                                )}
                                <button onClick={(e) => { e.stopPropagation(); void saveEdit(); }} className="rounded p-1 text-success-600 hover:bg-success-50">
                                  <Check className="size-3.5" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setEditing(null); }} className="rounded p-1 text-ink-400 hover:bg-ink-100">
                                  <X className="size-3.5" />
                                </button>
                              </span>
                            ) : (
                              <span className="block truncate">{displayValue(value)}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2.5">
                        <button
                          onClick={() => setToDelete(r.id)}
                          className="rounded-lg p-1.5 text-ink-300 opacity-0 transition-all hover:bg-danger-50 hover:text-danger-600 group-hover:opacity-100"
                          aria-label="Eliminar registro"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState
              icon={Database}
              title="Sin registros"
              description="Cuando tus clientes completen el formulario del QR, cada respuesta aparece acá como una fila."
            />
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line bg-ink-50/40 px-4 py-2 text-[12px] text-ink-400">
          <span>{formatNumber(filtered.length)} registros{formFilter !== "all" && " del formulario seleccionado"}</span>
          {formFilter === "all" && (
            <span>Elegí un formulario para ver y editar sus respuestas como columnas</span>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={removeRow}
        title="¿Eliminar este registro?"
        description="Se elimina la respuesta completa. Los contadores del cliente se recalculan automáticamente."
      />
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-400", className)}>
      {children}
    </th>
  );
}

function ExportBtn({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line-strong/80 bg-white px-3 text-[12.5px] font-medium text-ink-700 shadow-card transition hover:bg-ink-50"
    >
      <Icon className="size-3.5 text-ink-400" />
      {label}
    </button>
  );
}
