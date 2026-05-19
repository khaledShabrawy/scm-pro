"use client";
import { useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ReferenceLine, ComposedChart, Area,
} from "recharts";
import { requiredProduction, closingInventory } from "@/lib/apics-algorithms";

// ─── S&OP 5-Step APICS Process ───────────────────────────
// Step 1: Data Gathering → Step 2: Demand Review →
// Step 3: Supply Review → Step 4: Pre-S&OP → Step 5: Executive S&OP

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// S&OP Master Table — APICS format
// Required Production = Forecast + Desired EI - BI + Backlog
const SOP_DATA = [
  { month:"Jan", forecast:28400, supply:27800, salesActual:28100, prodActual:27600, openingInv:12400, closingInv:11900, backlog:300,  desiredEI:12000, gap:-600  },
  { month:"Feb", forecast:31200, supply:30500, salesActual:31000, prodActual:30800, openingInv:11900, closingInv:11700, backlog:200,  desiredEI:12000, gap:-700  },
  { month:"Mar", forecast:35800, supply:36200, salesActual:35600, prodActual:36100, openingInv:11700, closingInv:12200, backlog:0,    desiredEI:12000, gap:400   },
  { month:"Apr", forecast:42100, supply:41800, salesActual:42400, prodActual:41600, openingInv:12200, closingInv:11400, backlog:600,  desiredEI:12000, gap:-300  },
  { month:"May", forecast:38600, supply:39200, salesActual:null,  prodActual:null,  openingInv:11400, closingInv:12000, backlog:0,    desiredEI:12000, gap:600   },
  { month:"Jun", forecast:44200, supply:44200, salesActual:null,  prodActual:null,  openingInv:12000, closingInv:12000, backlog:0,    desiredEI:12000, gap:0     },
  { month:"Jul", forecast:51800, supply:52000, salesActual:null,  prodActual:null,  openingInv:12000, closingInv:12200, backlog:0,    desiredEI:12000, gap:200   },
  { month:"Aug", forecast:48900, supply:48500, salesActual:null,  prodActual:null,  openingInv:12200, closingInv:11800, backlog:400,  desiredEI:12000, gap:-400  },
  { month:"Sep", forecast:43200, supply:43200, salesActual:null,  prodActual:null,  openingInv:11800, closingInv:11800, backlog:0,    desiredEI:12000, gap:0     },
  { month:"Oct", forecast:39800, supply:40000, salesActual:null,  prodActual:null,  openingInv:11800, closingInv:12000, backlog:0,    desiredEI:12000, gap:200   },
  { month:"Nov", forecast:45600, supply:45600, salesActual:null,  prodActual:null,  openingInv:12000, closingInv:12000, backlog:0,    desiredEI:12000, gap:0     },
  { month:"Dec", forecast:52300, supply:52000, salesActual:null,  prodActual:null,  openingInv:12000, closingInv:11700, backlog:300,  desiredEI:12000, gap:-300  },
];

// Compute Required Production for each month using APICS formula
const SOP_COMPUTED = SOP_DATA.map(r => ({
  ...r,
  reqProd: requiredProduction(r.forecast, r.desiredEI, r.openingInv, r.backlog),
  calcClosing: closingInventory(r.openingInv, r.supply, r.forecast),
}));

// Product Family rows for S&OP table
const FAMILIES = [
  { name: "Beverages",  nameAr: "المشروبات",    forecast:[28400,31200,35800,42100,38600,44200], supply:[27800,30500,36200,41800,39200,44200], color: "#E07B2A" },
  { name: "Dairy",      nameAr: "الألبان",       forecast:[12400,13200,14800,16100,15200,17400], supply:[12200,13400,14600,16300,15400,17200], color: "#7B5EA7" },
  { name: "Snacks",     nameAr: "المقرمشات",     forecast:[8200, 8900, 9400, 10200,9800, 11200], supply:[8400, 8800, 9500, 10100,9900, 11000], color: "#1A8A8A" },
  { name: "Pkg Goods",  nameAr: "السلع المعبأة", forecast:[6100, 6500, 7200, 8100, 7600, 8200],  supply:[6000, 6600, 7100, 8200, 7500, 8400],  color: "#2EA064" },
];

// Consensus scenarios
const SCENARIOS = [
  { id: "base",  label: "Base Case",     labelAr: "السيناريو الأساسي",  growth: 8.2,  margin: 18.4, inv: 12000, color: "#C9A84C" },
  { id: "bull",  label: "Bull Case",     labelAr: "السيناريو المتفائل", growth: 12.5, margin: 19.8, inv: 13200, color: "#2EA064" },
  { id: "bear",  label: "Bear Case",     labelAr: "السيناريو المتشائم", growth: 3.8,  margin: 16.2, inv: 10800, color: "#EF5350" },
];

const ACTIONS = [
  { owner: "Demand",  action: "Revise Q3 Beverage forecast upward +6% — Ramadan effect confirmed", due: "May 25", priority: "High",   status: "Open",   color: "#E07B2A" },
  { owner: "Supply",  action: "Increase Line 1+2 capacity by 240 hrs in Jun-Jul peak",             due: "May 28", priority: "High",   status: "Open",   color: "#7B5EA7" },
  { owner: "Finance", action: "Approve incremental budget EGP 840K for Q3 raw materials",         due: "Jun 01", priority: "Medium", status: "Review", color: "#C9A84C" },
  { owner: "Logistics",action:"Pre-position 15% safety stock for Dairy in Alexandria DC",         due: "Jun 05", priority: "Medium", status: "Open",   color: "#1A8A8A" },
  { owner: "Sales",   action: "Align promotional calendar with Supply constraints in Aug",         due: "Jun 10", priority: "Low",    status: "Open",   color: "#2EA064" },
];

const t = (en: string, ar: string, lang: "en" | "ar") => lang === "ar" ? ar : en;

const gapColor = (gap: number) =>
  gap === 0 ? "#4CAF50" : gap > 0 ? "#60B8D4" : "#EF5350";

const priorityColor = (p: string) =>
  p === "High" ? "#EF5350" : p === "Medium" ? "#FFA726" : "#60B8D4";

export default function SopPage() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [activeTab, setActiveTab] = useState<"balance" | "families" | "scenarios" | "actions">("balance");
  const [activeScenario, setActiveScenario] = useState("base");

  const totalForecast  = SOP_DATA.reduce((s, r) => s + r.forecast, 0);
  const totalSupply    = SOP_DATA.reduce((s, r) => s + r.supply, 0);
  const totalGap       = totalSupply - totalForecast;
  const avgInv         = Math.round(SOP_DATA.reduce((s, r) => s + r.closingInv, 0) / 12);
  const pastMonths     = SOP_DATA.filter(r => r.salesActual !== null);
  const fcstAccuracy   = pastMonths.length
    ? Math.round((1 - pastMonths.reduce((s, r) => s + Math.abs((r.salesActual! - r.forecast) / r.forecast), 0) / pastMonths.length) * 100)
    : 0;

  const kpis = [
    { label: t("Annual Forecast", "التنبؤ السنوي", lang),         value: `${(totalForecast/1000).toFixed(0)}K`,  sub: "units",              color: "#1A8A8A", icon: "📊" },
    { label: t("Annual Supply Plan", "خطة الإمداد السنوية", lang), value: `${(totalSupply/1000).toFixed(0)}K`,   sub: "units",              color: "#7B5EA7", icon: "🏭" },
    { label: t("D-S Gap (Annual)", "الفجوة السنوية", lang),        value: `${totalGap > 0 ? "+" : ""}${(totalGap/1000).toFixed(1)}K`, sub: totalGap >= 0 ? "surplus" : "shortfall", color: totalGap >= 0 ? "#4CAF50" : "#EF5350", icon: "⚖️" },
    { label: t("Avg Closing Inv.", "متوسط المخزون الختامي", lang), value: `${(avgInv/1000).toFixed(1)}K`,        sub: "units",              color: "#C9A84C", icon: "📦" },
    { label: t("Forecast Accuracy", "دقة التنبؤ", lang),           value: `${fcstAccuracy}%`,                   sub: "YTD (APICS: 1-MAPE)", color: fcstAccuracy >= 90 ? "#4CAF50" : "#FFA726", icon: "🎯" },
  ];

  const tabs = [
    { id: "balance",   en: "S&OP Balance Table", ar: "جدول التوازن" },
    { id: "families",  en: "Product Families",   ar: "عائلات المنتجات" },
    { id: "scenarios", en: "Scenarios",          ar: "السيناريوهات" },
    { id: "actions",   en: "Action Register",   ar: "سجل الإجراءات" },
  ] as const;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar lang={lang} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar lang={lang} onLangChange={() => setLang(l => l === "en" ? "ar" : "en")}
          pageTitle="S&OP Balance" pageAr="توازن العرض والطلب" module="sop" />
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

          {/* ── S&OP Process Steps ── */}
          <div style={{ display: "flex", gap: 0, background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(26,138,138,0.2)", overflow: "hidden" }}>
            {[
              { n:1, en:"Data Gathering",  ar:"جمع البيانات",    done:true  },
              { n:2, en:"Demand Review",   ar:"مراجعة الطلب",    done:true  },
              { n:3, en:"Supply Review",   ar:"مراجعة الإمداد",  done:true  },
              { n:4, en:"Pre-S&OP",        ar:"ما قبل S&OP",     done:true  },
              { n:5, en:"Executive S&OP",  ar:"S&OP التنفيذي",   done:false },
            ].map((step, i, arr) => (
              <div key={step.n} style={{
                flex: 1, display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px",
                background: step.done ? "rgba(26,138,138,0.1)" : "rgba(201,168,76,0.08)",
                borderRight: i < arr.length - 1 ? "1px solid rgba(26,138,138,0.15)" : "none",
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: step.done ? "#1A8A8A" : "rgba(201,168,76,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800,
                  color: step.done ? "white" : "#C9A84C", flexShrink: 0,
                }}>{step.done ? "✓" : step.n}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: step.done ? "#1A8A8A" : "#C9A84C" }}>
                    {t(step.en, step.ar, lang)}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>Step {step.n}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Tab Navigation ── */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(26,138,138,0.15)" }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "8px 16px", fontSize: 12, fontWeight: 700,
                background: "transparent", cursor: "pointer", border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #1A8A8A" : "2px solid transparent",
                color: activeTab === tab.id ? "#1A8A8A" : "var(--text-muted)",
                transition: "all 0.2s",
              }}>
                {lang === "ar" ? tab.ar : tab.en}
              </button>
            ))}
          </div>

          {/* ── BALANCE TABLE ── */}
          {activeTab === "balance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Chart */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(26,138,138,0.2)", padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                  {t("Demand vs Supply vs Inventory", "الطلب مقابل الإمداد مقابل المخزون", lang)}
                </div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 12 }}>
                  Required Production = Forecast + Desired EI − BI + Backlog  (APICS)
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={SOP_COMPUTED} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,138,138,0.08)" />
                    <XAxis dataKey="month" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "#9BA3B2", fontSize: 10 }} domain={[0, 20000]} />
                    <Tooltip contentStyle={{ background: "#1C2435", border: "1px solid rgba(26,138,138,0.3)", borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine yAxisId="left" x="May" stroke="rgba(201,168,76,0.5)" strokeDasharray="4 4" label={{ value: "Today", fill: "#C9A84C", fontSize: 10 }} />
                    <Bar yAxisId="left" dataKey="forecast" name="Demand Forecast" fill="#1A8A8A" opacity={0.8} radius={[3,3,0,0]} />
                    <Bar yAxisId="left" dataKey="supply"   name="Supply Plan"     fill="#7B5EA7" opacity={0.7} radius={[3,3,0,0]} />
                    <Line yAxisId="right" type="monotone" dataKey="closingInv" name="Closing Inventory" stroke="#C9A84C" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* APICS S&OP Table */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(26,138,138,0.15)", overflow: "hidden" }}>
                <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(26,138,138,0.1)", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                  {t("APICS S&OP Master Table", "جدول S&OP الرئيسي (APICS)", lang)}
                </div>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "90px repeat(12, 1fr)", padding: "8px 12px", background: "rgba(26,138,138,0.06)", borderBottom: "1px solid rgba(26,138,138,0.08)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{t("Row", "البند", lang)}</div>
                  {MONTHS.map(m => <div key={m} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textAlign: "center" }}>{m}</div>)}
                </div>
                {/* Rows */}
                {[
                  { label: t("Forecast", "التنبؤ", lang),        key: "forecast",    color: "#1A8A8A", bold: false },
                  { label: t("Supply Plan", "خطة الإمداد", lang), key: "supply",     color: "#7B5EA7", bold: false },
                  { label: t("Req. Prod.", "الإنتاج المطلوب", lang), key: "reqProd", color: "#E07B2A", bold: true  },
                  { label: t("Opening Inv.", "المخزون الافتتاحي", lang), key: "openingInv", color: "#9BA3B2", bold: false },
                  { label: t("Closing Inv.", "المخزون الختامي", lang),   key: "closingInv",  color: "#C9A84C", bold: false },
                  { label: t("Gap (S-D)", "الفجوة", lang),        key: "gap",        color: "dynamic", bold: true  },
                ].map(row => (
                  <div key={row.key} style={{ display: "grid", gridTemplateColumns: "90px repeat(12, 1fr)", padding: "7px 12px", borderBottom: "1px solid rgba(26,138,138,0.05)" }}>
                    <div style={{ fontSize: 10, fontWeight: row.bold ? 800 : 600, color: row.color === "dynamic" ? "var(--text-muted)" : row.color }}>{row.label}</div>
                    {SOP_COMPUTED.map((r, i) => {
                      const val = r[row.key as keyof typeof r] as number;
                      const c = row.color === "dynamic" ? gapColor(val) : row.color;
                      return (
                        <div key={i} style={{ fontSize: 10, textAlign: "center", fontWeight: row.bold ? 700 : 400, color: c }}>
                          {row.key === "gap" ? (val > 0 ? `+${(val/1000).toFixed(1)}K` : `${(val/1000).toFixed(1)}K`) : `${(val/1000).toFixed(1)}K`}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PRODUCT FAMILIES ── */}
          {activeTab === "families" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {FAMILIES.map(fam => {
                const gaps = fam.forecast.map((f, i) => fam.supply[i] - f);
                return (
                  <div key={fam.name} style={{ background: "var(--bg-card)", borderRadius: 10, border: `1px solid ${fam.color}22`, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: fam.color }}>{lang === "ar" ? fam.nameAr : fam.name}</span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 10 }}>6-Month Rolling Plan</span>
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Total Fcst: <strong style={{ color: "var(--text)" }}>{(fam.forecast.reduce((s,v)=>s+v,0)/1000).toFixed(0)}K</strong></span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Total Supply: <strong style={{ color: "var(--text)" }}>{(fam.supply.reduce((s,v)=>s+v,0)/1000).toFixed(0)}K</strong></span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={130}>
                      <ComposedChart data={["Jan","Feb","Mar","Apr","May","Jun"].map((m,i) => ({
                        m, forecast: fam.forecast[i], supply: fam.supply[i], gap: gaps[i],
                      }))} margin={{ top:0, right:10, bottom:0, left:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
                        <XAxis dataKey="m" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "#1C2435", border: `1px solid ${fam.color}33`, borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey="forecast" name="Forecast" fill={fam.color} opacity={0.7} radius={[2,2,0,0]} />
                        <Bar dataKey="supply"   name="Supply"   fill={fam.color} opacity={0.4} radius={[2,2,0,0]} />
                        <Line dataKey="gap" name="Gap" stroke="#C9A84C" strokeWidth={2} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── SCENARIOS ── */}
          {activeTab === "scenarios" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Selector */}
              <div style={{ display: "flex", gap: 8 }}>
                {SCENARIOS.map(s => (
                  <button key={s.id} onClick={() => setActiveScenario(s.id)} style={{
                    flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer",
                    background: activeScenario === s.id ? `${s.color}18` : "var(--bg-card)",
                    border: `2px solid ${activeScenario === s.id ? s.color : "rgba(201,168,76,0.1)"}`,
                    transition: "all 0.2s",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{lang === "ar" ? s.labelAr : s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", marginTop: 4 }}>{s.growth}%</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{t("YoY Growth", "نمو سنوي", lang)}</div>
                  </button>
                ))}
              </div>

              {/* Scenario detail */}
              {SCENARIOS.filter(s => s.id === activeScenario).map(s => (
                <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: t("Revenue Growth", "نمو الإيرادات", lang),      value: `+${s.growth}%`,  sub: "YoY",           color: s.color },
                    { label: t("Gross Margin",   "هامش الربح",    lang),      value: `${s.margin}%`,   sub: "target",        color: s.color },
                    { label: t("Target Closing Inv.", "المخزون المستهدف", lang), value: `${(s.inv/1000).toFixed(1)}K`, sub: "units", color: s.color },
                  ].map(m => (
                    <div key={m.label} style={{ background: "var(--bg-card)", borderRadius: 10, border: `1px solid ${s.color}22`, padding: "20px", textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{m.value}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.sub}</div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Scenario comparison chart */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.15)", padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
                  {t("Scenario Comparison — Annual Demand", "مقارنة السيناريوهات — الطلب السنوي", lang)}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={MONTHS.map((m, i) => ({
                    m,
                    Base:  Math.round(SOP_DATA[i].forecast),
                    Bull:  Math.round(SOP_DATA[i].forecast * 1.125),
                    Bear:  Math.round(SOP_DATA[i].forecast * 0.938),
                  }))} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" />
                    <XAxis dataKey="m" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1C2435", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Bear" fill="#EF5350" opacity={0.7} radius={[2,2,0,0]} />
                    <Bar dataKey="Base" fill="#C9A84C" opacity={0.8} radius={[2,2,0,0]} />
                    <Bar dataKey="Bull" fill="#4CAF50" opacity={0.7} radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── ACTION REGISTER ── */}
          {activeTab === "actions" && (
            <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(26,138,138,0.15)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(26,138,138,0.1)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
                  {t("S&OP Action Register", "سجل إجراءات S&OP", lang)}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Executive S&OP — May 2026</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 80px 80px 80px", padding: "8px 20px", background: "rgba(26,138,138,0.04)" }}>
                {["Owner", "Action Item", "Due Date", "Priority", "Status"].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{h}</div>
                ))}
              </div>
              {ACTIONS.map((a, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "100px 1fr 80px 80px 80px",
                  padding: "13px 20px", borderTop: "1px solid rgba(26,138,138,0.06)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: a.color }}>{a.owner}</div>
                  <div style={{ fontSize: 11, color: "var(--text)", paddingRight: 16 }}>{a.action}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{a.due}</div>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                      background: `${priorityColor(a.priority)}22`, color: priorityColor(a.priority) }}>
                      {a.priority}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                      background: a.status === "Open" ? "rgba(96,184,212,0.12)" : "rgba(201,168,76,0.15)",
                      color: a.status === "Open" ? "#60B8D4" : "#C9A84C" }}>
                      {a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── APICS Formula Reference ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { label: "Required Production (APICS)", formula: "Forecast + Desired EI − BI + Backlog", color: "#1A8A8A" },
              { label: "Closing Inventory",           formula: "Opening Inv + Production − Sales",     color: "#7B5EA7" },
              { label: "Forecast Accuracy",           formula: "1 − MAPE  =  1 − Σ|A−F|/A / n",       color: "#C9A84C" },
            ].map(f => (
              <div key={f.label} style={{ background: `${f.color}08`, border: `1px solid ${f.color}22`, borderRadius: 8, padding: "10px 12px" }}>
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
