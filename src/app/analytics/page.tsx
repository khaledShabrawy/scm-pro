"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ComposedChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ScatterChart, Scatter,
} from "recharts";
import { cashToCash, inventoryTurns, dio, dso, dpo } from "@/lib/apics-algorithms";
import { DEFAULT_ALERTS } from "@/lib/notifications";

// ─── Analytics — 5D OLAP Cube + SCOR Financial Metrics ───
// Dimensions: Time × Product × Geography × Customer × Sales Force

const t = (en: string, ar: string, lang: "en" | "ar") => lang === "ar" ? ar : en;

// SCOR Financial
const COGS = 186000000, AVG_INV = 20020000, RECV = 28400000, REV = 248000000, PAY = 31200000;
const dioV = Math.round(dio(AVG_INV, COGS));
const dsoV = Math.round(dso(RECV, REV));
const dpoV = Math.round(dpo(PAY, COGS));
const c2cV = cashToCash(dioV, dsoV, dpoV);
const turnsV = Math.round(inventoryTurns(COGS, AVG_INV) * 10) / 10;

// Time dimension — monthly revenue + COGS + GP
const TIME_DATA = [
  { m:"Jan", revenue:18200000, cogs:14600000, gp:3600000, forecast:18000000 },
  { m:"Feb", revenue:19800000, cogs:15800000, gp:4000000, forecast:19500000 },
  { m:"Mar", revenue:22400000, cogs:17900000, gp:4500000, forecast:22000000 },
  { m:"Apr", revenue:26100000, cogs:20800000, gp:5300000, forecast:25800000 },
  { m:"May", revenue:23800000, cogs:19000000, gp:4800000, forecast:24200000 },
  { m:"Jun", revenue:27400000, cogs:21900000, gp:5500000, forecast:27000000 },
  { m:"Jul", revenue:32100000, cogs:25600000, gp:6500000, forecast:31500000 },
  { m:"Aug", revenue:30200000, cogs:24100000, gp:6100000, forecast:30000000 },
  { m:"Sep", revenue:26800000, cogs:21400000, gp:5400000, forecast:27000000 },
  { m:"Oct", revenue:24600000, cogs:19700000, gp:4900000, forecast:24000000 },
  { m:"Nov", revenue:28300000, cogs:22600000, gp:5700000, forecast:28500000 },
  { m:"Dec", revenue:32400000, cogs:25900000, gp:6500000, forecast:32000000 },
];

// Product dimension
const PRODUCT_DATA = [
  { cat:"Beverages", revenue:98400000, units:480000, margin:19.8, growth:12.4, color:"#E07B2A" },
  { cat:"Dairy",     revenue:62400000, units:240000, margin:17.2, growth:8.6,  color:"#7B5EA7" },
  { cat:"Snacks",    revenue:48200000, units:300000, margin:21.4, growth:15.2, color:"#1A8A8A" },
  { cat:"Pkg Goods", revenue:39000000, units:120000, margin:15.8, growth:5.4,  color:"#2EA064" },
];

// Geography dimension
const GEO_DATA = [
  { region:"Greater Cairo",  revenue:112000000, share:45.2, growth:11.2, stores:4820, color:"#C9A84C" },
  { region:"Alexandria",     revenue:54400000,  share:21.9, growth:9.8,  stores:2140, color:"#E07B2A" },
  { region:"Upper Egypt",    revenue:38600000,  share:15.6, growth:14.2, stores:1860, color:"#7B5EA7" },
  { region:"Delta",          revenue:43000000,  share:17.3, growth:7.6,  stores:2280, color:"#2EA064" },
];

// SCOR KPI Radar — benchmark vs actual
const SCOR_RADAR = [
  { metric:"OTD %",           actual:94.8, benchmark:95 },
  { metric:"Fill Rate",       actual:96.4, benchmark:97 },
  { metric:"Perfect Order",   actual:87.2, benchmark:90 },
  { metric:"Inv. Turns",      actual:Math.round(turnsV*10)/10, benchmark:10 },
  { metric:"C2C (inv)",       actual:Math.round((1-(c2cV/60))*100), benchmark:80 },
  { metric:"Forecast Acc.",   actual:90.2, benchmark:92 },
];

// ABC-XYZ revenue matrix for scatter
const ABC_SCATTER = [
  { cv:0.18, value:28.4, cls:"AX", color:"#2EA064" },
  { cv:0.72, value:18.2, cls:"AY", color:"#2EA064" },
  { cv:1.42, value:15.8, cls:"AZ", color:"#FFA726" },
  { cv:0.25, value:6.1,  cls:"BX", color:"#60B8D4" },
  { cv:0.68, value:5.8,  cls:"BY", color:"#60B8D4" },
  { cv:1.21, value:2.1,  cls:"BZ", color:"#FFA726" },
  { cv:0.31, value:0.8,  cls:"CX", color:"#9BA3B2" },
  { cv:0.85, value:0.4,  cls:"CY", color:"#9BA3B2" },
  { cv:1.68, value:0.2,  cls:"CZ", color:"#EF5350" },
];

export default function AnalyticsPage() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeDim, setActiveDim] = useState<"time" | "product" | "geo" | "scor">("time");

  const totalRev = TIME_DATA.reduce((s, r) => s + r.revenue, 0);
  const totalGP  = TIME_DATA.reduce((s, r) => s + r.gp, 0);
  const gpPct    = Math.round(totalGP / totalRev * 1000) / 10;

  const kpis = [
    { label: t("Annual Revenue",  "الإيرادات السنوية",   lang), value: `EGP ${(totalRev/1000000).toFixed(0)}M`, sub: "FY 2026",             color: "#60B8D4", icon: "💵" },
    { label: t("Gross Margin",    "هامش الربح الإجمالي", lang), value: `${gpPct}%`,                             sub: "GP / Revenue",        color: "#2EA064", icon: "📈" },
    { label: t("C2C Cycle",       "دورة النقدية",         lang), value: `${c2cV} days`,                         sub: `DIO${dioV}+DSO${dsoV}-DPO${dpoV}`, color: c2cV <= 40 ? "#2EA064" : "#FFA726", icon: "🔄" },
    { label: t("Inv. Turns",      "دوران المخزون",        lang), value: `${turnsV}×`,                           sub: "COGS / Avg Inv Value", color: "#C9A84C", icon: "📦" },
    { label: t("SCOR Score",      "نقاط SCOR",            lang), value: "82/100",                               sub: "vs benchmark 88/100",  color: "#7B5EA7", icon: "🏆" },
  ];

  const dims = [
    { id: "time",    en: "Time Dimension",    ar: "البعد الزمني" },
    { id: "product", en: "Product Dimension", ar: "بعد المنتج" },
    { id: "geo",     en: "Geography",         ar: "الجغرافيا" },
    { id: "scor",    en: "SCOR Metrics",      ar: "مقاييس SCOR" },
  ] as const;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar lang={lang} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar lang={lang} onLangChange={() => setLang(l => l === "en" ? "ar" : "en")}
          pageTitle="Analytics" pageAr="التحليلات" module="analytics"
          exportData={TIME_DATA.map(d => ({ Month: d.m, "Revenue (EGP)": d.revenue, "COGS (EGP)": d.cogs, "Gross Profit (EGP)": d.gp, "Forecast (EGP)": d.forecast }))}
          exportFilename="analytics-financial"
          alerts={DEFAULT_ALERTS}
          onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
            {kpis.map(k => (
              <div key={k.label} style={{ background: "var(--bg-card)", borderRadius: 10, border: `1px solid ${k.color}22`, padding: "14px 16px", borderLeft: `4px solid ${k.color}` }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* OLAP Cube label */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "rgba(96,184,212,0.06)", borderRadius: 8, border: "1px solid rgba(96,184,212,0.15)" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#60B8D4" }}>5D OLAP CUBE</span>
            {["Time", "Product", "Geography", "Customer", "Sales Force"].map((d, i) => (
              <span key={d} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(96,184,212,0.1)", color: "#60B8D4", border: "1px solid rgba(96,184,212,0.2)" }}>{d}</span>
            ))}
          </div>

          {/* Dimension Tabs */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(96,184,212,0.15)" }}>
            {dims.map(d => (
              <button key={d.id} onClick={() => setActiveDim(d.id)} style={{
                padding: "8px 16px", fontSize: 12, fontWeight: 700, background: "transparent", cursor: "pointer", border: "none",
                borderBottom: activeDim === d.id ? "2px solid #60B8D4" : "2px solid transparent",
                color: activeDim === d.id ? "#60B8D4" : "var(--text-muted)", transition: "all 0.2s",
              }}>{lang === "ar" ? d.ar : d.en}</button>
            ))}
          </div>

          {/* ── TIME DIMENSION ── */}
          {activeDim === "time" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(96,184,212,0.2)", padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                  {t("Monthly Revenue vs COGS vs Gross Profit", "الإيرادات الشهرية مقابل تكلفة المبيعات مقابل الربح الإجمالي", lang)}
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={TIME_DATA.map(r => ({ ...r, revenue: Math.round(r.revenue/1000), cogs: Math.round(r.cogs/1000), gp: Math.round(r.gp/1000), forecast: Math.round(r.forecast/1000) }))} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(96,184,212,0.08)" />
                    <XAxis dataKey="m" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#9BA3B2", fontSize: 10 }} unit="K" />
                    <Tooltip contentStyle={{ background: "#1C2435", border: "1px solid rgba(96,184,212,0.3)", borderRadius: 8, fontSize: 11 }} formatter={(v) => [`EGP ${Number(v).toLocaleString()}K`]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="cogs"    name="COGS"         fill="#EF5350" opacity={0.6} radius={[2,2,0,0]} />
                    <Bar dataKey="gp"      name="Gross Profit" fill="#2EA064" opacity={0.8} radius={[2,2,0,0]} />
                    <Line type="monotone" dataKey="revenue"  name="Revenue"  stroke="#60B8D4" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#C9A84C" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* C2C breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                  { label:"DIO", formula:"Inv / COGS × 365", value:`${dioV} days`, color:"#C9A84C", note:"Days Inventory Outstanding" },
                  { label:"DSO", formula:"Recv / Rev × 365", value:`${dsoV} days`, color:"#60B8D4", note:"Days Sales Outstanding" },
                  { label:"DPO", formula:"Pay / COGS × 365", value:`${dpoV} days`, color:"#7B5EA7", note:"Days Payables Outstanding" },
                  { label:"C2C", formula:"DIO + DSO − DPO",  value:`${c2cV} days`, color: c2cV <= 40 ? "#2EA064" : "#FFA726", note:"Cash-to-Cash Cycle (SCOR)" },
                ].map(m => (
                  <div key={m.label} style={{ background: "var(--bg-card)", borderRadius: 10, border: `1px solid ${m.color}22`, padding: "16px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)", marginBottom: 6 }}>{m.formula}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{m.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PRODUCT DIMENSION ── */}
          {activeDim === "product" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {PRODUCT_DATA.map(p => (
                  <div key={p.cat} style={{ background: "var(--bg-card)", borderRadius: 10, border: `1px solid ${p.color}22`, padding: "16px", borderTop: `3px solid ${p.color}` }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: p.color }}>{p.cat}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", marginTop: 8 }}>EGP {(p.revenue/1000000).toFixed(1)}M</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                      <div><div style={{ fontSize: 9, color: "var(--text-muted)" }}>Margin</div><div style={{ fontSize: 14, fontWeight: 700, color: "#2EA064" }}>{p.margin}%</div></div>
                      <div><div style={{ fontSize: 9, color: "var(--text-muted)" }}>Growth</div><div style={{ fontSize: 14, fontWeight: 700, color: "#60B8D4" }}>+{p.growth}%</div></div>
                      <div><div style={{ fontSize: 9, color: "var(--text-muted)" }}>Units</div><div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{(p.units/1000).toFixed(0)}K</div></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ABC-XYZ Scatter */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.15)", padding: "20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                  {t("ABC-XYZ Portfolio Map", "خريطة محفظة ABC-XYZ", lang)}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12 }}>
                  X-axis: CV (σ/μ) — demand variability &nbsp;|&nbsp; Y-axis: Revenue value (EGP M) &nbsp;|&nbsp; CV: X&lt;0.5, Y 0.5-1.0, Z&gt;1.0
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <ScatterChart margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                    <XAxis dataKey="cv" name="CV" type="number" domain={[0, 2]} tick={{ fill: "#9BA3B2", fontSize: 10 }} label={{ value: "Coefficient of Variation (CV)", position: "insideBottom", fill: "#9BA3B2", fontSize: 9, offset: -2 }} />
                    <YAxis dataKey="value" name="Revenue (M)" type="number" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "#1C2435", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, fontSize: 11 }}
                      formatter={(val, name) => [name === "cv" ? `CV: ${val}` : `EGP ${val}M`, name]} />
                    {["#2EA064","#FFA726","#EF5350","#60B8D4","#9BA3B2"].map((c, i) => (
                      <Scatter key={i} data={ABC_SCATTER.filter(d => d.color === c)} fill={c} name={c} />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── GEOGRAPHY DIMENSION ── */}
          {activeDim === "geo" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {GEO_DATA.map(g => (
                  <div key={g.region} style={{ background: "var(--bg-card)", borderRadius: 10, border: `1px solid ${g.color}22`, padding: "16px", borderLeft: `4px solid ${g.color}` }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: g.color }}>{g.region}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginTop: 6 }}>EGP {(g.revenue/1000000).toFixed(1)}M</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                      <div><div style={{ fontSize: 9, color: "var(--text-muted)" }}>Share</div><div style={{ fontSize: 13, fontWeight: 700, color: g.color }}>{g.share}%</div></div>
                      <div><div style={{ fontSize: 9, color: "var(--text-muted)" }}>Growth</div><div style={{ fontSize: 13, fontWeight: 700, color: "#2EA064" }}>+{g.growth}%</div></div>
                      <div><div style={{ fontSize: 9, color: "var(--text-muted)" }}>Stores</div><div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{g.stores.toLocaleString()}</div></div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.15)", padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
                  {t("Revenue by Region", "الإيرادات حسب المنطقة", lang)}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={GEO_DATA.map(g => ({ region: g.region.split(" ")[0], revenue: Math.round(g.revenue/1000000), growth: g.growth }))} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                    <XAxis dataKey="region" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#9BA3B2", fontSize: 10 }} unit="M" />
                    <Tooltip contentStyle={{ background: "#1C2435", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, fontSize: 11 }} formatter={(v) => [`EGP ${v}M`]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" name="Revenue (EGP M)" fill="#C9A84C" radius={[4,4,0,0]} />
                    <Bar dataKey="growth"  name="Growth %" fill="#2EA064" opacity={0.7} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── SCOR METRICS ── */}
          {activeDim === "scor" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(96,184,212,0.2)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#60B8D4", marginBottom: 4 }}>
                  {t("SCOR Balanced Scorecard", "بطاقة SCOR المتوازنة", lang)}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12 }}>Actual vs Benchmark (Supply Chain Council)</div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={SCOR_RADAR}>
                    <PolarGrid stroke="rgba(96,184,212,0.12)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                    <Radar name="Actual"    dataKey="actual"    stroke="#60B8D4" fill="#60B8D4" fillOpacity={0.15} strokeWidth={2} />
                    <Radar name="Benchmark" dataKey="benchmark" stroke="#C9A84C" fill="#C9A84C" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 4" />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#1C2435", border: "1px solid rgba(96,184,212,0.2)", borderRadius: 8, fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label:"Revenue",          value:`EGP ${(totalRev/1000000).toFixed(0)}M`,  target:"EGP 260M",  pct:Math.round(totalRev/2600000)/10, color:"#60B8D4" },
                  { label:"Gross Margin",      value:`${gpPct}%`,                              target:"20%",       pct:gpPct/20*100, color:"#2EA064" },
                  { label:"Inv. Turns",        value:`${turnsV}×`,                             target:"10×",       pct:turnsV/10*100, color:"#C9A84C" },
                  { label:"C2C Cycle",         value:`${c2cV}d`,                               target:"<35d",      pct:Math.max(0,100-(c2cV-35)*5), color: c2cV <= 35 ? "#2EA064" : "#FFA726" },
                  { label:"Perfect Order",     value:"87.2%",                                  target:"90%",       pct:87.2/90*100, color:"#7B5EA7" },
                  { label:"Forecast Accuracy", value:"90.2%",                                  target:"92%",       pct:90.2/92*100, color:"#E07B2A" },
                ].map(m => (
                  <div key={m.label} style={{ background: "var(--bg-card)", borderRadius: 8, border: `1px solid ${m.color}18`, padding: "12px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{m.label}</span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: m.color }}>{m.value}</span>
                        <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 6 }}>/ {m.target}</span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${Math.min(100, m.pct)}%`, background: m.color, borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
