"use client";
import { useRef, useState } from "react";
import { exportCSV, exportExcel, parseCSV, parseExcel, DataRow } from "@/lib/data-io";

interface DataToolbarProps {
  /** Data to export */
  data: DataRow[];
  /** Base filename (no extension) */
  filename: string;
  /** Called after successful import with parsed rows */
  onImport?: (rows: DataRow[]) => void;
  /** Optional label shown next to buttons */
  label?: string;
}

export default function DataToolbar({ data, filename, onImport, label }: DataToolbarProps) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [modal,   setModal]   = useState<{ rows: DataRow[]; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      let rows: DataRow[];
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        rows = parseCSV(text) as DataRow[];
      } else {
        const buf = await file.arrayBuffer();
        rows = await parseExcel(buf) as DataRow[];
      }
      setModal({ rows, name: file.name });
      onImport?.(rows);
    } catch (err) {
      showToast("❌ Failed to parse file: " + (err as Error).message);
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(null), 3000);
  }

  const headers = modal?.rows[0] ? Object.keys(modal.rows[0]) : [];
  const preview = modal?.rows.slice(0, 10) ?? [];

  return (
    <>
      {/* ── Toolbar ── */}
      <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
        {label && <span style={{ fontSize:10, color:"var(--text-muted)", marginRight:4 }}>{label}</span>}

        <input
          ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
          style={{ display:"none" }} onChange={handleFile}
        />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          style={btn("#1A8A8A")}
          title="Import CSV or Excel"
        >
          {loading ? "⏳" : "📂"} {loading ? "Importing…" : "Import"}
        </button>

        <button
          onClick={() => { exportCSV(data, filename); showToast("✓ CSV downloaded"); }}
          style={btn("#2EA064")}
          title="Download as CSV"
        >
          ⬇ CSV
        </button>

        <button
          onClick={async () => { await exportExcel(data, filename); showToast("✓ Excel downloaded"); }}
          style={btn("#C9A84C")}
          title="Download as Excel"
        >
          ⬇ Excel
        </button>

        {toast && (
          <span style={{ fontSize:10, color: toast.startsWith("❌") ? "#EF5350" : "#4CAF50",
            fontWeight:700, marginLeft:4, transition:"opacity 0.3s" }}>
            {toast}
          </span>
        )}
      </div>

      {/* ── Import Preview Modal ── */}
      {modal && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(6,11,20,0.85)", zIndex:2000,
          display:"flex", alignItems:"center", justifyContent:"center", padding:16,
        }} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{
            background:"#0D1424", border:"1px solid rgba(201,168,76,0.25)", borderRadius:12,
            padding:24, width:"min(960px,95%)", maxHeight:"80vh",
            display:"flex", flexDirection:"column", gap:16,
          }}>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:"#C9A84C" }}>📂 {modal.name}</div>
                <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:3 }}>
                  {modal.rows.length.toLocaleString()} rows · {headers.length} columns
                  {modal.rows.length > 10 && ` · Showing first 10`}
                </div>
              </div>
              <button onClick={() => setModal(null)}
                style={{ background:"transparent", border:"none", color:"var(--text-muted)",
                  fontSize:20, cursor:"pointer", lineHeight:1, padding:"0 4px" }}>✕</button>
            </div>

            {/* Table */}
            <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:"50vh" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead style={{ position:"sticky", top:0, zIndex:1 }}>
                  <tr>
                    <th style={thStyle}>#</th>
                    {headers.map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <td style={tdStyle}>{i + 1}</td>
                      {headers.map(h => (
                        <td key={h} style={tdStyle}>{String(row[h] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <button onClick={() => setModal(null)} style={btn("#9BA3B2")}>Close</button>
              <button
                onClick={() => { onImport?.(modal.rows); showToast(`✓ ${modal.rows.length} rows imported`); setModal(null); }}
                style={btn("#2EA064")}
              >
                ✓ Apply {modal.rows.length} rows
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function btn(color: string): React.CSSProperties {
  return {
    padding:"5px 12px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer",
    border:`1px solid ${color}44`, background:`${color}14`, color,
    whiteSpace:"nowrap", transition:"background 0.15s",
  };
}
const thStyle: React.CSSProperties = {
  padding:"7px 12px", textAlign:"left", fontSize:10, fontWeight:700, color:"#C9A84C",
  background:"#0A0E1A", borderBottom:"1px solid rgba(201,168,76,0.2)", whiteSpace:"nowrap",
};
const tdStyle: React.CSSProperties = {
  padding:"6px 12px", color:"var(--text-muted)", whiteSpace:"nowrap", fontSize:11,
};
