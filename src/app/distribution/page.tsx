"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ComposedChart, Area,
} from "recharts";

// ─── APICS Distribution / SCOR Metrics ───────────────────
// Perfect Order = OTD × Quality × Complete × Documentation
// C2C = DIO + DSO - DPO

const t = (en: string, ar: string, lang: "en" | "ar") => lang === "ar" ? ar : en;

// Distribution Centers
const DCS = [
  { id: "DC-CAI", name: "Cairo DC",      nameAr: "مركز توزيع القاهرة",    region: "Greater Cairo", capacity: 48000, used: 36400, otd: 96.2, orders: 1842, color: "#E07B2A" },
  { id: "DC-ALX", name: "Alexandria DC", nameAr: "مركز توزيع الإسكندرية", region: "North Coast",   capacity: 28000, used: 19600, otd: 94.8, orders: 924,  color: "#2EA064" },
  { id: "DC-ASY", name: "Asyut DC",      nameAr: "مركز توزيع أسيوط",      region: "Upper Egypt",   capacity: 18000, used: 11700, otd: 91.5, orders: 612,  color: "#7B5EA7" },
  { id: "DC-MNS", name: "Mansoura DC",   nameAr: "مركز توزيع المنصورة",   region: "Delta",         capacity: 22000, used: 16500, otd: 93.2, orders: 748,  color: "#1A8A8A" },
];

// Routes with VRP metrics (Clarke-Wright savings algorithm)
const ROUTES = [
  { id:"RT-001", dc:"DC-CAI", stops:12, dist:184, time:"4h 20m", load:94, driver:"Ahmed M.", status:"Delivering", otd:true,  savings:2840 },
  { id:"RT-002", dc:"DC-CAI", stops:8,  dist:126, time:"3h 05m", load:78, driver:"Mohamed K.", status:"Completed", otd:true,  savings:1920 },
  { id:"RT-003", dc:"DC-ALX", stops:15, dist:212, time:"5h 40m", load:88, driver:"Tarek S.",  status:"Delivering", otd:false, savings:3210 },
  { id:"RT-004", dc:"DC-ALX", stops:10, dist:158, time:"3h 55m", load:65, driver:"Karim H.",  status:"Loading",    otd:true,  savings:2180 },
  { id:"RT-005", dc:"DC-MNS", stops:9,  dist:142, time:"3h 30m", load:82, driver:"Hossam F.", status:"Delivering", otd:true,  savings:1860 },
  { id:"RT-006", dc:"DC-ASY", stops:11, dist:198, time:"5h 10m", load:71, driver:"Amr W.",    status:"Planned",    otd:true,  savings:2540 },
];

// Delivery performance trend
const DELIVERY_TREND = [
  { m:"Jan", otd:93.2, perfect:86.4, fill:95.8 },
  { m:"Feb", otd:94.1, perfect:87.2, fill:96.2 },
  { m:"Mar", otd:93.8, perfect:86.8, fill:95.9 },
  { m:"Apr", otd:95.2, perfect:88.1, fill:96.8 },
  { m:"May", otd:94.8, perfect:87.6, fill:96.4 },
  { m:"Jun", otd:95.8, perfect:89.2, fill:97.1 },
];

// VRP Solver results (Clarke-Wright + Simulated Annealing)
const VRP_RESULT = {
  algorithm: "Clarke-Wright + Simulated Annealing",
  totalRoutes: 6,
  totalDistance: 1020,
  totalTime: "25h 40m",
  fleetUtilization: 81,
  costSaving: 18.4,
  prevDistance: 1248,
  iterations: 12400,
  bestSolution: 1020,
};

// SCOR Perfect Order breakdown
const PERFECT_ORDER = [
  { factor: "On-Time Delivery",   value: 94.8, weight: 0.35, color: "#2EA064" },
  { factor: "Complete Orders",    value: 96.4, weight: 0.25, color: "#1A8A8A" },
  { factor: "Damage-Free",        value: 98.2, weight: 0.20, color: "#7B5EA7" },
  { factor: "Correct Invoice",    value: 97.6, weight: 0.20, color: "#C9A84C" },
];

const perfectOrder = Math.round(PERFECT_ORDER.reduce((s, f) => s * (f.value / 100), 1) * 10000) / 100;

// Fleet status
const FLEET = [
  { id:"TRK-001", type:"10-ton",  driver:"Ahmed M.",  status:"On Route",  fuel:68, next:"Cairo North", km:184 },
  { id:"TRK-002", type:"10-ton",  driver:"Mohamed K.",status:"At DC",     fuel:92, next:"—",           km:0   },
  { id:"TRK-003", type:"7-ton",   driver:"Tarek S.",  status:"On Route",  fuel:41, next:"Alex West",   km:212 },
  { id:"TRK-004", type:"7-ton",   driver:"Karim H.",  status:"Loading",   fuel:85, next:"Alex East",   km:158 },
  { id:"TRK-005", type:"5-ton",   driver:"Hossam F.", status:"On Route",  fuel:59, next:"Mansoura",    km:142 },
  { id:"TRK-006", type:"5-ton",   driver:"Amr W.",    status:"Scheduled", fuel:100,next:"Asyut",       km:198 },
];

const statusColor = (s: string) =>
  s === "On Route" ? "#2EA064" : s === "At DC" ? "#60B8D4" : s === "Loading" ? "#FFA726" : "#9BA3B2";

const fuelColor = (f: number) => f > 60 ? "#4CAF50" : f > 30 ? "#FFA726" : "#EF5350";

export default function DistributionPage() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [activeTab, setActiveTab] = useState<"overview" | "routes" | "vrp" | "fleet">("overview");

  const totalCap  = DCS.reduce((s, dc) => s + dc.capacity, 0);
  const totalUsed = DCS.reduce((s, dc) => s + dc.used, 0);
  const avgOTD    = Math.round(DCS.reduce((s, dc) => s + dc.otd, 0) / DCS.length * 10) / 10;
  const totalOrders = DCS.reduce((s, dc) => s + dc.orders, 0);

  const kpis = [
    { label: t("Perfect Order Rate", "معدل الطلب المثالي", lang), value: `${perfectOrder}%`, sub: "OTD×Complete×Damage-Free×Invoice (SCOR)", color: perfectOrder >= 90 ? "#2EA064" : "#FFA726", icon: "🎯" },
    { label: t("Avg OTD",           "متوسط التسليم في الموعد", lang), value: `${avgOTD}%`,  sub: "On-Time Delivery Rate",                   color: "#1A8A8A",  icon: "🚛" },
    { label: t("DC Utilization",    "استغلال مراكز التوزيع",   lang), value: `${Math.round(totalUsed/totalCap*100)}%`, sub: `${(totalUsed/1000).toFixed(0)}K / ${(totalCap/1000).toFixed(0)}K units`, color: "#C9A84C", icon: "🏢" },
    { label: t("Active Orders",     "الطلبات النشطة",           lang), value: totalOrders.toLocaleString(), sub: "across 4 DCs",                           color: "#7B5EA7",  icon: "📋" },
    { label: t("VRP Cost Saving",   "توفير تكاليف التوزيع",    lang), value: `${VRP_RESULT.costSaving}%`,  sub: `${VRP_RESULT.prevDistance - VRP_RESULT.totalDistance} km saved`, color: "#E07B2A", icon: "💡" },
  ];

  const tabs = [
    { id: "overview", en: "DC Overview",  ar: "نظرة عامة" },
    { id: "routes",   en: "Routes",       ar: "المسارات" },
    { id: "vrp",      en: "VRP Solver",   ar: "محسّن المسارات" },
    { id: "fleet",    en: "Fleet",        ar: "الأسطول" },
  ] as const;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar lang={lang} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar lang={lang} onLangChange={() => setLang(l => l === "en" ? "ar" : "en")}
          pageTitle="Distribution" pageAr="التوزيع" module="distribution" />
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

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(46,160,100,0.15)" }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "8px 16px", fontSize: 12, fontWeight: 700, background: "transparent", cursor: "pointer", border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #2EA064" : "2px solid transparent",
                color: activeTab === tab.id ? "#2EA064" : "var(--text-muted)", transition: "all 0.2s",
              }}>{lang === "ar" ? tab.ar : tab.en}</button>
            ))}
          </div>

          {/* ── DC OVERVIEW ── */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {DCS.map(dc => (
                  <div key={dc.id} style={{ background: "var(--bg-card)", borderRadius: 10, border: `1px solid ${dc.color}22`, padding: "16px", borderTop: `3px solid ${dc.color}` }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: dc.color }}>{lang === "ar" ? dc.nameAr : dc.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12 }}>{dc.region}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Capacity Used</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{Math.round(dc.used/dc.capacity*100)}%</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round(dc.used/dc.capacity*100)}%`, background: dc.color, borderRadius: 3 }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>OTD</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: dc.otd >= 95 ? "#4CAF50" : dc.otd >= 92 ? "#FFA726" : "#EF5350" }}>{dc.otd}%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Orders</span>
                        <span style={{ fontSize: 11, color: "var(--text)" }}>{dc.orders.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Perfect Order breakdown */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(46,160,100,0.2)", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
                      {t("SCOR Perfect Order Rate", "معدل الطلب المثالي (SCOR)", lang)}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      Perfect Order = OTD% × Complete% × Damage-Free% × Correct Invoice%
                    </div>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: perfectOrder >= 90 ? "#2EA064" : "#FFA726" }}>{perfectOrder}%</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                  {PERFECT_ORDER.map(f => (
                    <div key={f.factor} style={{ background: `${f.color}08`, borderRadius: 8, padding: "12px", border: `1px solid ${f.color}22` }}>
                      <div style={{ fontSize: 10, color: f.color, fontWeight: 700, marginBottom: 8 }}>{f.factor}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)" }}>{f.value}%</div>
                      <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginTop: 8 }}>
                        <div style={{ height: "100%", width: `${f.value}%`, background: f.color, borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trend chart */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(46,160,100,0.15)", padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
                  {t("6-Month Delivery Performance", "أداء التسليم — ٦ أشهر", lang)}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={DELIVERY_TREND} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(46,160,100,0.08)" />
                    <XAxis dataKey="m" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                    <YAxis domain={[85, 100]} tick={{ fill: "#9BA3B2", fontSize: 10 }} unit="%" />
                    <Tooltip contentStyle={{ background: "#1C2435", border: "1px solid rgba(46,160,100,0.3)", borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="otd"     name="OTD %"          stroke="#2EA064" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="perfect" name="Perfect Order %" stroke="#C9A84C" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="fill"    name="Fill Rate %"     stroke="#60B8D4" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── ROUTES ── */}
          {activeTab === "routes" && (
            <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(46,160,100,0.15)", overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(46,160,100,0.1)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{t("Active Route Plan", "خطة المسارات النشطة", lang)}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>VRP-optimized — Clarke-Wright Savings</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr", padding: "8px 20px", background: "rgba(46,160,100,0.04)" }}>
                {["Route ID","DC","Stops","Distance","Time","Load %","Driver","Status"].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{h}</div>
                ))}
              </div>
              {ROUTES.map((r, i) => (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr", padding: "12px 20px", borderTop: "1px solid rgba(46,160,100,0.06)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#C9A84C", fontFamily: "monospace" }}>{r.id}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.dc}</div>
                  <div style={{ fontSize: 11, color: "var(--text)" }}>{r.stops}</div>
                  <div style={{ fontSize: 11, color: "var(--text)" }}>{r.dist} km</div>
                  <div style={{ fontSize: 11, color: "var(--text)" }}>{r.time}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: r.load > 85 ? "#FFA726" : "#4CAF50" }}>{r.load}%</div>
                  <div style={{ fontSize: 11, color: "var(--text)" }}>{r.driver}</div>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                      background: r.status === "Delivering" ? "rgba(46,160,100,0.15)" : r.status === "Completed" ? "rgba(96,184,212,0.12)" : r.status === "Loading" ? "rgba(255,167,38,0.15)" : "rgba(155,163,178,0.12)",
                      color: r.status === "Delivering" ? "#4CAF50" : r.status === "Completed" ? "#60B8D4" : r.status === "Loading" ? "#FFA726" : "#9BA3B2",
                    }}>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── VRP SOLVER ── */}
          {activeTab === "vrp" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(46,160,100,0.25)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#2EA064", marginBottom: 16 }}>
                  {t("VRP Optimization Result", "نتيجة تحسين المسارات", lang)}
                </div>
                <div style={{ background: "rgba(46,160,100,0.06)", borderRadius: 8, padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: "#4CAF50", marginBottom: 16, lineHeight: 2 }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 10, marginBottom: 4 }}>ALGORITHM</div>
                  {VRP_RESULT.algorithm}
                  <div style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 8, marginBottom: 4 }}>OBJECTIVE</div>
                  MIN Σ distance(route_i){"\n"}
                  s.t. capacity(truck) ≤ 10 ton{"\n"}
                       time_window(customer) satisfied{"\n"}
                       each customer visited exactly once
                </div>
                {[
                  { label: "Optimal Distance",   value: `${VRP_RESULT.totalDistance} km`,  prev: `was ${VRP_RESULT.prevDistance} km` },
                  { label: "Total Routes",        value: `${VRP_RESULT.totalRoutes}`,        prev: "Clarke-Wright" },
                  { label: "Fleet Utilization",  value: `${VRP_RESULT.fleetUtilization}%`,  prev: "avg load factor" },
                  { label: "Cost Saving",         value: `${VRP_RESULT.costSaving}%`,        prev: `vs manual routing` },
                  { label: "SA Iterations",       value: VRP_RESULT.iterations.toLocaleString(), prev: "convergence" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(46,160,100,0.08)" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{row.label}</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#2EA064" }}>{row.value}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{row.prev}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.2)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#C9A84C", marginBottom: 12 }}>
                  {t("Route Load Distribution", "توزيع حمولة المسارات", lang)}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ROUTES.map(r => ({ id: r.id, load: r.load, dist: r.dist, stops: r.stops }))} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                    <XAxis dataKey="id" tick={{ fill: "#9BA3B2", fontSize: 9 }} />
                    <YAxis tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1C2435", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="load" name="Load %" fill="#2EA064" radius={[3,3,0,0]} />
                    <Bar dataKey="stops" name="Stops" fill="#C9A84C" opacity={0.7} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 16, padding: "10px 12px", background: "rgba(46,160,100,0.06)", borderRadius: 8, fontSize: 10, color: "var(--text-muted)", lineHeight: 1.8 }}>
                  <strong style={{ color: "#2EA064" }}>Algorithms:</strong> Clarke-Wright Savings (initial), Simulated Annealing (refinement), OR-Tools (validation)
                </div>
              </div>
            </div>
          )}

          {/* ── FLEET ── */}
          {activeTab === "fleet" && (
            <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(46,160,100,0.15)", overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(46,160,100,0.1)" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{t("Fleet Status", "حالة الأسطول", lang)}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr 1fr 1fr 1fr 1fr", padding: "8px 20px", background: "rgba(46,160,100,0.04)" }}>
                {["Truck ID","Type","Driver","Status","Fuel %","Next Stop","Route km"].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{h}</div>
                ))}
              </div>
              {FLEET.map((f, i) => (
                <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr 1fr 1fr 1fr 1fr", padding: "13px 20px", borderTop: "1px solid rgba(46,160,100,0.06)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#C9A84C", fontFamily: "monospace" }}>{f.id}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.type}</div>
                  <div style={{ fontSize: 11, color: "var(--text)" }}>{f.driver}</div>
                  <div><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${statusColor(f.status)}22`, color: statusColor(f.status) }}>{f.status}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${f.fuel}%`, background: fuelColor(f.fuel), borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 10, color: fuelColor(f.fuel), fontWeight: 700, minWidth: 28 }}>{f.fuel}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.next}</div>
                  <div style={{ fontSize: 11, color: "var(--text)" }}>{f.km > 0 ? `${f.km} km` : "—"}</div>
                </div>
              ))}
            </div>
          )}

          {/* Formula bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { label: "Perfect Order (SCOR)", formula: "OTD% × Complete% × Damage-Free% × Invoice%", color: "#2EA064" },
              { label: "VRP Objective",        formula: "MIN Σ dist(i,j)·x(i,j)  s.t. capacity + TW", color: "#C9A84C" },
              { label: "C2C Cycle (SCOR)",     formula: "DIO + DSO − DPO",                             color: "#1A8A8A" },
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
