"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ComposedChart, Area,
} from "recharts";
import { DEFAULT_ALERTS } from "@/lib/notifications";

// ─── APICS Distribution / SCOR + Vonoy VRP + Ad Hoc Market Intelligence ───────
// Perfect Order = OTD × Quality × Complete × Documentation
// C2C = DIO + DSO - DPO
// Vonoy VRP: Clarke-Wright + Simulated Annealing (31% cost reduction)
// Ad Hoc: Egypt Census 370K Retail + 292K Horeca stores

const t = (en: string, ar: string, lang: "en" | "ar") => lang === "ar" ? ar : en;

// ── Distribution Centers ──────────────────────────────────────────────────────
const DCS = [
  { id: "DC-CAI", name: "Cairo DC",      nameAr: "مركز توزيع القاهرة",    region: "Greater Cairo", capacity: 48000, used: 36400, otd: 96.2, orders: 1842, color: "#E07B2A" },
  { id: "DC-ALX", name: "Alexandria DC", nameAr: "مركز توزيع الإسكندرية", region: "North Coast",   capacity: 28000, used: 19600, otd: 94.8, orders: 924,  color: "#2EA064" },
  { id: "DC-ASY", name: "Asyut DC",      nameAr: "مركز توزيع أسيوط",      region: "Upper Egypt",   capacity: 18000, used: 11700, otd: 91.5, orders: 612,  color: "#7B5EA7" },
  { id: "DC-MNS", name: "Mansoura DC",   nameAr: "مركز توزيع المنصورة",   region: "Delta",         capacity: 22000, used: 16500, otd: 93.2, orders: 748,  color: "#1A8A8A" },
];

// ── Routes ────────────────────────────────────────────────────────────────────
const ROUTES = [
  { id:"RT-001", dc:"DC-CAI", stops:12, dist:184, time:"4h 20m", load:94, driver:"Ahmed M.",   status:"Delivering", otd:true,  savings:2840, module:"Van" },
  { id:"RT-002", dc:"DC-CAI", stops:8,  dist:126, time:"3h 05m", load:78, driver:"Mohamed K.", status:"Completed",  otd:true,  savings:1920, module:"Via" },
  { id:"RT-003", dc:"DC-ALX", stops:15, dist:212, time:"5h 40m", load:88, driver:"Tarek S.",   status:"Delivering", otd:false, savings:3210, module:"Van" },
  { id:"RT-004", dc:"DC-ALX", stops:10, dist:158, time:"3h 55m", load:65, driver:"Karim H.",   status:"Loading",    otd:true,  savings:2180, module:"Via" },
  { id:"RT-005", dc:"DC-MNS", stops:9,  dist:142, time:"3h 30m", load:82, driver:"Hossam F.",  status:"Delivering", otd:true,  savings:1860, module:"Van" },
  { id:"RT-006", dc:"DC-ASY", stops:11, dist:198, time:"5h 10m", load:71, driver:"Amr W.",     status:"Planned",    otd:true,  savings:2540, module:"Via" },
];

// ── Delivery performance trend ────────────────────────────────────────────────
const DELIVERY_TREND = [
  { m:"Jan", otd:93.2, perfect:86.4, fill:95.8 },
  { m:"Feb", otd:94.1, perfect:87.2, fill:96.2 },
  { m:"Mar", otd:93.8, perfect:86.8, fill:95.9 },
  { m:"Apr", otd:95.2, perfect:88.1, fill:96.8 },
  { m:"May", otd:94.8, perfect:87.6, fill:96.4 },
  { m:"Jun", otd:95.8, perfect:89.2, fill:97.1 },
];

// ── VRP Solver results ────────────────────────────────────────────────────────
const VRP_RESULT = {
  algorithm: "Clarke-Wright + Simulated Annealing",
  totalRoutes: 6, totalDistance: 1020, totalTime: "25h 40m",
  fleetUtilization: 81, costSaving: 18.4, prevDistance: 1248,
  iterations: 12400, bestSolution: 1020,
};

// ── Vonoy AI Self-Learning Metrics ────────────────────────────────────────────
const VONOY_METRICS = [
  { week: "W1", planned: 28, actual: 35, delta: 7, accuracy: 80 },
  { week: "W2", planned: 30, actual: 34, delta: 4, accuracy: 88 },
  { week: "W3", planned: 31, actual: 33, delta: 2, accuracy: 94 },
  { week: "W4", planned: 32, actual: 33, delta: 1, accuracy: 97 },
  { week: "W5", planned: 32, actual: 32, delta: 0, accuracy: 100 },
  { week: "W6", planned: 32, actual: 32, delta: 0, accuracy: 100 },
];

// ── SCOR Perfect Order breakdown ──────────────────────────────────────────────
const PERFECT_ORDER = [
  { factor: "On-Time Delivery",  value: 94.8, weight: 0.35, color: "#2EA064" },
  { factor: "Complete Orders",   value: 96.4, weight: 0.25, color: "#1A8A8A" },
  { factor: "Damage-Free",       value: 98.2, weight: 0.20, color: "#7B5EA7" },
  { factor: "Correct Invoice",   value: 97.6, weight: 0.20, color: "#C9A84C" },
];
const perfectOrder = Math.round(PERFECT_ORDER.reduce((s, f) => s * (f.value / 100), 1) * 10000) / 100;

// ── Fleet status ──────────────────────────────────────────────────────────────
const FLEET = [
  { id:"TRK-001", type:"10-ton", driver:"Ahmed M.",   status:"On Route",  fuel:68, next:"Cairo North", km:184 },
  { id:"TRK-002", type:"10-ton", driver:"Mohamed K.", status:"At DC",     fuel:92, next:"—",           km:0   },
  { id:"TRK-003", type:"7-ton",  driver:"Tarek S.",   status:"On Route",  fuel:41, next:"Alex West",   km:212 },
  { id:"TRK-004", type:"7-ton",  driver:"Karim H.",   status:"Loading",   fuel:85, next:"Alex East",   km:158 },
  { id:"TRK-005", type:"5-ton",  driver:"Hossam F.",  status:"On Route",  fuel:59, next:"Mansoura",    km:142 },
  { id:"TRK-006", type:"5-ton",  driver:"Amr W.",     status:"Scheduled", fuel:100, next:"Asyut",      km:198 },
];
const statusColor = (s: string) =>
  s === "On Route" ? "#2EA064" : s === "At DC" ? "#60B8D4" : s === "Loading" ? "#FFA726" : "#9BA3B2";
const fuelColor   = (f: number) => f > 60 ? "#4CAF50" : f > 30 ? "#FFA726" : "#EF5350";

// ── Ad Hoc: Egypt Census Data ─────────────────────────────────────────────────
const CENSUS = [
  { region: "Greater Cairo", retail: 98400, horeca: 74200, gold: 2840, silver: 8920, bronze: 86640, coverage: 78 },
  { region: "Alexandria",    retail: 52100, horeca: 41800, gold: 1620, silver: 4980, bronze: 45500, coverage: 82 },
  { region: "Delta",         retail: 87300, horeca: 52600, gold: 980,  silver: 3640, bronze: 82680, coverage: 61 },
  { region: "Upper Egypt",   retail: 73200, horeca: 38400, gold: 620,  silver: 2810, bronze: 69770, coverage: 44 },
  { region: "Canal Zone",    retail: 29100, horeca: 18200, gold: 480,  silver: 1840, bronze: 26780, coverage: 69 },
  { region: "Sinai",         retail: 10000, horeca: 8000,  gold: 120,  silver: 680,  bronze: 9200,  coverage: 38 },
];

const CENSUS_EGYPT = {
  retail2022: 392000, retail2025: 370000, retailNew: 144000, retailClosed: 166000,
  horeca2025: 292000, horecaNew: 63000,
  storeDataPoints: 300,
  surveyFrequency: "Every 3 Years",
};

// ── Ad Hoc: Store Classification (Gold/Silver/Bronze) ────────────────────────
const STORE_SAMPLES = [
  { id:"STR-001", name:"Al Mokhtar Market",    class:"Gold",   score:91, cat:"Grocery",  sales:48200, cooling:true,  brands:24 },
  { id:"STR-002", name:"Masr El Gedida Mall",  class:"Gold",   score:88, cat:"Grocery",  sales:42100, cooling:true,  brands:21 },
  { id:"STR-003", name:"Nile Fresh",           class:"Silver", score:74, cat:"Grocery",  sales:28400, cooling:true,  brands:14 },
  { id:"STR-004", name:"Kafr El Sheikh Dist.", class:"Silver", score:68, cat:"FMCG",     sales:22800, cooling:false, brands:11 },
  { id:"STR-005", name:"Ahmed Kiosk",          class:"Bronze", score:42, cat:"Kiosk",    sales:8400,  cooling:false, brands:6  },
  { id:"STR-006", name:"Hassan Mini Market",   class:"Bronze", score:38, cat:"Mini",     sales:6200,  cooling:false, brands:4  },
];

// ── White Spots (Coverage Gaps) ───────────────────────────────────────────────
const WHITE_SPOTS = [
  { zone:"6th October — Zone C",  stores:284, unserved:189, potential:142800, priority:"High" },
  { zone:"Asyut — El Hamra",      stores:196, unserved:168, potential:112400, priority:"High" },
  { zone:"Mansoura — El Gomhoria",stores:152, unserved:89,  potential:67200,  priority:"Medium" },
  { zone:"Alexandria — Amreya",   stores:118, unserved:72,  potential:54600,  priority:"Medium" },
  { zone:"Cairo — Ain Shams",     stores:94,  unserved:38,  potential:28900,  priority:"Low" },
];

// ── Heat Map data (simulated density grid) ────────────────────────────────────
const HEAT_DATA = [
  { area:"Greater Cairo",  density:98, premium:72, coverage:78, gap:22 },
  { area:"Alexandria",     density:84, premium:81, coverage:82, gap:18 },
  { area:"Nile Delta",     density:76, premium:48, coverage:61, gap:39 },
  { area:"Canal Zone",     density:61, premium:52, coverage:69, gap:31 },
  { area:"Upper Egypt",    density:52, premium:31, coverage:44, gap:56 },
  { area:"Sinai",          density:28, premium:18, coverage:38, gap:62 },
];

// ── Merchandising AI KPIs ─────────────────────────────────────────────────────
const MERCH_KPIS = [
  { kpi: "Planogram Compliance",  value: 73.4, target: 90,  color: "#E07B2A", icon: "📐", desc:"Shelf layout vs standard" },
  { kpi: "Shelf Share",           value: 28.6, target: 35,  color: "#2EA064", icon: "📊", desc:"% shelf space vs competition" },
  { kpi: "Out-of-Stock Detection",value: 8.2,  target: 3,   color: "#EF5350", icon: "⚠️", desc:"SKUs not found on shelf (%)" },
  { kpi: "Competition Presence",  value: 64.1, target: 55,  color: "#7B5EA7", icon: "🔍", desc:"Competitor SKU coverage (%)" },
  { kpi: "Price Tag Compliance",  value: 88.7, target: 95,  color: "#1A8A8A", icon: "🏷️", desc:"Correct price tags on-shelf (%)" },
];

const MERCH_TREND = [
  { m:"Jan", planogram:68, shelf:24, oos:12.4, price:81 },
  { m:"Feb", planogram:70, shelf:25, oos:11.2, price:83 },
  { m:"Mar", planogram:71, shelf:26, oos:10.1, price:85 },
  { m:"Apr", planogram:72, shelf:27, oos:9.4,  price:86 },
  { m:"May", planogram:73, shelf:28, oos:8.8,  price:88 },
  { m:"Jun", planogram:73, shelf:29, oos:8.2,  price:89 },
];

export default function DistributionPage() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview"|"routes"|"vrp"|"fleet"|"market"|"merch"|"rtm">("overview");

  const totalCap    = DCS.reduce((s, dc) => s + dc.capacity, 0);
  const totalUsed   = DCS.reduce((s, dc) => s + dc.used, 0);
  const avgOTD      = Math.round(DCS.reduce((s, dc) => s + dc.otd, 0) / DCS.length * 10) / 10;
  const totalOrders = DCS.reduce((s, dc) => s + dc.orders, 0);

  const kpis = [
    { label: t("Perfect Order",    "الطلب المثالي",         lang), value: `${perfectOrder}%`, sub: "OTD×Complete×Damage-Free×Invoice (SCOR)", color: perfectOrder >= 90 ? "#2EA064" : "#FFA726", icon: "🎯" },
    { label: t("Avg OTD",          "متوسط التسليم",         lang), value: `${avgOTD}%`,  sub: "On-Time Delivery Rate",                         color: "#1A8A8A",  icon: "🚛" },
    { label: t("DC Utilization",   "استغلال مراكز التوزيع", lang), value: `${Math.round(totalUsed/totalCap*100)}%`, sub: `${(totalUsed/1000).toFixed(0)}K / ${(totalCap/1000).toFixed(0)}K units`, color: "#C9A84C", icon: "🏢" },
    { label: t("Census Stores",    "متاجر مصر",             lang), value: "662K",  sub: "370K Retail + 292K Horeca (Ad Hoc Egypt 2025)",       color: "#7B5EA7",  icon: "🗺️" },
    { label: t("VRP Cost Saving",  "توفير تكاليف التوزيع",  lang), value: `${VRP_RESULT.costSaving}%`, sub: `${VRP_RESULT.prevDistance - VRP_RESULT.totalDistance} km saved — Vonoy AI`, color: "#E07B2A", icon: "💡" },
  ];

  const tabs = [
    { id: "overview", en: "DC Overview",          ar: "نظرة عامة" },
    { id: "routes",   en: "Routes",               ar: "المسارات" },
    { id: "vrp",      en: "Vonoy VRP",            ar: "محسّن المسارات" },
    { id: "fleet",    en: "Fleet",                ar: "الأسطول" },
    { id: "market",   en: "Market Intelligence",  ar: "ذكاء السوق" },
    { id: "merch",    en: "Merchandising AI",     ar: "ذكاء المرشندايزينج" },
    { id: "rtm",      en: "RTM Integration",      ar: "تكامل RTM" },
  ] as const;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar lang={lang} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar lang={lang} onLangChange={() => setLang(l => l === "en" ? "ar" : "en")}
          pageTitle="Distribution" pageAr="التوزيع" module="distribution"
          exportData={CENSUS.map(c => ({ Region: c.region, "Retail Stores": c.retail, "Horeca": c.horeca, "Total": c.retail + c.horeca, "Gold": c.gold, "Silver": c.silver, "Bronze": c.bronze, "Coverage %": c.coverage }))}
          exportFilename="distribution-census"
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

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, borderBottom: "1px solid rgba(46,160,100,0.15)", flexWrap: "wrap" }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "8px 14px", fontSize: 11, fontWeight: 700, background: "transparent", cursor: "pointer", border: "none",
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

              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(46,160,100,0.2)", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{t("SCOR Perfect Order Rate","معدل الطلب المثالي (SCOR)",lang)}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Perfect Order = OTD% × Complete% × Damage-Free% × Correct Invoice%</div>
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

              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(46,160,100,0.15)", padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
                  {t("6-Month Delivery Performance","أداء التسليم — ٦ أشهر",lang)}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={DELIVERY_TREND} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(46,160,100,0.08)" />
                    <XAxis dataKey="m" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                    <YAxis domain={[85,100]} tick={{ fill: "#9BA3B2", fontSize: 10 }} unit="%" />
                    <Tooltip contentStyle={{ background:"#1C2435", border:"1px solid rgba(46,160,100,0.3)", borderRadius:8, fontSize:11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="otd"     name="OTD %"          stroke="#2EA064" strokeWidth={2} dot={{ r:4 }} />
                    <Line type="monotone" dataKey="perfect" name="Perfect Order %" stroke="#C9A84C" strokeWidth={2} dot={{ r:4 }} />
                    <Line type="monotone" dataKey="fill"    name="Fill Rate %"     stroke="#60B8D4" strokeWidth={2} dot={{ r:4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── ROUTES ── */}
          {activeTab === "routes" && (
            <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(46,160,100,0.15)", overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(46,160,100,0.1)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{t("Active Route Plan","خطة المسارات النشطة",lang)}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Vonoy VRP — Van (Static) + Via (Dynamic Pre-Sale)</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.8fr 1fr 1fr 0.8fr 1.2fr 1fr 0.8fr", padding: "8px 20px", background: "rgba(46,160,100,0.04)" }}>
                {["Route ID","DC","Module","Stops","Distance","Load %","Driver","Status","Savings"].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{h}</div>
                ))}
              </div>
              {ROUTES.map((r, i) => (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.8fr 1fr 1fr 0.8fr 1.2fr 1fr 0.8fr", padding: "12px 20px", borderTop: "1px solid rgba(46,160,100,0.06)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#C9A84C", fontFamily: "monospace" }}>{r.id}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.dc}</div>
                  <div><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: r.module === "Van" ? "rgba(46,160,100,0.15)" : "rgba(123,94,167,0.15)", color: r.module === "Van" ? "#4CAF50" : "#7B5EA7" }}>{r.module}</span></div>
                  <div style={{ fontSize: 11, color: "var(--text)" }}>{r.stops}</div>
                  <div style={{ fontSize: 11, color: "var(--text)" }}>{r.dist} km</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: r.load > 85 ? "#FFA726" : "#4CAF50" }}>{r.load}%</div>
                  <div style={{ fontSize: 11, color: "var(--text)" }}>{r.driver}</div>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                      background: r.status==="Delivering"?"rgba(46,160,100,0.15)":r.status==="Completed"?"rgba(96,184,212,0.12)":r.status==="Loading"?"rgba(255,167,38,0.15)":"rgba(155,163,178,0.12)",
                      color: r.status==="Delivering"?"#4CAF50":r.status==="Completed"?"#60B8D4":r.status==="Loading"?"#FFA726":"#9BA3B2",
                    }}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#2EA064" }}>EGP {r.savings.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── VRP SOLVER (Vonoy) ── */}
          {activeTab === "vrp" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Vonoy banner */}
              <div style={{ background: "linear-gradient(135deg,rgba(46,160,100,0.12),rgba(123,94,167,0.08))", borderRadius: 10, border: "1px solid rgba(46,160,100,0.25)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#2EA064" }}>Vonoy — AI Route Optimization Engine</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>FMCG Distribution Optimizer | Van (Cash Van Static) + Via (Pre-Sale Dynamic) | LP Solver + ML Feedback</div>
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                  {[
                    { v:"31%", l:"Cost Reduction" }, { v:"15%", l:"Fewer Vehicles" },
                    { v:"18%", l:"Extra Capacity" }, { v:"30 min", l:"Plan Generation" },
                  ].map(m => (
                    <div key={m.l} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#2EA064" }}>{m.v}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{m.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(46,160,100,0.25)", padding: "20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#2EA064", marginBottom: 16 }}>{t("VRP Optimization Result","نتيجة تحسين المسارات",lang)}</div>
                  <div style={{ background: "rgba(46,160,100,0.06)", borderRadius: 8, padding: "14px 16px", fontFamily: "monospace", fontSize: 11, color: "#4CAF50", marginBottom: 16, lineHeight: 2 }}>
                    <div style={{ color: "var(--text-muted)", fontSize: 10, marginBottom: 4 }}>ALGORITHM</div>
                    {VRP_RESULT.algorithm}
                    <div style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 8, marginBottom: 4 }}>OBJECTIVE</div>
                    MIN Σ distance(route_i){"\n"}
                    s.t. capacity(truck) ≤ 10 ton{"\n"}
                         time_window(customer) satisfied{"\n"}
                         SKU_logic + fleet_type constraints{"\n"}
                         each customer visited exactly once
                  </div>
                  {[
                    { label: "Optimal Distance",  value: `${VRP_RESULT.totalDistance} km`,         prev: `was ${VRP_RESULT.prevDistance} km` },
                    { label: "Total Routes",       value: `${VRP_RESULT.totalRoutes}`,               prev: "Clarke-Wright" },
                    { label: "Fleet Utilization", value: `${VRP_RESULT.fleetUtilization}%`,          prev: "avg load factor" },
                    { label: "Cost Saving",        value: `${VRP_RESULT.costSaving}%`,               prev: "vs manual routing" },
                    { label: "SA Iterations",      value: VRP_RESULT.iterations.toLocaleString(),    prev: "convergence" },
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
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#C9A84C", marginBottom: 12 }}>AI Self-Learning — Service Time Accuracy</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12 }}>ML feedback loop: actual vs planned service time per customer → model improves each week</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={VONOY_METRICS} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                      <XAxis dataKey="week" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" domain={[70,105]} tick={{ fill: "#9BA3B2", fontSize: 10 }} unit="%" />
                      <Tooltip contentStyle={{ background: "#1C2435", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar yAxisId="left" dataKey="planned" name="Planned (min)" fill="#2EA064" opacity={0.6} radius={[3,3,0,0]} />
                      <Bar yAxisId="left" dataKey="actual"  name="Actual (min)"  fill="#E07B2A" opacity={0.6} radius={[3,3,0,0]} />
                      <Line yAxisId="right" type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#C9A84C" strokeWidth={2} dot={{ r:4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Van Module",  sub: "Cash Van — Static Route Optimization", color: "#2EA064" },
                      { label: "Via Module",  sub: "Pre-Sale — Dynamic Route Planning",     color: "#7B5EA7" },
                    ].map(m => (
                      <div key={m.label} style={{ background: `${m.color}0A`, border: `1px solid ${m.color}22`, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: m.color }}>{m.label}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{m.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[
                  { label:"SalesBuzz Integration", desc:"Orders flow → Vonoy VRP → Optimal plan returned in ≤30 min", color:"#2EA064" },
                  { label:"Constraint Engine",     desc:"Capacity · Time Windows · SKU Logic · Fleet Types · Driver Hours", color:"#C9A84C" },
                  { label:"LP Solver Core",        desc:"Linear Programming: MIN Σcᵢxᵢ + Shadow prices for bottleneck detection", color:"#7B5EA7" },
                ].map(c => (
                  <div key={c.label} style={{ background: `${c.color}08`, border: `1px solid ${c.color}22`, borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: c.color, marginBottom: 6 }}>{c.label}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FLEET ── */}
          {activeTab === "fleet" && (
            <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(46,160,100,0.15)", overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(46,160,100,0.1)" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{t("Fleet Status","حالة الأسطول",lang)}</span>
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

          {/* ── MARKET INTELLIGENCE (Ad Hoc) ── */}
          {activeTab === "market" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Ad Hoc Banner */}
              <div style={{ background: "linear-gradient(135deg,rgba(123,94,167,0.12),rgba(26,138,138,0.08))", borderRadius: 10, border: "1px solid rgba(123,94,167,0.25)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#7B5EA7" }}>Ad Hoc — GEO Marketing & Market Intelligence</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>18 Years Experience | Egypt · KSA · UAE | Census Every 3 Years | 300+ Data Points / Store</div>
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                  {[
                    { v:"370K", l:"Retail Stores" }, { v:"292K", l:"Horeca" },
                    { v:"300+", l:"Data Points/Store" }, { v:"3 Yrs", l:"Survey Cycle" },
                  ].map(m => (
                    <div key={m.l} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#7B5EA7" }}>{m.v}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{m.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Egypt Census evolution */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(123,94,167,0.2)", padding: "16px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#7B5EA7", marginBottom: 4 }}>Egypt Retail Census: 2022 → 2025</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 16 }}>Active market dynamics — not a static universe</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { label:"Retail 2022", value:"392,000", color:"#9BA3B2", icon:"🏪" },
                      { label:"Retail 2025", value:"370,000", color:"#7B5EA7", icon:"🏪" },
                      { label:"New Stores",  value:"+144,000", color:"#2EA064", icon:"✅" },
                      { label:"Closed",      value:"-166,000", color:"#EF5350", icon:"❌" },
                    ].map(s => (
                      <div key={s.label} style={{ background: `${s.color}0A`, border: `1px solid ${s.color}22`, borderRadius: 8, padding: "12px" }}>
                        <div style={{ fontSize: 16 }}>{s.icon}</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: s.color, marginTop: 4 }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, background: "rgba(46,160,100,0.06)", borderRadius: 8, padding: "10px 12px", fontSize: 10, color: "var(--text-muted)", lineHeight: 1.7 }}>
                    <strong style={{ color: "#2EA064" }}>Horeca 2025:</strong> 292,000 stores (+63,000 new since 2022)<br />
                    <strong style={{ color: "#7B5EA7" }}>GPS Mapped:</strong> All stores with exact coordinates, cooling area, brand listing, shelf space, basket size
                  </div>
                </div>

                {/* Heat Map by Region */}
                <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(26,138,138,0.2)", padding: "16px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1A8A8A", marginBottom: 4 }}>GEO Heat Map — Coverage by Region</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12 }}>Store density vs coverage gap analysis</div>
                  {HEAT_DATA.map(h => (
                    <div key={h.area} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: "var(--text)", fontWeight: 600 }}>{h.area}</span>
                        <span style={{ fontSize: 10, color: h.coverage >= 75 ? "#4CAF50" : h.coverage >= 55 ? "#FFA726" : "#EF5350", fontWeight: 700 }}>{h.coverage}% covered</span>
                      </div>
                      <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden", display: "flex" }}>
                        <div style={{ height: "100%", width: `${h.coverage}%`, background: "#1A8A8A", borderRadius: "4px 0 0 4px" }} />
                        <div style={{ height: "100%", width: `${h.gap}%`, background: "#EF535022", borderRadius: "0 4px 4px 0" }} />
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 9, color: "var(--text-muted)" }}>
                        <span>Density: {h.density}%</span>
                        <span>Premium: {h.premium}%</span>
                        <span style={{ color: "#EF5350" }}>Gap: {h.gap}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Store Classification */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.2)", padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#C9A84C", marginBottom: 4 }}>Store Classification — Gold / Silver / Bronze</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12 }}>Scored on 300+ data points: GPS location, cooling area, brand listing, shelf space, basket size, ecosystem, customer demographics</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                  {[
                    { tier:"Gold",   count:6660,   pct:1.8,  color:"#C9A84C", desc:"Top-tier outlets — high basket, premium brands, cooling" },
                    { tier:"Silver", count:23890,  pct:6.5,  color:"#9BA3B2", desc:"Mid-tier — moderate volume, selective brands" },
                    { tier:"Bronze", count:339450, pct:91.7, color:"#E07B2A", desc:"Core mass market — volume-driven, price-sensitive" },
                  ].map(tier => (
                    <div key={tier.tier} style={{ background: `${tier.color}0A`, border: `1px solid ${tier.color}33`, borderRadius: 8, padding: "14px" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: tier.color }}>{tier.tier}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>{tier.count.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{tier.pct}% of total stores</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>{tier.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr) 1fr 1fr 1fr 1fr", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(201,168,76,0.15)" }}>
                  {["Store","Classification","Score","Category","Monthly Sales","Cooling","Brand Count"].map(h => (
                    <div key={h} style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", padding: "8px 10px", background: "rgba(201,168,76,0.06)" }}>{h}</div>
                  ))}
                  {STORE_SAMPLES.map((s, i) => (
                    [
                      <div key={`${s.id}-n`} style={{ fontSize: 10, color: "var(--text)", padding: "10px 10px", borderTop: "1px solid rgba(201,168,76,0.08)", background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>{s.name}</div>,
                      <div key={`${s.id}-c`} style={{ padding: "10px 10px", borderTop: "1px solid rgba(201,168,76,0.08)", background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4, background: s.class==="Gold"?"rgba(201,168,76,0.2)":s.class==="Silver"?"rgba(155,163,178,0.2)":"rgba(224,123,42,0.15)", color: s.class==="Gold"?"#C9A84C":s.class==="Silver"?"#9BA3B2":"#E07B2A" }}>{s.class}</span>
                      </div>,
                      <div key={`${s.id}-s`} style={{ fontSize: 10, fontWeight: 700, color: s.score>=80?"#4CAF50":s.score>=60?"#FFA726":"#EF5350", padding: "10px 10px", borderTop: "1px solid rgba(201,168,76,0.08)", background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>{s.score}/100</div>,
                      <div key={`${s.id}-cat`} style={{ fontSize: 10, color: "var(--text-muted)", padding: "10px 10px", borderTop: "1px solid rgba(201,168,76,0.08)", background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>{s.cat}</div>,
                      <div key={`${s.id}-sal`} style={{ fontSize: 10, color: "var(--text)", padding: "10px 10px", borderTop: "1px solid rgba(201,168,76,0.08)", background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>EGP {s.sales.toLocaleString()}</div>,
                      <div key={`${s.id}-cool`} style={{ fontSize: 10, color: s.cooling?"#4CAF50":"var(--text-muted)", padding: "10px 10px", borderTop: "1px solid rgba(201,168,76,0.08)", background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>{s.cooling?"Yes":"No"}</div>,
                      <div key={`${s.id}-br`} style={{ fontSize: 10, color: "var(--text)", padding: "10px 10px", borderTop: "1px solid rgba(201,168,76,0.08)", background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>{s.brands}</div>,
                    ]
                  ))}
                </div>
              </div>

              {/* White Spots */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(239,83,80,0.2)", padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#EF5350", marginBottom: 4 }}>White Spots — Coverage Gap Analysis</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12 }}>SalesBuzz active customers vs Ad Hoc Census stores — identifying unserved territory with revenue potential</div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(239,83,80,0.12)" }}>
                  {["Zone","Total Stores","Unserved","Potential (EGP/mo)","Priority"].map(h => (
                    <div key={h} style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", padding: "8px 12px", background: "rgba(239,83,80,0.06)" }}>{h}</div>
                  ))}
                  {WHITE_SPOTS.map((w, i) => (
                    [
                      <div key={`${w.zone}-z`} style={{ fontSize: 10, color: "var(--text)", fontWeight: 600, padding: "10px 12px", borderTop: "1px solid rgba(239,83,80,0.08)", background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>{w.zone}</div>,
                      <div key={`${w.zone}-t`} style={{ fontSize: 10, color: "var(--text)", padding: "10px 12px", borderTop: "1px solid rgba(239,83,80,0.08)", background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>{w.stores}</div>,
                      <div key={`${w.zone}-u`} style={{ fontSize: 10, fontWeight: 700, color: "#EF5350", padding: "10px 12px", borderTop: "1px solid rgba(239,83,80,0.08)", background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>{w.unserved}</div>,
                      <div key={`${w.zone}-p`} style={{ fontSize: 10, color: "#4CAF50", fontWeight: 700, padding: "10px 12px", borderTop: "1px solid rgba(239,83,80,0.08)", background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>EGP {w.potential.toLocaleString()}</div>,
                      <div key={`${w.zone}-pr`} style={{ padding: "10px 12px", borderTop: "1px solid rgba(239,83,80,0.08)", background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: w.priority==="High"?"rgba(239,83,80,0.2)":w.priority==="Medium"?"rgba(255,167,38,0.15)":"rgba(155,163,178,0.1)", color: w.priority==="High"?"#EF5350":w.priority==="Medium"?"#FFA726":"#9BA3B2" }}>{w.priority}</span>
                      </div>,
                    ]
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── MERCHANDISING AI ── */}
          {activeTab === "merch" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "linear-gradient(135deg,rgba(26,138,138,0.12),rgba(46,160,100,0.06))", borderRadius: 10, border: "1px solid rgba(26,138,138,0.25)", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#1A8A8A" }}>Merchandising AI — Photo-Based Shelf Intelligence</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>AI image analysis → Planogram Compliance · Shelf Share · OOS Detection · Competition · Price Tags</div>
                </div>
                <div style={{ fontSize: 10, color: "#1A8A8A", fontWeight: 700, background: "rgba(26,138,138,0.1)", padding: "6px 12px", borderRadius: 6 }}>Powered by Computer Vision AI</div>
              </div>

              {/* KPI Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
                {MERCH_KPIS.map(k => {
                  const isGood = k.kpi === "Out-of-Stock Detection" ? k.value <= k.target : k.kpi === "Competition Presence" ? k.value <= k.target : k.value >= k.target;
                  const pct = k.kpi === "Out-of-Stock Detection" ? (k.target / k.value) * 100 : k.kpi === "Competition Presence" ? (k.target / k.value) * 100 : (k.value / k.target) * 100;
                  return (
                    <div key={k.kpi} style={{ background: "var(--bg-card)", borderRadius: 10, border: `1px solid ${k.color}22`, padding: "14px", borderTop: `3px solid ${k.color}` }}>
                      <div style={{ fontSize: 20, marginBottom: 6 }}>{k.icon}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: isGood ? "#4CAF50" : "#FFA726" }}>{k.value}%</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: k.color, marginTop: 2 }}>{k.kpi}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{k.desc}</div>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginBottom: 3 }}>
                          <span>Target: {k.target}%</span>
                          <span style={{ color: isGood ? "#4CAF50" : "#FFA726" }}>{isGood ? "✓ Met" : "⚠ Gap"}</span>
                        </div>
                        <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: isGood ? "#4CAF50" : "#FFA726", borderRadius: 2 }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Trend Chart */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(26,138,138,0.15)", padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>6-Month Merchandising KPI Trend</div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={MERCH_TREND} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,138,138,0.08)" />
                    <XAxis dataKey="m" tick={{ fill: "#9BA3B2", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#9BA3B2", fontSize: 10 }} unit="%" />
                    <Tooltip contentStyle={{ background:"#1C2435", border:"1px solid rgba(26,138,138,0.3)", borderRadius:8, fontSize:11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="planogram" name="Planogram Compliance %" fill="rgba(224,123,42,0.08)" stroke="#E07B2A" strokeWidth={2} />
                    <Line type="monotone" dataKey="shelf"     name="Shelf Share %"          stroke="#2EA064" strokeWidth={2} dot={{ r:3 }} />
                    <Line type="monotone" dataKey="price"     name="Price Tag Compliance %"  stroke="#1A8A8A" strokeWidth={2} dot={{ r:3 }} />
                    <Line type="monotone" dataKey="oos"       name="OOS % (lower=better)"    stroke="#EF5350" strokeWidth={2} dot={{ r:3 }} strokeDasharray="4 2" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* AI Process Flow */}
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(26,138,138,0.15)", padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>AI Photo Analysis Process</div>
                <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
                  {[
                    { step:"1", label:"Photo Capture",  desc:"Rep takes shelf photo via SalesBuzz mobile app",         color:"#7B5EA7" },
                    { step:"2", label:"AI Analysis",    desc:"Computer Vision model processes image in real-time",      color:"#1A8A8A" },
                    { step:"3", label:"KPI Extraction", desc:"Planogram · Shelf Share · OOS · Competition · Price",     color:"#2EA064" },
                    { step:"4", label:"Action Alert",   desc:"Rep notified instantly if compliance below threshold",    color:"#C9A84C" },
                    { step:"5", label:"Report Upload",  desc:"Results synced to Ad Hoc dashboard and SalesBuzz",       color:"#E07B2A" },
                  ].map((s, i) => (
                    <div key={s.step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${s.color}22`, border: `2px solid ${s.color}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: 14, fontWeight: 900, color: s.color }}>{s.step}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: s.color }}>{s.label}</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>{s.desc}</div>
                      </div>
                      {i < 4 && <div style={{ width: 30, height: 2, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── RTM INTEGRATION ── */}
          {activeTab === "rtm" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(46,160,100,0.2)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>RTM (Route-to-Market) — Three-Way Intelligence Platform</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 24 }}>Closed-loop system: market insight → execution → optimization → audit → re-planning</div>

                {/* Integration flow */}
                <div style={{ display: "flex", gap: 0, alignItems: "stretch", marginBottom: 24 }}>
                  {[
                    {
                      platform: "Ad Hoc",
                      color: "#7B5EA7",
                      role: "Market Intelligence",
                      inputs: ["Census Data (370K+292K stores)","Store Classification (G/S/B)","GEO Heat Maps","White Spot Detection","Ecosystem Analysis"],
                      outputs: ["Target store lists","Coverage maps","Premium targets","Territory plans"],
                    },
                    {
                      platform: "SalesBuzz",
                      color: "#E07B2A",
                      role: "Sales Execution",
                      inputs: ["Ad Hoc store targets","Route assignments","Product catalogue","Orders & invoices"],
                      outputs: ["Confirmed orders","Actual visit data","Shelf photos (→ Ad Hoc)","Sales performance"],
                    },
                    {
                      platform: "Vonoy",
                      color: "#2EA064",
                      role: "Route Optimization",
                      inputs: ["SalesBuzz orders","Customer coordinates","Fleet capacity","Time windows"],
                      outputs: ["Optimal routes (≤30 min)","Driver assignments","Cost savings","AI-improved plans"],
                    },
                  ].map((p, i) => (
                    <div key={p.platform} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                      <div style={{ flex: 1, background: `${p.color}0A`, border: `1px solid ${p.color}33`, borderRadius: 10, padding: "16px" }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: p.color }}>{p.platform}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12, fontWeight: 600 }}>{p.role}</div>
                        <div style={{ fontSize: 9, color: p.color, fontWeight: 700, marginBottom: 6 }}>INPUTS</div>
                        {p.inputs.map(inp => (
                          <div key={inp} style={{ fontSize: 9, color: "var(--text-muted)", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>← {inp}</div>
                        ))}
                        <div style={{ fontSize: 9, color: "#4CAF50", fontWeight: 700, marginTop: 10, marginBottom: 6 }}>OUTPUTS</div>
                        {p.outputs.map(out => (
                          <div key={out} style={{ fontSize: 9, color: "var(--text-muted)", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>→ {out}</div>
                        ))}
                      </div>
                      {i < 2 && (
                        <div style={{ width: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "0 4px" }}>
                          <div style={{ width: 2, flex: 1, background: "rgba(255,255,255,0.08)" }} />
                          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>→</div>
                          <div style={{ width: 2, flex: 1, background: "rgba(255,255,255,0.08)" }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Feedback loop */}
                <div style={{ background: "rgba(46,160,100,0.06)", borderRadius: 8, padding: "14px 16px", border: "1px solid rgba(46,160,100,0.15)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#2EA064", marginBottom: 8 }}>Closed-Loop Feedback Cycle</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {[
                      "Ad Hoc Census → identifies territory & store targets",
                      "SalesBuzz → assigns reps, captures orders & shelf photos",
                      "Vonoy → optimizes delivery routes using SalesBuzz orders",
                      "Ad Hoc Merch AI → audits shelf compliance from photos",
                      "Insights feed back → update store scoring & route priorities",
                    ].map((step, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#2EA06422", border: "1px solid #2EA064", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#2EA064", flexShrink: 0 }}>{i+1}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{step}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                  { label:"Vonoy Cost Reduction",  value:"31%",    sub:"vs manual routing",              color:"#2EA064", icon:"💰" },
                  { label:"Census Universe",        value:"662K",   sub:"Retail + Horeca Egypt 2025",     color:"#7B5EA7", icon:"🗺️" },
                  { label:"Planning Time",          value:"30 min", sub:"full route plan generation",      color:"#1A8A8A", icon:"⚡" },
                  { label:"Store Data Points",      value:"300+",   sub:"per store for classification",   color:"#C9A84C", icon:"📊" },
                ].map(s => (
                  <div key={s.label} style={{ background: "var(--bg-card)", borderRadius: 10, border: `1px solid ${s.color}22`, padding: "16px", textAlign: "center", borderBottom: `3px solid ${s.color}` }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formula bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { label:"Perfect Order (SCOR)",   formula:"OTD% × Complete% × Damage-Free% × Invoice%",                    color:"#2EA064" },
              { label:"Vonoy VRP Objective",    formula:"MIN Σ dist(i,j)·x(i,j)  s.t. capacity + TW + SKU constraints", color:"#C9A84C" },
              { label:"RTM Coverage Gap",       formula:"White Spots = Census Stores − SalesBuzz Active Customers",      color:"#7B5EA7" },
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
