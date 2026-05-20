"use client";
import { useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, LineChart, Line, ReferenceLine,
} from "recharts";
import { utilization, efficiency, ratedCapacity, safetyStock, SERVICE_LEVEL_Z } from "@/lib/apics-algorithms";
import { DEFAULT_ALERTS } from "@/lib/notifications";

// ─── APICS Capacity Utilization thresholds ───────────────
const util = (a: number, b: number) => Math.round((a / b) * 100);
const cellColor = (u: number, maint: boolean) => {
  if (maint) return { bg: "rgba(155,163,178,0.15)", text: "#9BA3B2", label: "MNT" };
  if (u > 95)  return { bg: "rgba(229,115,115,0.25)", text: "#EF5350", label: `${u}%` };
  if (u > 85)  return { bg: "rgba(255,167,38,0.22)",  text: "#FFA726", label: `${u}%` };
  if (u > 70)  return { bg: "rgba(255,213,79,0.2)",   text: "#FFD54F", label: `${u}%` };
  return           { bg: "rgba(46,160,100,0.18)",  text: "#4CAF50", label: `${u}%` };
};

// 8 production lines × 12 weeks (actual hours / available hours)
const LINES = ["Line 1 – Bev A", "Line 2 – Bev B", "Line 3 – Dairy", "Line 4 – Dairy", "Line 5 – Snacks", "Line 6 – Pkg", "Line 7 – Pkg", "Line 8 – CIP"];
const WEEKS = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);

type CapCell = { a: number; v: number; maint?: boolean };
const RAW_CAP: CapCell[][] = [
  // Line 1
  [{a:148,v:168},{a:155,v:168},{a:162,v:168},{a:168,v:168},{a:165,v:168},{a:158,v:168},{a:145,v:168},{a:160,v:168},{a:166,v:168},{a:168,v:168},{a:155,v:168},{a:163,v:168}],
  // Line 2
  [{a:135,v:168},{a:140,v:168},{a:150,v:168},{a:160,v:168},{a:155,v:168},{a:168,v:168},{a:158,v:168},{a:148,v:168},{a:152,v:168},{a:160,v:168},{a:0,v:168,maint:true},{a:155,v:168}],
  // Line 3
  [{a:112,v:168},{a:118,v:168},{a:125,v:168},{a:135,v:168},{a:128,v:168},{a:140,v:168},{a:145,v:168},{a:132,v:168},{a:128,v:168},{a:138,v:168},{a:142,v:168},{a:148,v:168}],
  // Line 4
  [{a:95,v:168},{a:102,v:168},{a:108,v:168},{a:115,v:168},{a:120,v:168},{a:118,v:168},{a:125,v:168},{a:130,v:168},{a:128,v:168},{a:122,v:168},{a:118,v:168},{a:115,v:168}],
  // Line 5
  [{a:140,v:168},{a:148,v:168},{a:155,v:168},{a:162,v:168},{a:168,v:168},{a:165,v:168},{a:0,v:168,maint:true},{a:158,v:168},{a:162,v:168},{a:168,v:168},{a:165,v:168},{a:160,v:168}],
  // Line 6
  [{a:88,v:168},{a:92,v:168},{a:98,v:168},{a:105,v:168},{a:110,v:168},{a:108,v:168},{a:115,v:168},{a:120,v:168},{a:118,v:168},{a:112,v:168},{a:108,v:168},{a:105,v:168}],
  // Line 7
  [{a:72,v:168},{a:78,v:168},{a:82,v:168},{a:88,v:168},{a:92,v:168},{a:90,v:168},{a:95,v:168},{a:98,v:168},{a:95,v:168},{a:88,v:168},{a:85,v:168},{a:82,v:168}],
  // Line 8 — CIP (cleaning, usually low util)
  [{a:48,v:168},{a:52,v:168},{a:58,v:168},{a:55,v:168},{a:62,v:168},{a:60,v:168},{a:0,v:168,maint:true},{a:58,v:168},{a:62,v:168},{a:65,v:168},{a:60,v:168},{a:58,v:168}],
];

// LP Solver mock results (Linear Programming — APICS MPS/S&OP optimization)
const LP_VARS = [
  { var: "x₁ (Bev A)",  qty: 48200, cost: 2.84, total: 136888, status: "Optimal" },
  { var: "x₂ (Bev B)",  qty: 35600, cost: 3.12, total: 111072, status: "Optimal" },
  { var: "x₃ (Dairy)",  qty: 29800, cost: 4.25, total: 126650, status: "Optimal" },
  { var: "x₄ (Snacks)", qty: 22400, cost: 3.78, total: 84672,  status: "Optimal" },
  { var: "x₅ (Pkg)",    qty: 18900, cost: 2.15, total: 40635,  status: "At Bound" },
];

const LP_SHADOW = [
  { constraint: "Capacity (L1-L5)",    rhs: "840 hrs/wk", shadow: 1.84, unit: "EGP/hr" },
  { constraint: "RM Steel Avail.",      rhs: "12,000 kg",  shadow: 0.42, unit: "EGP/kg" },
  { constraint: "Min Service Level",   rhs: "95%",         shadow: 18.2, unit: "EGP/%pt" },
  { constraint: "Budget Cap",           rhs: "EGP 2.5M",   shadow: 0,    unit: "—" },
];

// Supplier Scorecard (APICS SCOR: OTD, Quality, Lead Time, Price Compliance)
const SUPPLIERS = [
  { name: "Nile Packaging",    otd: 94, qual: 98.2, ltDays: 12, ltr: 2, spend: 1.82, risk: "Low",    trend: "↑" },
  { name: "MidEast Cartons",   otd: 88, qual: 96.5, ltDays: 18, ltr: 3, spend: 1.24, risk: "Med",    trend: "→" },
  { name: "Cairo Plastics",    otd: 91, qual: 97.8, ltDays: 14, ltr: 2, spend: 0.98, risk: "Low",    trend: "↑" },
  { name: "Gulf Chemicals",    otd: 76, qual: 94.1, ltDays: 28, ltr: 4, spend: 2.41, risk: "High",   trend: "↓" },
  { name: "Alex Fresh Milk",   otd: 95, qual: 99.1, ltDays:  5, ltr: 1, spend: 3.12, risk: "Low",    trend: "↑" },
  { name: "Delta Sugar",       otd: 82, qual: 95.8, ltDays: 21, ltr: 3, spend: 1.68, risk: "Med",    trend: "→" },
];

// Procurement POs
const POS = [
  { po: "PO-2026-0841", supplier: "Alex Fresh Milk",  sku: "RM-Milk-3.5%", qty: "48,000 L",  etd: "May 21", status: "Confirmed", value: 182400 },
  { po: "PO-2026-0842", supplier: "Nile Packaging",   sku: "Can-330ml",    qty: "2,400,000", etd: "May 23", status: "Confirmed", value: 312000 },
  { po: "PO-2026-0843", supplier: "Cairo Plastics",   sku: "Bottle-1L",    qty: "840,000",   etd: "May 28", status: "In Transit", value: 126000 },
  { po: "PO-2026-0844", supplier: "Gulf Chemicals",   sku: "Flavoring-X",  qty: "1,200 kg",  etd: "Jun 05", status: "Delayed",   value: 89600  },
  { po: "PO-2026-0845", supplier: "Delta Sugar",      sku: "Sugar-Raw",    qty: "85,000 kg", etd: "Jun 10", status: "Pending",   value: 248500 },
];

const ALERTS = [
  { type: "Critical", msg: "Gulf Chemicals PO-0844 delayed 12 days — Flavoring-X SS breach in W4",  time: "2h ago",  color: "#EF5350" },
  { type: "Warning",  msg: "Line 2 capacity >95% in W6 — recommend load shift to Line 4",            time: "4h ago",  color: "#FFA726" },
  { type: "Warning",  msg: "MidEast Cartons OTD 88% — below 90% threshold for 3 consecutive months", time: "1d ago",  color: "#FFA726" },
  { type: "Info",     msg: "RM Coverage for Dairy drops to 2.8 weeks by W5 — EOQ reorder triggered",  time: "2d ago",  color: "#60B8D4" },
  { type: "Info",     msg: "Rated Capacity increased by 240 hrs after Line 8 maintenance completion",  time: "3d ago",  color: "#60B8D4" },
];

// Weekly capacity summary for BarChart
const CAP_SUMMARY = WEEKS.map((wk, wi) => {
  const totalActual = RAW_CAP.reduce((s, line) => s + (line[wi].maint ? 0 : line[wi].a), 0);
  const totalAvail  = RAW_CAP.reduce((s, line) => s + line[wi].v, 0);
  const rated = Math.round(ratedCapacity(totalAvail, (totalActual / totalAvail) * 100, 92));
  return { wk, actual: totalActual, rated, available: totalAvail };
});

// Supplier Radar (OTD, Quality, LT score, Spend ratio, Risk inv.)
const SUP_RADAR = SUPPLIERS.map(s => ({
  supplier: s.name.split(" ")[0],
  OTD: s.otd,
  Quality: Math.round(s.qual),
  "LT Score": Math.round(100 - s.ltDays * 2.5),
  "Low Risk": s.risk === "Low" ? 100 : s.risk === "Med" ? 60 : 20,
}));

const t = (en: string, ar: string, lang: "en" | "ar") => lang === "ar" ? ar : en;

const riskColor = (r: string) =>
  r === "Low" ? "#4CAF50" : r === "Med" ? "#FFA726" : "#EF5350";
const statusColor = (s: string) =>
  s === "Confirmed" ? "#4CAF50" : s === "In Transit" ? "#60B8D4" : s === "Delayed" ? "#EF5350" : "#FFA726";
const poStatus = (s: string) =>
  s === "Confirmed" ? "rgba(46,160,100,0.15)" : s === "In Transit" ? "rgba(96,184,212,0.1)" : s === "Delayed" ? "rgba(229,115,115,0.15)" : "rgba(201,168,76,0.08)";

export default function SupplyPage() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"capacity" | "lp" | "suppliers" | "procurement">("capacity");

  // APICS KPIs
  const avgUtil = useMemo(() => {
    const cells = RAW_CAP.flatMap(line => line.filter(c => !c.maint).map(c => util(c.a, c.v)));
    return Math.round(cells.reduce((s, v) => s + v, 0) / cells.length);
  }, []);

  const ss95 = Math.round(safetyStock(SERVICE_LEVEL_Z[95], 14, 3200, 28400, 2));
  const rcTotal = Math.round(ratedCapacity(168 * 8 * 12, avgUtil, 92));

  const kpis = [
    {
      label: t("Avg Capacity Util.", "متوسط استغلال الطاقة", lang),
      value: `${avgUtil}%`,
      sub: t("APICS: Actual / Available × 100", "APICS: الفعلي / المتاح × ١٠٠", lang),
      color: avgUtil > 85 ? "#FFA726" : "#4CAF50",
      icon: "⚙️",
    },
    {
      label: t("Supplier OTD", "التسليم في الموعد", lang),
      value: "89%",
      sub: t("SCOR: On-Time Delivery Rate", "SCOR: معدل التسليم في الوقت", lang),
      color: "#60B8D4",
      icon: "🚛",
    },
    {
      label: t("Production Adherence", "التزام الإنتاج", lang),
      value: "91%",
      sub: t("Actual vs MPS Schedule", "الفعلي مقابل جدول MPS", lang),
      color: "#7B5EA7",
      icon: "🏭",
    },
    {
      label: t("RM Coverage", "تغطية المواد الخام", lang),
      value: "3.2 wks",
      sub: t("Safety Stock @ 95% SL (Z=1.645)", "مخزون أمان ٩٥٪ (Z=١.٦٤٥)", lang),
      color: "#C9A84C",
      icon: "📦",
    },
    {
      label: t("LP Optimal Cost", "التكلفة المثلى", lang),
      value: "EGP 2.34M",
      sub: t("Min(Σcᵢxᵢ) — Linear Program", "LP: تحسين تكلفة الإنتاج", lang),
      color: "#2EA064",
      icon: "📊",
    },
  ];

  const tabs = [
    { id: "capacity",    en: "Capacity Heatmap",   ar: "خريطة الطاقة" },
    { id: "lp",          en: "LP Solver",           ar: "محلل البرمجة الخطية" },
    { id: "suppliers",   en: "Supplier Scorecard",  ar: "بطاقة الموردين" },
    { id: "procurement", en: "Procurement POs",     ar: "أوامر الشراء" },
  ] as const;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar lang={lang} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar
          lang={lang}
          onLangChange={() => setLang(l => l === "en" ? "ar" : "en")}
          pageTitle="Supply Planning"
          pageAr="تخطيط الإمداد"
          module="supply"
          exportData={LP_VARS.map(v => ({ Variable: v.var, "Qty (units)": v.qty, "Cost/unit (EGP)": v.cost, "Total Cost (EGP)": v.total, Status: v.status }))}
          exportFilename="supply-plan"
          alerts={DEFAULT_ALERTS}
          onMenuToggle={() => setSidebarOpen(o => !o)}
        />
        <main style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── KPI Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
            {kpis.map(k => (
              <div key={k.label} style={{
                background: "var(--bg-card)", borderRadius: 10,
                border: `1px solid ${k.color}22`,
                padding: "14px 16px",
                borderLeft: `4px solid ${k.color}`,
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Alerts ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ALERTS.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                background: `${a.color}0D`, border: `1px solid ${a.color}30`,
                borderRadius: 8, padding: "8px 14px",
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
                  background: `${a.color}22`, color: a.color, whiteSpace: "nowrap", marginTop: 2,
                }}>{a.type.toUpperCase()}</span>
                <span style={{ fontSize: 12, color: "var(--text)", flex: 1 }}>{a.msg}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{a.time}</span>
              </div>
            ))}
          </div>

          {/* ── Tab Navigation ── */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(201,168,76,0.15)", paddingBottom: 0 }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "8px 16px", fontSize: 12, fontWeight: 700,
                background: "transparent", cursor: "pointer",
                border: "none", borderBottom: activeTab === tab.id ? "2px solid #7B5EA7" : "2px solid transparent",
                color: activeTab === tab.id ? "#7B5EA7" : "var(--text-muted)",
                transition: "all 0.2s",
              }}>
                {lang === "ar" ? tab.ar : tab.en}
              </button>
            ))}
          </div>

          {/* ── CAPACITY HEATMAP ── */}
          {activeTab === "capacity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Legend */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 10, color: "var(--text-muted)" }}>
                <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 11 }}>
                  {t("Capacity Heatmap — 8 Lines × 12 Weeks", "خريطة الطاقة — ٨ خطوط × ١٢ أسبوع", lang)}
                </span>
                {[
                  { label: "<70% Normal",    bg: "rgba(46,160,100,0.25)",  text: "#4CAF50" },
                  { label: "70-85% Good",    bg: "rgba(255,213,79,0.3)",   text: "#FFD54F" },
                  { label: "85-95% High",    bg: "rgba(255,167,38,0.3)",   text: "#FFA726" },
                  { label: ">95% Critical",  bg: "rgba(229,115,115,0.35)", text: "#EF5350" },
                  { label: "Maintenance",    bg: "rgba(155,163,178,0.2)",  text: "#9BA3B2" },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: `1px solid ${l.text}50` }} />
                    <span style={{ color: l.text }}>{l.label}</span>
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.12)", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "160px repeat(12, 1fr)", borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
                  <div style={{ padding: "8px 12px", fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>
                    {t("PRODUCTION LINE", "خط الإنتاج", lang)}
                  </div>
                  {WEEKS.map(w => (
                    <div key={w} style={{ padding: "8px 4px", textAlign: "center", fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>{w}</div>
                  ))}
                </div>
                {/* Rows */}
                {LINES.map((line, li) => (
                  <div key={line} style={{
                    display: "grid", gridTemplateColumns: "160px repeat(12, 1fr)",
                    borderBottom: li < LINES.length - 1 ? "1px solid rgba(201,168,76,0.06)" : "none",
                  }}>
                    <div style={{ padding: "10px 12px", fontSize: 11, color: "var(--text)", fontWeight: 600 }}>{line}</div>
                    {RAW_CAP[li].map((cell, wi) => {
                      const u = cell.maint ? 0 : util(cell.a, cell.v);
                      const style = cellColor(u, !!cell.maint);
                      return (
                        <div key={wi} style={{
                          background: style.bg, color: style.text,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, padding: "10px 2px",
                          borderLeft: "1px solid rgba(201,168,76,0.05)",
                          cursor: "default",
                        }} title={cell.maint ? "Maintenance" : `${cell.a}h / ${cell.v}h = ${u}%`}>
                          {style.label}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Capacity Bar Chart */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(123,94,167,0.2)", padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                  {t("Weekly Capacity Summary", "ملخص الطاقة الأسبوعية", lang)}
                  <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 10 }}>
                    Rated Capacity = Available × Utilization% × Efficiency%  (APICS)
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={CAP_SUMMARY} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                    <XAxis dataKey="wk" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#9BA3B2", fontSize: 10 }} unit="h" />
                    <Tooltip contentStyle={{ background: "#1C2435", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="actual" name="Actual Hours" fill="#7B5EA7" radius={[3,3,0,0]} />
                    <Bar dataKey="rated"  name="Rated Capacity" fill="#C9A84C" radius={[3,3,0,0]} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── LP SOLVER ── */}
          {activeTab === "lp" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Objective */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(46,160,100,0.25)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#2EA064", marginBottom: 12 }}>
                  LP Objective — {t("Minimize Production Cost", "تحسين تكلفة الإنتاج", lang)}
                </div>
                <div style={{
                  background: "rgba(46,160,100,0.06)", borderRadius: 8, padding: "14px 16px",
                  fontFamily: "monospace", fontSize: 12, color: "#4CAF50", marginBottom: 16, lineHeight: 1.8,
                }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 10, marginBottom: 6 }}>MIN</div>
                  Σ cᵢ × xᵢ = 2.84x₁ + 3.12x₂ + 4.25x₃ + 3.78x₄ + 2.15x₅
                  <div style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 10, marginBottom: 4 }}>SUBJECT TO</div>
                  x₁ + x₂ ≤ 840 hrs  (Capacity L1-L5){"\n"}
                  RM_milk × x₃ ≤ 12,000 kg{"\n"}
                  x₁, x₂, x₃, x₄, x₅ ≥ 0
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("Optimal Objective Value", "القيمة المثلى", lang)}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#2EA064" }}>EGP 2,341,917</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("Solver Status", "حالة المحلل", lang)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#4CAF50", background: "rgba(46,160,100,0.15)", padding: "2px 8px", borderRadius: 4 }}>OPTIMAL</span>
                </div>
              </div>

              {/* Shadow Prices */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.2)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#C9A84C", marginBottom: 12 }}>
                  {t("Shadow Prices (Dual Values)", "الأسعار الظلية", lang)}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12 }}>
                  Shadow price = Δ Objective / Δ RHS — marginal value of relaxing each constraint
                </div>
                {LP_SHADOW.map(row => (
                  <div key={row.constraint} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 0", borderBottom: "1px solid rgba(201,168,76,0.08)",
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{row.constraint}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>RHS: {row.rhs}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: row.shadow > 0 ? "#FFA726" : "#9BA3B2" }}>
                        {row.shadow > 0 ? `+${row.shadow}` : row.shadow}
                      </div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{row.unit}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Decision Variables */}
              <div style={{ gridColumn: "span 2", background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(123,94,167,0.2)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#7B5EA7", marginBottom: 12 }}>
                  {t("Optimal Production Plan", "خطة الإنتاج المثلى", lang)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4 }}>
                  {["Variable", "Qty (units)", "Cost/unit", "Total Cost", "Status"].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", padding: "6px 8px", background: "rgba(123,94,167,0.08)", borderRadius: 4 }}>{h}</div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                  {LP_VARS.map(row => (
                    <div key={row.var} style={{
                      display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4,
                    }}>
                      <div style={{ padding: "8px", fontSize: 11, fontWeight: 700, color: "#7B5EA7", fontFamily: "monospace" }}>{row.var}</div>
                      <div style={{ padding: "8px", fontSize: 11, color: "var(--text)" }}>{row.qty.toLocaleString()}</div>
                      <div style={{ padding: "8px", fontSize: 11, color: "var(--text)" }}>{row.cost.toFixed(2)}</div>
                      <div style={{ padding: "8px", fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{row.total.toLocaleString()}</div>
                      <div style={{ padding: "8px" }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                          background: row.status === "Optimal" ? "rgba(46,160,100,0.15)" : "rgba(201,168,76,0.15)",
                          color: row.status === "Optimal" ? "#4CAF50" : "#C9A84C",
                        }}>{row.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SUPPLIER SCORECARD ── */}
          {activeTab === "suppliers" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Table */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.15)", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
                    {t("Supplier Performance Scorecard", "بطاقة أداء الموردين", lang)}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>APICS SCOR: OTD · Quality · Lead Time · Risk</span>
                </div>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr", padding: "8px 20px", background: "rgba(201,168,76,0.04)" }}>
                  {["Supplier", "OTD %", "Quality %", "LT (days)", "LT Risk", "Spend (M EGP)", "Risk"].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{h}</div>
                  ))}
                </div>
                {SUPPLIERS.map((s, i) => (
                  <div key={s.name} style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr",
                    padding: "12px 20px",
                    borderTop: "1px solid rgba(201,168,76,0.06)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                      {s.name}
                      <span style={{ fontSize: 11, marginLeft: 6, color: s.trend === "↑" ? "#4CAF50" : s.trend === "↓" ? "#EF5350" : "#9BA3B2" }}>{s.trend}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: s.otd >= 90 ? "#4CAF50" : s.otd >= 80 ? "#FFA726" : "#EF5350" }}>{s.otd}%</div>
                    <div style={{ fontSize: 12, color: s.qual >= 97 ? "#4CAF50" : s.qual >= 95 ? "#FFA726" : "#EF5350", fontWeight: 600 }}>{s.qual}%</div>
                    <div style={{ fontSize: 12, color: "var(--text)" }}>{s.ltDays}</div>
                    <div style={{ fontSize: 11 }}>
                      {Array.from({ length: 5 }, (_, j) => (
                        <span key={j} style={{ color: j < s.ltr ? "#C9A84C" : "rgba(201,168,76,0.2)", fontSize: 12 }}>★</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text)" }}>{s.spend.toFixed(2)}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, alignSelf: "center", width: "fit-content",
                      background: `${riskColor(s.risk)}22`, color: riskColor(s.risk) }}>
                      {s.risk}
                    </div>
                  </div>
                ))}
              </div>

              {/* Radar Chart */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.15)", padding: "20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
                  {t("Multi-Criteria Supplier Radar", "مقارنة متعددة الأبعاد للموردين", lang)}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={[
                    { metric: "OTD",      ...Object.fromEntries(SUPPLIERS.map(s => [s.name.split(" ")[0], s.otd])) },
                    { metric: "Quality",  ...Object.fromEntries(SUPPLIERS.map(s => [s.name.split(" ")[0], Math.round(s.qual)])) },
                    { metric: "LT Score", ...Object.fromEntries(SUPPLIERS.map(s => [s.name.split(" ")[0], Math.round(100 - s.ltDays * 2.5)])) },
                    { metric: "Low Risk", ...Object.fromEntries(SUPPLIERS.map(s => [s.name.split(" ")[0], s.risk === "Low" ? 100 : s.risk === "Med" ? 60 : 20])) },
                  ]}>
                    <PolarGrid stroke="rgba(201,168,76,0.12)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "#9BA3B2", fontSize: 11 }} />
                    {SUPPLIERS.map((s, i) => (
                      <Radar key={s.name} name={s.name.split(" ")[0]} dataKey={s.name.split(" ")[0]}
                        stroke={["#C9A84C","#60B8D4","#7B5EA7","#EF5350","#4CAF50","#FFA726"][i]}
                        fill={["#C9A84C","#60B8D4","#7B5EA7","#EF5350","#4CAF50","#FFA726"][i]}
                        fillOpacity={0.08} strokeWidth={2} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1C2435", border: "1px solid rgba(201,168,76,0.2)", fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── PROCUREMENT POs ── */}
          {activeTab === "procurement" && (
            <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.15)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
                  {t("Open Purchase Orders", "أوامر الشراء المفتوحة", lang)}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>EOQ-triggered + MRP-driven</span>
              </div>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.8fr 1.5fr 1fr 1fr 1fr 1fr", padding: "8px 20px", background: "rgba(201,168,76,0.04)" }}>
                {["PO Number", "Supplier", "SKU / Material", "Qty", "ETD", "Value (EGP)", "Status"].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{h}</div>
                ))}
              </div>
              {POS.map((po, i) => (
                <div key={po.po} style={{
                  display: "grid", gridTemplateColumns: "1.5fr 1.8fr 1.5fr 1fr 1fr 1fr 1fr",
                  padding: "13px 20px",
                  borderTop: "1px solid rgba(201,168,76,0.06)",
                  background: poStatus(po.status),
                }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#C9A84C", fontWeight: 700 }}>{po.po}</div>
                  <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 600 }}>{po.supplier}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{po.sku}</div>
                  <div style={{ fontSize: 11, color: "var(--text)" }}>{po.qty}</div>
                  <div style={{ fontSize: 11, color: "var(--text)" }}>{po.etd}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{po.value.toLocaleString()}</div>
                  <div>
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4,
                      background: `${statusColor(po.status)}22`, color: statusColor(po.status),
                      border: `1px solid ${statusColor(po.status)}44`,
                    }}>{po.status}</span>
                  </div>
                </div>
              ))}
              {/* Summary footer */}
              <div style={{
                display: "flex", justifyContent: "flex-end", padding: "12px 20px",
                borderTop: "1px solid rgba(201,168,76,0.12)", gap: 40,
              }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{t("Total Open PO Value", "إجمالي قيمة أوامر الشراء", lang)}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#C9A84C" }}>
                    EGP {POS.reduce((s, p) => s + p.value, 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── APICS Formula Reference ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {[
              { label: "Utilization (APICS)", formula: "Actual Hrs / Available Hrs × 100", color: "#7B5EA7" },
              { label: "Rated Capacity", formula: "Available × Util% × Efficiency%", color: "#C9A84C" },
              { label: "Safety Stock", formula: "Z × √(LT×σ²_d + D²×σ²_LT)", color: "#2EA064" },
              { label: "LP Objective", formula: "MIN Σ cᵢxᵢ  s.t.  Ax ≤ b, x ≥ 0", color: "#60B8D4" },
            ].map(f => (
              <div key={f.label} style={{
                background: `${f.color}08`, border: `1px solid ${f.color}22`,
                borderRadius: 8, padding: "10px 12px",
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: f.color, marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>{f.formula}</div>
              </div>
            ))}
          </div>

        </main>
      </div>
    </div>
  );
}
