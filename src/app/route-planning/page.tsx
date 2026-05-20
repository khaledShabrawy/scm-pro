"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

import { DEFAULT_ALERTS } from "@/lib/notifications";
// Dynamically import GoogleMapsPanel (browser-only: Maps API + Drawing Library)
const GoogleMapsPanel = dynamic(
  () => import("@/components/maps/GoogleMapsPanel"),
  { ssr: false, loading: () => (
    <div style={{ width:"100%", height:520, background:"var(--bg-card)", borderRadius:10,
      display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
      <div style={{ width:24, height:24, border:"3px solid #E07B2A", borderTopColor:"transparent",
        borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
      <span style={{ color:"var(--text-muted)", fontSize:13 }}>Loading map…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )}
);

// ─── Roadnet-style Route Planning ────────────────────────────────────────────
// Territory Builder · Beat Plan Generator · Service Time Matrix · Day Sequencing

const t = (en: string, ar: string, lang: "en" | "ar") => lang === "ar" ? ar : en;
const DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];
const DAYS_AR = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

// ── 1. TERRITORY DATA ─────────────────────────────────────────────────────────
const REPS = [
  { id:"R1", name:"Ahmed Hassan",   nameAr:"أحمد حسن",    zone:"Cairo North",    color:"#E07B2A", customers:84, orders:1420, serviceHrs:6.8, km:142, calls:84,  gold:12, silver:31, bronze:41 },
  { id:"R2", name:"Mohamed Kamal",  nameAr:"محمد كمال",   zone:"Cairo South",    color:"#2EA064", customers:91, orders:1580, serviceHrs:7.2, km:158, calls:91,  gold:9,  silver:28, bronze:54 },
  { id:"R3", name:"Tarek Samir",    nameAr:"طارق سمير",   zone:"Alexandria",     color:"#7B5EA7", customers:76, orders:1210, serviceHrs:6.4, km:198, calls:76,  gold:18, silver:34, bronze:24 },
  { id:"R4", name:"Karim Hassan",   nameAr:"كريم حسن",    zone:"Delta",          color:"#1A8A8A", customers:68, orders:980,  serviceHrs:5.9, km:124, calls:68,  gold:6,  silver:22, bronze:40 },
  { id:"R5", name:"Hossam Fathy",   nameAr:"حسام فتحي",   zone:"Canal Zone",     color:"#C9A84C", customers:55, orders:810,  serviceHrs:5.2, km:186, calls:55,  gold:4,  silver:18, bronze:33 },
  { id:"R6", name:"Amr Wael",       nameAr:"عمرو وائل",   zone:"Upper Egypt",    color:"#60B8D4", customers:48, orders:620,  serviceHrs:4.8, km:214, calls:48,  gold:3,  silver:14, bronze:31 },
];

// Workload balance score (lower std dev = better balance)
const avgCustomers = REPS.reduce((s,r) => s+r.customers,0) / REPS.length;
const workloadStd  = Math.sqrt(REPS.reduce((s,r) => s + Math.pow(r.customers - avgCustomers, 2), 0) / REPS.length);
const balanceScore = Math.max(0, 100 - workloadStd * 1.2).toFixed(0);

// ── 2. BEAT PLAN DATA ─────────────────────────────────────────────────────────
// frequency: W=weekly, B=bi-weekly, M=monthly
type Freq = "W" | "B" | "M";
type BeatCell = { customers: number; serviceMin: number; freq: Freq };
type BeatRow = { rep: string; repAr: string; color: string; days: BeatCell[] };

const BEAT_PLAN: BeatRow[] = [
  { rep:"Ahmed",  repAr:"أحمد",  color:"#E07B2A", days:[
    { customers:16, serviceMin:384, freq:"W" }, { customers:14, serviceMin:336, freq:"W" },
    { customers:15, serviceMin:360, freq:"W" }, { customers:13, serviceMin:312, freq:"B" },
    { customers:14, serviceMin:336, freq:"W" }, { customers:12, serviceMin:288, freq:"B" },
  ]},
  { rep:"Mohamed", repAr:"محمد", color:"#2EA064", days:[
    { customers:17, serviceMin:408, freq:"W" }, { customers:16, serviceMin:384, freq:"W" },
    { customers:15, serviceMin:360, freq:"W" }, { customers:14, serviceMin:336, freq:"W" },
    { customers:16, serviceMin:384, freq:"B" }, { customers:13, serviceMin:312, freq:"B" },
  ]},
  { rep:"Tarek",  repAr:"طارق",  color:"#7B5EA7", days:[
    { customers:14, serviceMin:336, freq:"W" }, { customers:13, serviceMin:312, freq:"W" },
    { customers:12, serviceMin:288, freq:"B" }, { customers:13, serviceMin:312, freq:"W" },
    { customers:12, serviceMin:288, freq:"W" }, { customers:12, serviceMin:288, freq:"B" },
  ]},
  { rep:"Karim",  repAr:"كريم",  color:"#1A8A8A", days:[
    { customers:12, serviceMin:288, freq:"W" }, { customers:11, serviceMin:264, freq:"B" },
    { customers:12, serviceMin:288, freq:"W" }, { customers:11, serviceMin:264, freq:"W" },
    { customers:11, serviceMin:264, freq:"B" }, { customers:11, serviceMin:264, freq:"M" },
  ]},
  { rep:"Hossam", repAr:"حسام",  color:"#C9A84C", days:[
    { customers:10, serviceMin:240, freq:"W" }, { customers:9, serviceMin:216, freq:"W" },
    { customers:9,  serviceMin:216, freq:"B" }, { customers:9, serviceMin:216, freq:"W" },
    { customers:9,  serviceMin:216, freq:"B" }, { customers:9, serviceMin:216, freq:"M" },
  ]},
  { rep:"Amr",    repAr:"عمرو",  color:"#60B8D4", days:[
    { customers:8, serviceMin:192, freq:"B" }, { customers:8, serviceMin:192, freq:"W" },
    { customers:8, serviceMin:192, freq:"W" }, { customers:8, serviceMin:192, freq:"B" },
    { customers:8, serviceMin:192, freq:"W" }, { customers:8, serviceMin:192, freq:"M" },
  ]},
];

// ── 3. SERVICE TIME MATRIX ────────────────────────────────────────────────────
const CUST_TYPES = ["Supermarket", "Grocery", "Kiosk", "Horeca", "Pharmacy", "Wholesale"];
const CUST_TYPES_AR = ["سوبرماركت", "بقالة", "كشك", "هوريكا", "صيدلية", "جملة"];
const OPERATIONS = ["Delivery", "Invoice", "Collection", "Merchandising", "New Order"];
const OPERATIONS_AR = ["تسليم", "فاتورة", "تحصيل", "مرشندايزينج", "طلب جديد"];

// Service time in minutes per [CustomerType][Operation]
const SVC_MATRIX = [
  //Del  Inv  Col  Merch  Order
  [ 45,  15,  20,  30,    20 ],  // Supermarket
  [ 25,  10,  15,  15,    10 ],  // Grocery
  [ 10,   5,   5,   0,     5 ],  // Kiosk
  [ 30,  10,  20,   0,    15 ],  // Horeca
  [ 15,  10,  10,  10,    10 ],  // Pharmacy
  [ 60,  20,  30,   0,    25 ],  // Wholesale
];

// Visit frequency weight per type (visits/week)
const VISIT_WEIGHT = [1.5, 2.0, 3.0, 1.0, 1.5, 0.5];
const CUST_COUNT   = [18,  124, 210, 42,  36,  12];

// ── 4. DAY SEQUENCING — handled by GoogleMapsPanel (real coordinates + Haversine) ──

// ── Color helpers ─────────────────────────────────────────────────────────────
const typeColor = (type: string) =>
  type==="Supermarket"?"#C9A84C":type==="Grocery"?"#2EA064":type==="Kiosk"?"#9BA3B2":
  type==="Horeca"?"#7B5EA7":type==="Pharmacy"?"#1A8A8A":type==="Wholesale"?"#E07B2A":"#60B8D4";

const freqColor = (f: Freq) =>
  f==="W"?"#2EA064":f==="B"?"#C9A84C":"#EF5350";

const svcColor = (min: number) =>
  min===0?"rgba(155,163,178,0.12)":min<=10?"rgba(46,160,100,0.12)":min<=25?"rgba(201,168,76,0.12)":
  min<=45?"rgba(224,123,42,0.15)":"rgba(239,83,80,0.15)";

const svcText = (min: number) =>
  min===0?"#9BA3B2":min<=10?"#4CAF50":min<=25?"#C9A84C":min<=45?"#E07B2A":"#EF5350";

export default function RoutePlanningPage() {
  const [lang, setLang]       = useState<"en"|"ar">("en");
  const [activeTab, setActiveTab] = useState<"territory"|"beat"|"service"|"sequence">("territory");
  const [selectedRep, setSelectedRep] = useState("R1");
  const [beatView, setBeatView]   = useState<"table"|"map">("table");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs = [
    { id:"territory", en:"Territory Builder",    ar:"بناء المناطق" },
    { id:"beat",      en:"Beat Plan Generator",  ar:"خطة الزيارات" },
    { id:"service",   en:"Service Time Matrix",  ar:"مصفوفة أوقات الخدمة" },
    { id:"sequence",  en:"Day Sequencing",       ar:"ترتيب اليوم" },
  ] as const;

  const selectedRepData = REPS.find(r => r.id === selectedRep) ?? REPS[0];
  const totalCustomers  = REPS.reduce((s,r) => s+r.customers, 0);

  // Radar data for territory balance
  const radarData = REPS.map(r => ({
    rep: r.name.split(" ")[0],
    Customers: Math.round(r.customers / 91 * 100),
    Orders:    Math.round(r.orders / 1580 * 100),
    ServiceHr: Math.round(r.serviceHrs / 7.2 * 100),
    KM:        Math.round(r.km / 214 * 100),
  }));

  return (
    <div style={{ display:"flex", height:"100vh", background:"var(--bg-primary)", overflow:"hidden" }}>
      <Sidebar lang={lang} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Navbar lang={lang} onLangChange={() => setLang(l => l==="en"?"ar":"en")}
          pageTitle="Route Planning" pageAr="تخطيط المسارات" module="route-planning"
          exportData={REPS.map(r => ({ ID: r.id, Name: r.name, Zone: r.zone, Customers: r.customers, Orders: r.orders, "Service Hrs": r.serviceHrs, "KM/day": r.km }))}
          exportFilename="route-planning-reps"
          alerts={DEFAULT_ALERTS}
          onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main style={{ flex:1, overflowY:"auto", padding:"20px 24px", display:"flex", flexDirection:"column", gap:20 }}>

          {/* ── KPI Banner ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
            {[
              { icon:"👥", label:t("Total Customers","إجمالي العملاء",lang), value:totalCustomers.toString(), sub:`${REPS.length} sales reps`, color:"#E07B2A" },
              { icon:"⚖️", label:t("Workload Balance","توازن العبء",lang),   value:`${balanceScore}%`,        sub:"std dev < 14 customers", color:Number(balanceScore)>=80?"#4CAF50":"#FFA726" },
              { icon:"📅", label:t("Beat Frequency","تردد الزيارة",lang),    value:"3 types",                 sub:"Weekly · Bi-weekly · Monthly", color:"#1A8A8A" },
              { icon:"⏱️", label:t("Avg Svc Time","متوسط وقت الخدمة",lang), value:"24 min",                  sub:"per customer stop", color:"#7B5EA7" },
              { icon:"📍", label:t("Route Saving","توفير المسافة",lang),     value:"62%",                     sub:"Nearest-neighbor optimization",         color:"#2EA064" },
            ].map(k => (
              <div key={k.label} style={{ background:"var(--bg-card)", borderRadius:10, border:`1px solid ${k.color}22`, padding:"14px 16px", borderLeft:`4px solid ${k.color}` }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{k.icon}</div>
                <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.value}</div>
                <div style={{ fontSize:11, color:"var(--text)", fontWeight:600, marginTop:2 }}>{k.label}</div>
                <div style={{ fontSize:9, color:"var(--text-muted)", marginTop:4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Tabs ── */}
          <div style={{ display:"flex", gap:4, borderBottom:"1px solid rgba(224,123,42,0.15)" }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding:"8px 16px", fontSize:12, fontWeight:700, background:"transparent", cursor:"pointer", border:"none",
                borderBottom: activeTab===tab.id ? "2px solid #E07B2A" : "2px solid transparent",
                color: activeTab===tab.id ? "#E07B2A" : "var(--text-muted)", transition:"all 0.2s",
              }}>{lang==="ar" ? tab.ar : tab.en}</button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB 1 — TERRITORY BUILDER                             */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === "territory" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16, width:"100%", minWidth:0 }}>

              {/* Rep cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                {REPS.map(r => {
                  const active = r.id === selectedRep;
                  const workloadPct = Math.round(r.customers / 91 * 100);
                  return (
                    <div key={r.id} onClick={() => setSelectedRep(r.id)} style={{
                      background:"var(--bg-card)", borderRadius:10, padding:"14px 16px", cursor:"pointer",
                      border: active ? `2px solid ${r.color}` : `1px solid ${r.color}22`,
                      borderTop: `3px solid ${r.color}`, boxShadow: active ? `0 0 12px ${r.color}22` : "none",
                      transition:"all 0.2s",
                    }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:800, color:r.color }}>{lang==="ar"?r.nameAr:r.name}</div>
                          <div style={{ fontSize:10, color:"var(--text-muted)" }}>{r.zone}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:18, fontWeight:900, color:"var(--text)" }}>{r.customers}</div>
                          <div style={{ fontSize:9, color:"var(--text-muted)" }}>customers</div>
                        </div>
                      </div>
                      {/* Workload bar */}
                      <div style={{ height:5, background:"rgba(255,255,255,0.05)", borderRadius:3, marginBottom:8 }}>
                        <div style={{ height:"100%", width:`${workloadPct}%`, background:r.color, borderRadius:3 }} />
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:4 }}>
                        {[
                          { l:"Orders", v:r.orders.toLocaleString() },
                          { l:"Svc Hrs", v:`${r.serviceHrs}h` },
                          { l:"KM/day", v:`${r.km}` },
                          { l:"Calls",  v:r.calls },
                        ].map(m => (
                          <div key={m.l} style={{ textAlign:"center" }}>
                            <div style={{ fontSize:12, fontWeight:800, color:"var(--text)" }}>{m.v}</div>
                            <div style={{ fontSize:8, color:"var(--text-muted)" }}>{m.l}</div>
                          </div>
                        ))}
                      </div>
                      {/* Store tier breakdown */}
                      <div style={{ display:"flex", gap:6, marginTop:10 }}>
                        {[
                          { label:"🥇 Gold",   count:r.gold,   color:"#C9A84C" },
                          { label:"🥈 Silver", count:r.silver, color:"#9BA3B2" },
                          { label:"🥉 Bronze", count:r.bronze, color:"#E07B2A" },
                        ].map(tier => (
                          <div key={tier.label} style={{ flex:1, textAlign:"center", background:`${tier.color}0A`, borderRadius:5, padding:"4px 2px" }}>
                            <div style={{ fontSize:10, fontWeight:800, color:tier.color }}>{tier.count}</div>
                            <div style={{ fontSize:8, color:"var(--text-muted)" }}>{tier.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Google Maps — Territory Builder */}
              <div style={{ background:"var(--bg-card)", borderRadius:10, border:"1px solid rgba(201,168,76,0.15)", padding:"16px 20px", minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:"#C9A84C" }}>
                      🗺️ {t("Real Territory Map — Egypt","خريطة المناطق الحقيقية — مصر",lang)}
                    </div>
                    <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>
                      {t("Click ✏️ Draw Territory to hand-draw boundaries · Click a polygon to select a rep","انقر ✏️ لرسم الحدود باليد · انقر على المنطقة لتحديد المندوب",lang)}
                    </div>
                  </div>
                  <div style={{ background:"var(--bg-card)", borderRadius:7, padding:"8px 12px", border:"1px solid rgba(46,160,100,0.2)" }}>
                    <div style={{ fontSize:10, color:"var(--text-muted)" }}>{t("Balance Score","التوازن",lang)}</div>
                    <div style={{ fontSize:18, fontWeight:900, color: Number(balanceScore)>=80?"#4CAF50":"#FFA726" }}>{balanceScore}%</div>
                    <div style={{ fontSize:8, color:"var(--text-muted)" }}>σ = {workloadStd.toFixed(1)} cust</div>
                  </div>
                </div>
                <GoogleMapsPanel mode="territory" lang={lang} />
              </div>

              {/* Workload balance chart */}
              <div style={{ background:"var(--bg-card)", borderRadius:10, border:"1px solid rgba(46,160,100,0.2)", padding:"16px 20px", minWidth:0, width:"100%", boxSizing:"border-box" }}>
                <div style={{ fontSize:13, fontWeight:800, color:"#2EA064", marginBottom:4 }}>
                  {t("Workload Balance — All Reps","توازن العبء — جميع المندوبين",lang)}
                </div>
                <div style={{ fontSize:10, color:"var(--text-muted)", marginBottom:8 }}>
                  {t("Balance Score","درجة التوازن",lang)}: <strong style={{color: Number(balanceScore)>=80?"#4CAF50":"#FFA726"}}>{balanceScore}%</strong>
                  &nbsp;·&nbsp;σ = {workloadStd.toFixed(1)} customers
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={REPS.map(r=>({name:r.name.split(" ")[0], customers:r.customers, target:Math.round(avgCustomers)}))}
                    margin={{top:4,right:10,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(46,160,100,0.08)" />
                    <XAxis dataKey="name" tick={{fill:"#9BA3B2",fontSize:10}} />
                    <YAxis tick={{fill:"#9BA3B2",fontSize:10}} />
                    <Tooltip contentStyle={{background:"#1C2435",border:"1px solid rgba(46,160,100,0.3)",borderRadius:8,fontSize:11}} />
                    <Legend wrapperStyle={{fontSize:11}} />
                    <Bar dataKey="customers" name="Customers" fill="#2EA064" radius={[4,4,0,0]} />
                    <Bar dataKey="target"    name="Avg Target" fill="#C9A84C" opacity={0.5} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB 2 — BEAT PLAN GENERATOR                           */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === "beat" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16, width:"100%", minWidth:0 }}>

              {/* ── View toggle (Table / Map) ── */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, color:"var(--text-muted)" }}>{t("View:","عرض:",lang)}</span>
                {([["table","📊 "+t("Table","جدول",lang)],["map","🗺️ "+t("Map","خريطة",lang)]] as const).map(([v,label]) => (
                  <button key={v} onClick={()=>setBeatView(v)} style={{
                    padding:"5px 14px", fontSize:11, fontWeight:700, cursor:"pointer", borderRadius:6,
                    border:`1px solid ${v===beatView?"#2EA064":"rgba(46,160,100,0.2)"}`,
                    background: v===beatView?"rgba(46,160,100,0.12)":"transparent",
                    color: v===beatView?"#2EA064":"var(--text-muted)",
                    transition:"all 0.2s",
                  }}>{label}</button>
                ))}
              </div>

              {/* ── Map view ── */}
              {beatView === "map" && (
                <div style={{ background:"var(--bg-card)", borderRadius:10, border:"1px solid rgba(46,160,100,0.2)", padding:"16px 20px", minWidth:0 }}>
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:"#2EA064" }}>
                      🗺️ {t("Beat Plan Map — Customer Visit Schedule","خريطة خطة الزيارات — جدول زيارات العملاء",lang)}
                    </div>
                    <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>
                      {t("Use Day filter to see which customers each rep visits on a given day · Click a marker for details","استخدم فلتر اليوم لرؤية عملاء كل مندوب يومياً · انقر على العلامة للتفاصيل",lang)}
                    </div>
                  </div>
                  <GoogleMapsPanel mode="beat" lang={lang} />
                </div>
              )}

              {/* ── Table view ── */}
              {beatView === "table" && (
              <>
              <div style={{ background:"var(--bg-card)", borderRadius:10, border:"1px solid rgba(46,160,100,0.2)", padding:"16px 20px", minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:"var(--text)" }}>
                      {t("Weekly Beat Plan — All Reps","خطة الزيارات الأسبوعية",lang)}
                    </div>
                    <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>
                      {t("Customer visits distributed across 6-day Egyptian work week (Sat–Thu)","توزيع الزيارات على 6 أيام عمل",lang)}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    {([["W","Weekly","#2EA064"],["B","Bi-weekly","#C9A84C"],["M","Monthly","#EF5350"]] as const).map(([code,label,color]) => (
                      <div key={code} style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div style={{ width:10, height:10, borderRadius:2, background:color }} />
                        <span style={{ fontSize:9, color:"var(--text-muted)" }}>{code}={label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid */}
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ padding:"8px 12px", textAlign:"left", fontSize:10, fontWeight:700, color:"var(--text-muted)", background:"rgba(46,160,100,0.05)", width:120 }}>
                          {t("Rep","المندوب",lang)}
                        </th>
                        {DAYS.map((d,i) => (
                          <th key={d} style={{ padding:"8px 12px", textAlign:"center", fontSize:10, fontWeight:700, color:"var(--text-muted)", background:"rgba(46,160,100,0.05)" }}>
                            {lang==="ar"?DAYS_AR[i]:d}
                          </th>
                        ))}
                        <th style={{ padding:"8px 12px", textAlign:"center", fontSize:10, fontWeight:700, color:"var(--text-muted)", background:"rgba(46,160,100,0.05)" }}>
                          Total / Week
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {BEAT_PLAN.map((row, ri) => {
                        const weekTotal = row.days.reduce((s,d)=>s+d.customers,0);
                        const weekMin   = row.days.reduce((s,d)=>s+d.serviceMin,0);
                        return (
                          <tr key={row.rep} style={{ borderTop:"1px solid rgba(46,160,100,0.06)" }}>
                            <td style={{ padding:"10px 12px" }}>
                              <div style={{ fontSize:11, fontWeight:700, color:row.color }}>{lang==="ar"?row.repAr:row.rep}</div>
                              <div style={{ fontSize:9, color:"var(--text-muted)" }}>{REPS[ri].zone}</div>
                            </td>
                            {row.days.map((cell, di) => (
                              <td key={di} style={{ padding:"6px 8px", textAlign:"center" }}>
                                <div style={{
                                  background:`${freqColor(cell.freq)}18`, border:`1px solid ${freqColor(cell.freq)}33`,
                                  borderRadius:6, padding:"6px 4px",
                                }}>
                                  <div style={{ fontSize:14, fontWeight:900, color:row.color }}>{cell.customers}</div>
                                  <div style={{ fontSize:8, color:"var(--text-muted)" }}>{Math.floor(cell.serviceMin/60)}h{cell.serviceMin%60}m</div>
                                  <div style={{ fontSize:8, fontWeight:700, color:freqColor(cell.freq), marginTop:2 }}>{cell.freq}</div>
                                </div>
                              </td>
                            ))}
                            <td style={{ padding:"10px 12px", textAlign:"center" }}>
                              <div style={{ fontSize:14, fontWeight:800, color:"var(--text)" }}>{weekTotal}</div>
                              <div style={{ fontSize:9, color:"var(--text-muted)" }}>{Math.floor(weekMin/60)}h {weekMin%60}m</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop:"2px solid rgba(46,160,100,0.15)" }}>
                        <td style={{ padding:"10px 12px", fontSize:11, fontWeight:800, color:"var(--text)" }}>TOTAL</td>
                        {DAYS.map((d,di) => {
                          const dayTotal = BEAT_PLAN.reduce((s,row)=>s+row.days[di].customers,0);
                          const dayMin   = BEAT_PLAN.reduce((s,row)=>s+row.days[di].serviceMin,0);
                          return (
                            <td key={d} style={{ padding:"10px 8px", textAlign:"center" }}>
                              <div style={{ fontSize:13, fontWeight:800, color:"#2EA064" }}>{dayTotal}</div>
                              <div style={{ fontSize:8, color:"var(--text-muted)" }}>{Math.floor(dayMin/60)}h</div>
                            </td>
                          );
                        })}
                        <td style={{ padding:"10px 12px", textAlign:"center" }}>
                          <div style={{ fontSize:14, fontWeight:900, color:"#E07B2A" }}>
                            {BEAT_PLAN.reduce((s,row)=>s+row.days.reduce((ss,d)=>ss+d.customers,0),0)}
                          </div>
                          <div style={{ fontSize:9, color:"var(--text-muted)" }}>total/week</div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Day load chart */}
              <div style={{ background:"var(--bg-card)", borderRadius:10, border:"1px solid rgba(201,168,76,0.2)", padding:"16px 20px", width:"100%", minWidth:0, boxSizing:"border-box" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--text)", marginBottom:12 }}>
                  {t("Daily Customer Load by Rep","عبء العملاء اليومي لكل مندوب",lang)}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={DAYS.map((d,di) => ({
                    day: lang==="ar"?DAYS_AR[di]:d,
                    ...Object.fromEntries(BEAT_PLAN.map(r=>[r.rep, r.days[di].customers]))
                  }))} margin={{top:4,right:10,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                    <XAxis dataKey="day" tick={{fill:"#9BA3B2",fontSize:10}} />
                    <YAxis tick={{fill:"#9BA3B2",fontSize:10}} />
                    <Tooltip contentStyle={{background:"#1C2435",border:"1px solid rgba(201,168,76,0.3)",borderRadius:8,fontSize:11}} />
                    <Legend wrapperStyle={{fontSize:10}} />
                    {BEAT_PLAN.map(r => (
                      <Bar key={r.rep} dataKey={r.rep} stackId="a" fill={r.color} opacity={0.85} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              </> )} {/* end beatView === "table" */}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB 3 — SERVICE TIME MATRIX                           */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === "service" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16, width:"100%", minWidth:0 }}>
              <div style={{ background:"var(--bg-card)", borderRadius:10, border:"1px solid rgba(123,94,167,0.2)", padding:"16px 20px", minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:"#7B5EA7", marginBottom:4 }}>
                  {t("Service Time Matrix (minutes per stop)","مصفوفة وقت الخدمة (دقيقة لكل زيارة)",lang)}
                </div>
                <div style={{ fontSize:10, color:"var(--text-muted)", marginBottom:16 }}>
                  {t("Used by Day Sequencing Engine to calculate route duration and time-window compliance","يستخدمها نظام ترتيب اليوم لحساب مدة المسار والالتزام بالنوافذ الزمنية",lang)}
                </div>

                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ padding:"10px 14px", textAlign:"left", fontSize:10, fontWeight:700, color:"var(--text-muted)", background:"rgba(123,94,167,0.06)", borderRadius:"8px 0 0 0" }}>
                        {t("Customer Type","نوع العميل",lang)}
                      </th>
                      {OPERATIONS.map((op,i) => (
                        <th key={op} style={{ padding:"10px 12px", textAlign:"center", fontSize:10, fontWeight:700, color:"#7B5EA7", background:"rgba(123,94,167,0.06)" }}>
                          {lang==="ar"?OPERATIONS_AR[i]:op}
                        </th>
                      ))}
                      <th style={{ padding:"10px 12px", textAlign:"center", fontSize:10, fontWeight:700, color:"#C9A84C", background:"rgba(201,168,76,0.06)" }}>
                        Total / Visit
                      </th>
                      <th style={{ padding:"10px 12px", textAlign:"center", fontSize:10, fontWeight:700, color:"#2EA064", background:"rgba(46,160,100,0.06)" }}>
                        Freq/wk
                      </th>
                      <th style={{ padding:"10px 12px", textAlign:"center", fontSize:10, fontWeight:700, color:"#E07B2A", background:"rgba(224,123,42,0.06)" }}>
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {CUST_TYPES.map((ct, ci) => {
                      const rowTotal = SVC_MATRIX[ci].reduce((s,v)=>s+v, 0);
                      return (
                        <tr key={ct} style={{ borderTop:"1px solid rgba(123,94,167,0.08)" }}>
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <div style={{ width:10, height:10, borderRadius:2, background:typeColor(ct), flexShrink:0 }} />
                              <div>
                                <div style={{ fontSize:11, fontWeight:700, color:"var(--text)" }}>{lang==="ar"?CUST_TYPES_AR[ci]:ct}</div>
                                <div style={{ fontSize:8, color:"var(--text-muted)" }}>{CUST_COUNT[ci]} stores</div>
                              </div>
                            </div>
                          </td>
                          {SVC_MATRIX[ci].map((min, oi) => (
                            <td key={oi} style={{ padding:"8px 12px", textAlign:"center" }}>
                              <div style={{
                                background: svcColor(min), borderRadius:5, padding:"5px 8px", display:"inline-block", minWidth:36,
                              }}>
                                <span style={{ fontSize:13, fontWeight:800, color: svcText(min) }}>
                                  {min===0?"—":`${min}m`}
                                </span>
                              </div>
                            </td>
                          ))}
                          <td style={{ padding:"8px 12px", textAlign:"center" }}>
                            <div style={{ fontSize:15, fontWeight:900, color:"#C9A84C" }}>{rowTotal}m</div>
                            <div style={{ fontSize:8, color:"var(--text-muted)" }}>{(rowTotal/60).toFixed(1)}h</div>
                          </td>
                          <td style={{ padding:"8px 12px", textAlign:"center" }}>
                            <div style={{ fontSize:13, fontWeight:800, color:"#2EA064" }}>{VISIT_WEIGHT[ci]}×</div>
                          </td>
                          <td style={{ padding:"8px 12px", textAlign:"center" }}>
                            <div style={{ fontSize:13, fontWeight:800, color:"#E07B2A" }}>{CUST_COUNT[ci]}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop:"2px solid rgba(123,94,167,0.15)" }}>
                      <td style={{ padding:"10px 14px", fontSize:11, fontWeight:800, color:"var(--text)" }}>WEIGHTED AVG</td>
                      {OPERATIONS.map((op, oi) => {
                        const wavg = Math.round(
                          CUST_TYPES.reduce((s,_,ci) => s + SVC_MATRIX[ci][oi] * CUST_COUNT[ci], 0) /
                          CUST_COUNT.reduce((s,c)=>s+c,0)
                        );
                        return (
                          <td key={op} style={{ padding:"10px 12px", textAlign:"center" }}>
                            <div style={{ fontSize:13, fontWeight:800, color:"#7B5EA7" }}>{wavg}m</div>
                          </td>
                        );
                      })}
                      <td style={{ padding:"10px 12px", textAlign:"center" }}>
                        <div style={{ fontSize:14, fontWeight:900, color:"#C9A84C" }}>24m</div>
                        <div style={{ fontSize:8, color:"var(--text-muted)" }}>avg/stop</div>
                      </td>
                      <td colSpan={2} style={{ padding:"10px 12px", textAlign:"center" }}>
                        <div style={{ fontSize:11, fontWeight:800, color:"var(--text-muted)" }}>
                          {CUST_COUNT.reduce((s,c)=>s+c,0)} total stores
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Window guidelines */}
                <div style={{ marginTop:16, display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                  {[
                    { type:"Supermarket / Wholesale", window:"07:00 — 11:00", note:"Peak delivery window — arrive early", color:"#C9A84C" },
                    { type:"Grocery / Pharmacy",       window:"09:00 — 15:00", note:"Flexible mid-day window",             color:"#2EA064" },
                    { type:"Kiosk / Horeca",            window:"07:00 — 18:00", note:"Open window — sequence by proximity", color:"#7B5EA7" },
                  ].map(w => (
                    <div key={w.type} style={{ background:`${w.color}08`, border:`1px solid ${w.color}22`, borderRadius:8, padding:"10px 12px" }}>
                      <div style={{ fontSize:10, fontWeight:800, color:w.color }}>{w.type}</div>
                      <div style={{ fontSize:16, fontWeight:900, color:"var(--text)", margin:"4px 0" }}>{w.window}</div>
                      <div style={{ fontSize:9, color:"var(--text-muted)" }}>{w.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB 4 — DAY SEQUENCING ENGINE                         */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === "sequence" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16, width:"100%", minWidth:0 }}>

              {/* Optimization info banner */}
              <div style={{ padding:"12px 16px", background:"rgba(76,175,80,0.06)", border:"1px solid rgba(76,175,80,0.2)", borderRadius:8, fontSize:11, color:"var(--text-muted)" }}>
                🔢 <strong style={{color:"#4CAF50"}}>Nearest-Neighbor Heuristic</strong> applied to real GPS coordinates (Haversine distance).
                &nbsp;Toggle 🔴 Before / 🟢 After to see route optimization on the live map.
              </div>


              {/* Google Maps — Day Sequencing */}
              <div style={{ background:"var(--bg-card)", borderRadius:10, border:"1px solid rgba(201,168,76,0.15)", padding:"16px 20px", minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:"#C9A84C", marginBottom:4 }}>
                  🗺️ {t("Route Map — Real Cairo Coordinates","خريطة المسار — إحداثيات القاهرة الحقيقية",lang)}
                </div>
                <div style={{ fontSize:10, color:"var(--text-muted)", marginBottom:12 }}>
                  {t("Ahmed Hassan · Cairo North · Saturday · Nearest-neighbor optimization","أحمد حسن · القاهرة شمال · السبت · تحسين أقرب جار",lang)}
                </div>
                <GoogleMapsPanel mode="route" lang={lang} />
              </div>

              {/* Algorithm note */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                {[
                  { label:"Nearest-Neighbor Heuristic", desc:"From depot, always visit the closest unvisited customer next. O(n²) — fast for daily real-time use.", color:"#2EA064" },
                  { label:"Time-Window Enforcement",    desc:"Customers with tight windows (e.g. Wholesale 07:00–10:00) are prioritized in early sequence positions.", color:"#C9A84C" },
                  { label:"2-opt Post-Processing",      desc:"After initial sequence, swap pairs of edges to eliminate crossings. Reduces distance by further 8–12%.", color:"#7B5EA7" },
                ].map(a => (
                  <div key={a.label} style={{ background:`${a.color}08`, border:`1px solid ${a.color}22`, borderRadius:8, padding:"10px 12px" }}>
                    <div style={{ fontSize:10, fontWeight:800, color:a.color, marginBottom:4 }}>{a.label}</div>
                    <div style={{ fontSize:9, color:"var(--text-muted)", lineHeight:1.6 }}>{a.desc}</div>
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
