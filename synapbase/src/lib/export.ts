import { downloadBlob } from "./utils";

export interface ExportTable {
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
}

function cell(v: string | number | null): string {
  return v == null ? "" : String(v);
}

/** CSV con BOM (Excel lo abre con acentos correctos). */
export function exportCsv(table: ExportTable, filename: string) {
  const esc = (v: string | number | null) => `"${cell(v).replaceAll('"', '""')}"`;
  const lines = [table.columns.map(esc).join(","), ...table.rows.map((r) => r.map(esc).join(","))];
  downloadBlob("﻿" + lines.join("\n"), `${filename}.csv`, "text/csv;charset=utf-8");
}

/**
 * Excel real sin dependencias: SpreadsheetML 2003 (.xls).
 * Lo abren Excel, LibreOffice y Google Sheets sin problemas.
 */
export function exportExcel(table: ExportTable, filename: string) {
  const escXml = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const rowXml = (cells: (string | number | null)[], header = false) =>
    `<Row>${cells
      .map((v) => {
        const isNum = typeof v === "number" && Number.isFinite(v);
        const style = header ? ' ss:StyleID="h"' : "";
        return `<Cell${style}><Data ss:Type="${isNum ? "Number" : "String"}">${escXml(cell(v))}</Data></Cell>`;
      })
      .join("")}</Row>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#EDEDFE" ss:Pattern="Solid"/></Style>
  </Styles>
  <Worksheet ss:Name="${escXml(table.title).slice(0, 30)}">
    <Table>
      ${rowXml(table.columns, true)}
      ${table.rows.map((r) => rowXml(r)).join("\n      ")}
    </Table>
  </Worksheet>
</Workbook>`;
  downloadBlob(xml, `${filename}.xls`, "application/vnd.ms-excel");
}

/** PDF con jspdf + autotable (import dinámico para no engordar el bundle). */
export async function exportPdf(table: ExportTable, filename: string, subtitle?: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: table.columns.length > 6 ? "landscape" : "portrait", unit: "mm" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(23, 23, 28);
  doc.text(table.title, 14, 16);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(110, 110, 120);
    doc.text(subtitle, 14, 22);
  }
  autoTable(doc, {
    startY: subtitle ? 27 : 22,
    head: [table.columns],
    body: table.rows.map((r) => r.map(cell)),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2, textColor: [40, 40, 46] },
    headStyles: { fillColor: [91, 91, 214], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 250] },
  });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 160);
    doc.text(
      `Generado con SynapBase · ${new Date().toLocaleDateString("es-AR")} · pág. ${i}/${pages}`,
      14,
      doc.internal.pageSize.getHeight() - 7,
    );
  }
  doc.save(`${filename}.pdf`);
}
