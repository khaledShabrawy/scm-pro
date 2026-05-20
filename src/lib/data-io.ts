// ─── SCM Pro Data I/O Utilities ───────────────────────────────────────────────
// CSV export (zero deps) · Excel export (SheetJS) · CSV/Excel import

export type DataRow = Record<string, string | number | null>;

// ── CSV Export ────────────────────────────────────────────────────────────────
export function exportCSV(data: DataRow[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const escape  = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows    = data.map(row => headers.map(h => escape(row[h])).join(","));
  const csv     = [headers.join(","), ...rows].join("\n");
  triggerDownload(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

// ── Excel Export (SheetJS) ────────────────────────────────────────────────────
export async function exportExcel(data: DataRow[], filename: string, sheetName = "Data"): Promise<void> {
  const XLSX = await import("xlsx");
  const ws   = XLSX.utils.json_to_sheet(data);
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── CSV Import ────────────────────────────────────────────────────────────────
export function parseCSV(text: string): DataRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    // Handle quoted fields
    const values: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; continue; }
      if (line[i] === "," && !inQ) { values.push(cur.trim()); cur = ""; continue; }
      cur += line[i];
    }
    values.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

// ── Excel Import ──────────────────────────────────────────────────────────────
export async function parseExcel(buffer: ArrayBuffer): Promise<DataRow[]> {
  const XLSX = await import("xlsx");
  const wb   = XLSX.read(buffer, { type: "array" });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<DataRow>(ws, { defval: "" });
}

// ── Helper ────────────────────────────────────────────────────────────────────
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href    = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Page Export Schemas ───────────────────────────────────────────────────────
// Each page exports its main table data in a flat format

export const EXPORT_SCHEMAS = {
  demand: (data: {month:string;actual:number;hw:number;ly:number}[]) =>
    data.map(d => ({ Month: d.month, "Actual Units": d.actual, "Forecast (HW)": d.hw, "Last Year": d.ly })),

  inventory: (data: {sku:string;name:string;eoqVal:number;ss:number;rop:number;onHand:number;status:string;annCost:number}[]) =>
    data.map(d => ({ SKU: d.sku, Name: d.name, EOQ: d.eoqVal, "Safety Stock": d.ss, ROP: d.rop, "On Hand": d.onHand, Status: d.status, "Annual Cost (EGP)": d.annCost })),

  sop: (data: {month:string;forecast:number;supply:number;gap:number;openingInv:number;closingInv:number;backlog:number}[]) =>
    data.map(d => ({ Month: d.month, Forecast: d.forecast, Supply: d.supply, Gap: d.gap, "Opening Inv": d.openingInv, "Closing Inv": d.closingInv, Backlog: d.backlog })),

  analytics: (data: {m:string;revenue:number;cogs:number;gp:number;forecast:number}[]) =>
    data.map(d => ({ Month: d.m, "Revenue (EGP)": d.revenue, "COGS (EGP)": d.cogs, "Gross Profit (EGP)": d.gp, "Forecast (EGP)": d.forecast })),
} as const;
