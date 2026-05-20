"use client";
import { useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ReferenceLine,
} from "recharts";
import {
  safetyStock, reorderPoint, avgInventory, eoq, totalInventoryCost,
  inventoryTurns, dio, SERVICE_LEVEL_Z,
} from "@/lib/apics-algorithms";
import { DEFAULT_ALERTS } from "@/lib/notifications";

// ─── APICS Inventory Types ────────────────────────────────
// Cycle Stock | Safety Stock | Anticipation | Pipeline | Hedge | MRO

const t = (en: string, ar: string, lang: "en" | "ar") => lang === "ar" ? ar : en;

// EOQ calculations (real APICS formula √(2DS/iC))
const EOQ_ITEMS = [
  { sku:"SKU-BEV-001", name:"Beverage A 330ml",  D:480000, S:850,  i:0.25, C:4.20,  avgDemand:40000, sigmaD:3200, avgLT:14, sigmaLT:2, sl:95 },
  { sku:"SKU-BEV-002", name:"Beverage B 500ml",  D:360000, S:920,  i:0.25, C:5.80,  avgDemand:30000, sigmaD:2800, avgLT:14, sigmaLT:2, sl:95 },
  { sku:"SKU-DAI-001", name:"Dairy Milk 1L",     D:240000, S:1100, i:0.28, C:8.50,  avgDemand:20000, sigmaD:2400, avgLT:7,  sigmaLT:1, sl:98 },
  { sku:"SKU-DAI-002", name:"Yogurt 200g",       D:180000, S:780,  i:0.28, C:3.20,  avgDemand:15000, sigmaD:1800, avgLT:7,  sigmaLT:1, sl:95 },
  { sku:"SKU-SNK-001", name:"Snack Chips 120g",  D:300000, S:640,  i:0.22, C:2.80,  avgDemand:25000, sigmaD:3500, avgLT:21, sigmaLT:3, sl:90 },
  { sku:"SKU-PKG-001", name:"Pkg Goods 500g",    D:120000, S:580,  i:0.22, C:6.40,  avgDemand:10000, sigmaD:1200, avgLT:21, sigmaLT:3, sl:90 },
];

// Compute APICS metrics for each SKU
// Deterministic on-hand multipliers per SKU (avoids SSR hydration mismatch)
const ON_HAND_MULT = [1.77, 1.65, 1.42, 1.53, 1.38, 1.61];

const INV_TABLE = EOQ_ITEMS.map((item, idx) => {
  const Z = SERVICE_LEVEL_Z[item.sl];
  const eoqVal   = Math.round(Math.sqrt((2 * item.D * item.S) / (item.i * item.C)));
  const ss       = Math.round(safetyStock(Z, item.avgLT, item.sigmaD, item.avgDemand, item.sigmaLT));
  const rop      = Math.round(reorderPoint(item.avgDemand / 30, item.avgLT, ss));
  const avgInv   = Math.round(avgInventory(eoqVal, ss));
  const annCost  = Math.round(totalInventoryCost(item.D, eoqVal, item.S, item.i, item.C));
  const onHand   = Math.round(ss * ON_HAND_MULT[idx]);
  const status   = onHand < rop ? "Reorder" : onHand < ss * 1.5 ? "Low" : "OK";
  return { ...item, eoqVal, ss, rop, avgInv, annCost, onHand, Z, status };
});

// Inventory type breakdown (APICS 6 types)
const INV_TYPES = [
  { type: "Cycle Stock",       pct: 42, value: 8420000, color: "#1A8A8A",  desc: "Q/2 — driven by EOQ batch size" },
  { type: "Safety Stock",      pct: 28, value: 5600000, color: "#7B5EA7",  desc: "Z×√(LT×σ²_d + D²×σ²_LT)" },
  { type: "Anticipation",      pct: 14, value: 2800000, color: "#C9A84C",  desc: "Pre-build for seasonal peaks" },
  { type: "Pipeline (WIP)",    pct: 10, value: 2000000, color: "#E07B2A",  desc: "In-transit + WIP inventory" },
  { type: "Hedge",             pct:  4, value:  800000, color: "#2EA064",  desc: "Protection vs price/supply risk" },
  { type: "MRO",               pct:  2, value:  400000, color: "#9BA3B2",  desc: "Maintenance, Repair, Operations" },
];

// 12-month inventory trend
const INV_TREND = [
  { m:"Jan", onHand:18200, ss:5400, rop:9200, target:12000 },
  { m:"Feb", onHand:16800, ss:5400, rop:9200, target:12000 },
  { m:"Mar", onHand:14200, ss:5600, rop:9400, target:12000 },
  { m:"Apr", onHand:11900, ss:5800, rop:9600, target:12000 },
  { m:"May", onHand:12400, ss:5800, rop:9600, target:12000 },
  { m:"Jun", onHand:13100, ss:6000, rop:9800, target:12000 },
  { m:"Jul", onHand:15600, ss:6200, rop:10000,target:12000 },
  { m:"Aug", onHand:14200, ss:6000, rop:9800, target:12000 },
  { m:"Sep", onHand:12800, ss:5800, rop:9600, target:12000 },
  { m:"Oct", onHand:11600, ss:5600, rop:9400, target:12000 },
  { m:"Nov", onHand:13200, ss:5600, rop:9400, target:12000 },
  { m:"Dec", onHand:15800, ss:5800, rop:9600, target:12000 },
];

// SCOR financial metrics
const COGS = 186000000;
const AVG_INV_VAL = 20020000;
const turns    = Math.round((inventoryTurns(COGS, AVG_INV_VAL)) * 10) / 10;
const dioVal   = Math.round(dio(AVG_INV_VAL, COGS));

const statusColor = (s: string) =>
  s === "OK" ? "#4CAF50" : s === "Low" ? "#FFA726" : "#EF5350";

export default function InventoryPage() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"eoq" | "types" | "trend" | "scor">("eoq");
  const [slFilter, setSlFilter] = useState<number | "all">("all");

  const filtered = slFilter === "all" ? INV_TABLE : INV_TABLE.filter(r => r.sl === slFilter);

  const totalSS   = INV_TABLE.reduce((s, r) => s + r.ss, 0);
  const totalOnH  = INV_TABLE.reduce((s, r) => s + r.onHand, 0);
  const reorders  = INV_TABLE.filter(r => r.status === "Reorder").length;
  const totalAnnC = INV_TABLE.reduce((s, r) => s + r.annCost, 0);

  const kpis = [
    { label: t("Inventory Turns",    "دوران المخزون",     lang), value: `${turns}×`, sub: "COGS / Avg Inv Value",     color: "#1A8A8A", icon: "🔄" },
    { label: t("DIO",                "أيام المخزون",      lang), value: `${dioVal}d`, sub: "Inventory/COGS×365 (SCOR)", color: "#C9A84C", icon: "📅" },
    { label: t("Total Safety Stock", "إجمالي مخزون الأمان",lang),value: `${(totalSS/1000).toFixed(0)}K`, sub: "units across 6 SKUs",  color: "#7B5EA7", icon: "🛡️" },
    { label: t("Items to Reorder",   "عناصر تحتاج طلب",  lang), value: `${reorders}`, sub: "Below ROP threshold",    color: reorders > 0 ? "#EF5350" : "#4CAF50", icon: "⚠️" },
    { label: t("Ann. Holding Cost",  "تكلفة الاحتجاز",   lang), value: `EGP ${(totalAnnC/1000000).toFixed(2)}M`, sub: "(D/Q)S + (Q/2)iC", color: "#E07B2A", icon: "💰" },
  ];

  const tabs = [
    { id: "eoq",   en: "EOQ & Safety Stock", ar: "كمية الطلب الاقتصادية" },
    { id: "types", en: "Inventory Types",    ar: "أنواع المخزون" },
    { id: "trend", en: "Inventory Trend",    ar: "اتجاه المخزون" },
    { id: "scor",  en: "SCOR Metrics",       ar: "مقاييس SCOR" },
  ] as const;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar lang={lang} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar lang={lang} onLangChange={() => setLang(l => l === "en" ? "ar" : "en")}
          pageTitle="Inventory" pageAr="إدارة المخزون" module="inventory"
          exportData={INV_TABLE.map(d => ({ SKU: d.sku, Name: d.name, EOQ: d.eoqVal, "Safety Stock": d.ss, ROP: d.rop, "On Hand": d.onHand, Status: d.status, "Annual Cost (EGP)": d.annCost }))}
          exportFilename="inventory-eoq"
          alerts={DEFAULT_ALERTS}
          onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── KPI Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
            {kpis.map(k => (
              <div key={k.label} style={{
                background: "var(--bg-card)", borderRadius: 10,
                border: `1px solid ${k.color}22`, padding: "14px 16px",
                borderLeft: `4px solid ${k.color}`,
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "8px 16px", fontSize: 12, fontWeight: 700,
                background: "transparent", cursor: "pointer", border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #C9A84C" : "2px solid transparent",
                color: activeTab === tab.id ? "#C9A84C" : "var(--text-muted)",
                transition: "all 0.2s",
              }}>
                {lang === "ar" ? tab.ar : tab.en}
              </button>
            ))}
          </div>

          {/* ── EOQ & SAFETY STOCK ── */}
          {activeTab === "eoq" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* SL filter */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("Service Level:", "مستوى الخدمة:", lang)}</span>
                {(["all", 90, 95, 98] as const).map(sl => (
                  <button key={sl} onClick={() => setSlFilter(sl)} style={{
                    padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    background: slFilter === sl ? "rgba(201,168,76,0.15)" : "transparent",
                    border: `1px solid ${slFilter === sl ? "#C9A84C" : "rgba(201,168,76,0.2)"}`,
                    color: slFilter === sl ? "#C9A84C" : "var(--text-muted)",
                  }}>{sl === "all" ? "All" : `${sl}%`}</button>
                ))}
              </div>

              {/* Table */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.15)", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 0.8fr", padding: "8px 16px", background: "rgba(201,168,76,0.04)", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
                  {["SKU / Name", "EOQ", "Safety Stock", "ROP", "Avg Inv", "On Hand", "SL %", "Ann. Cost", "Status"].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{h}</div>
                  ))}
                </div>
                {filtered.map((row, i) => (
                  <div key={row.sku} style={{
                    display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 0.8fr",
                    padding: "11px 16px", borderTop: "1px solid rgba(201,168,76,0.06)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{row.name}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "monospace" }}>{row.sku}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#C9A84C" }}>{row.eoqVal.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: "#7B5EA7", fontWeight: 600 }}>{row.ss.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: "#E07B2A" }}>{row.rop.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: "var(--text)" }}>{row.avgInv.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 600 }}>{row.onHand.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: "#1A8A8A" }}>{row.sl}% (Z={row.Z.toFixed(3)})</div>
                    <div style={{ fontSize: 11, color: "var(--text)" }}>{(row.annCost/1000).toFixed(0)}K</div>
                    <div>
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4,
                        background: `${statusColor(row.status)}22`, color: statusColor(row.status),
                      }}>{row.status}</span>
                    </div>
                  </div>
                ))}
                {/* Totals */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 0.8fr",
                  padding: "10px 16px", borderTop: "2px solid rgba(201,168,76,0.2)",
                  background: "rgba(201,168,76,0.04)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#C9A84C" }}>TOTAL</div>
                  <div />
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#7B5EA7" }}>{totalSS.toLocaleString()}</div>
                  <div /><div />
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text)" }}>{totalOnH.toLocaleString()}</div>
                  <div /><div style={{ fontSize: 11, fontWeight: 800, color: "var(--text)" }}>{(totalAnnC/1000).toFixed(0)}K</div>
                  <div />
                </div>
              </div>

              {/* EOQ formula callout */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                  { label: "EOQ (APICS)",      formula: "√(2DS / iC)",                            color: "#C9A84C" },
                  { label: "Safety Stock",     formula: "Z × √(LT×σ²_d + D²×σ²_LT)",             color: "#7B5EA7" },
                  { label: "ROP",              formula: "D̄_daily × LT + SS",                      color: "#E07B2A" },
                  { label: "Avg Inventory",    formula: "Q/2 + SS",                               color: "#1A8A8A" },
                ].map(f => (
                  <div key={f.label} style={{ background: `${f.color}08`, border: `1px solid ${f.color}22`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: f.color, marginBottom: 4 }}>{f.label}</div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>{f.formula}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── INVENTORY TYPES ── */}
          {activeTab === "types" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Pie */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.15)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
                  {t("Inventory Composition (APICS 6 Types)", "تكوين المخزون — ٦ أنواع APICS", lang)}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 16 }}>Total: EGP {(INV_TYPES.reduce((s,t)=>s+t.value,0)/1000000).toFixed(2)}M</div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={INV_TYPES} dataKey="pct" nameKey="type" cx="50%" cy="50%" outerRadius={100} label={(props) => `${(props as unknown as {pct:number}).pct}%`} labelLine={false}>
                      {INV_TYPES.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1C2435", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, fontSize: 11 }}
                      formatter={(val, name) => [`${val}%`, name as string]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {INV_TYPES.map(type => (
                  <div key={type.type} style={{
                    background: "var(--bg-card)", borderRadius: 10,
                    border: `1px solid ${type.color}22`,
                    borderLeft: `4px solid ${type.color}`,
                    padding: "12px 16px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: type.color }}>{type.type}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{type.desc}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{type.pct}%</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>EGP {(type.value/1000000).toFixed(2)}M</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── INVENTORY TREND ── */}
          {activeTab === "trend" && (
            <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.15)", padding: "20px" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
                {t("12-Month Inventory Position", "موقف المخزون — ١٢ شهراً", lang)}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 16 }}>
                {t("On Hand vs Safety Stock vs ROP vs Target (units)", "المخزون الفعلي مقابل مخزون الأمان مقابل ROP مقابل الهدف", lang)}
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={INV_TREND} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                  <XAxis dataKey="m" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#1C2435", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine x="May" stroke="rgba(201,168,76,0.5)" strokeDasharray="4 4" label={{ value: "Today", fill: "#C9A84C", fontSize: 10 }} />
                  <Line type="monotone" dataKey="onHand" name="On Hand"       stroke="#1A8A8A" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="target" name="Target Inv."   stroke="#C9A84C" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                  <Line type="monotone" dataKey="rop"    name="ROP"           stroke="#E07B2A" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="ss"     name="Safety Stock"  stroke="#7B5EA7" strokeWidth={1.5} strokeDasharray="2 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── SCOR METRICS ── */}
          {activeTab === "scor" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {[
                {
                  label: t("Inventory Turns", "دوران المخزون", lang),
                  formula: "COGS / Avg Inventory Value",
                  value: `${turns}×`,
                  calc: `186,000,000 / 20,020,000`,
                  benchmark: "Industry: 8-12×", good: turns >= 8,
                  color: "#1A8A8A",
                },
                {
                  label: t("Days Inventory Outstanding", "أيام المخزون", lang),
                  formula: "Inventory / COGS × 365",
                  value: `${dioVal} days`,
                  calc: `20,020,000 / 186,000,000 × 365`,
                  benchmark: "Target: <35 days", good: dioVal <= 35,
                  color: "#C9A84C",
                },
                {
                  label: t("Fill Rate", "معدل التلبية", lang),
                  formula: "Orders Filled Complete / Total Orders",
                  value: "96.4%",
                  calc: "4,820 / 5,000 orders",
                  benchmark: "APICS target: ≥95%", good: true,
                  color: "#2EA064",
                },
                {
                  label: t("Perfect Order Rate", "معدل الطلب المثالي", lang),
                  formula: "OTD × Quality × Complete × Docs",
                  value: "87.2%",
                  calc: "0.96 × 0.98 × 0.94 × 0.98",
                  benchmark: "SCOR target: ≥90%", good: false,
                  color: "#E07B2A",
                },
                {
                  label: t("Obsolete Stock %", "المخزون المتقادم", lang),
                  formula: "Obsolete / Total Inventory × 100",
                  value: "2.3%",
                  calc: "EGP 460K / EGP 20.02M",
                  benchmark: "Target: <3%", good: true,
                  color: "#7B5EA7",
                },
                {
                  label: t("Carrying Cost Rate", "معدل تكلفة الاحتجاز", lang),
                  formula: "Holding Cost / Avg Inventory × 100",
                  value: "24.8%",
                  calc: "Industry avg: 20-30%",
                  benchmark: "APICS range: 20-30%", good: true,
                  color: "#60B8D4",
                },
              ].map(m => (
                <div key={m.label} style={{
                  background: "var(--bg-card)", borderRadius: 10,
                  border: `1px solid ${m.color}22`, padding: "20px",
                }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontFamily: "monospace" }}>{m.formula}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, fontFamily: "monospace" }}>{m.calc}</div>
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>{m.good ? "✅" : "⚠️"}</span>
                    <span style={{ fontSize: 10, color: m.good ? "#4CAF50" : "#FFA726" }}>{m.benchmark}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
