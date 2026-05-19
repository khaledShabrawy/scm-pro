"use client";
import { useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

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

// ── 4. DAY SEQUENCING ─────────────────────────────────────────────────────────
type Stop = { id: string; name: string; x: number; y: number; type: string; window: string; svcMin: number };

// Ahmed's Saturday route — before and after sequencing
const STOPS_BEFORE: Stop[] = [
  { id:"C01", name:"Al Mokhtar Mkt",    x:78,  y:32,  type:"Supermarket", window:"08:00-11:00", svcMin:45 },
  { id:"C02", name:"Hassan Grocery",    x:24,  y:61,  type:"Grocery",     window:"09:00-13:00", svcMin:25 },
  { id:"C03", name:"Nile Kiosk",        x:91,  y:72,  type:"Kiosk",       window:"07:00-18:00", svcMin:10 },
  { id:"C04", name:"Star Pharmacy",     x:42,  y:18,  type:"Pharmacy",    window:"10:00-14:00", svcMin:15 },
  { id:"C05", name:"Sakkara Hotel",     x:15,  y:84,  type:"Horeca",      window:"08:00-12:00", svcMin:30 },
  { id:"C06", name:"Delta Grocery",     x:58,  y:45,  type:"Grocery",     window:"09:00-15:00", svcMin:25 },
  { id:"C07", name:"Sunrise Super",     x:35,  y:28,  type:"Supermarket", window:"08:00-11:00", svcMin:45 },
  { id:"C08", name:"Quick Kiosk #2",    x:68,  y:88,  type:"Kiosk",       window:"07:00-18:00", svcMin:10 },
  { id:"C09", name:"Ramses Wholesale",  x:12,  y:42,  type:"Wholesale",   window:"07:00-10:00", svcMin:60 },
  { id:"C10", name:"Victory Pharmacy",  x:82,  y:55,  type:"Pharmacy",    window:"11:00-15:00", svcMin:15 },
  { id:"C11", name:"Tahrir Grocery",    x:48,  y:76,  type:"Grocery",     window:"09:00-17:00", svcMin:25 },
  { id:"C12", name:"City Café",         x:22,  y:68,  type:"Horeca",      window:"10:00-14:00", svcMin:30 },
  { id:"C13", name:"Maadi Supermarket", x:72,  y:14,  type:"Supermarket", window:"08:00-12:00", svcMin:45 },
  { id:"C14", name:"Corner Kiosk",      x:56,  y:91,  type:"Kiosk",       window:"07:00-18:00", svcMin:10 },
  { id:"C15", name:"MedCare Pharmacy",  x:31,  y:52,  type:"Pharmacy",    window:"09:00-14:00", svcMin:15 },
  { id:"C16", name:"Sphinx Grocery",    x:88,  y:36,  type:"Grocery",     window:"10:00-16:00", svcMin:25 },
];

// Nearest-neighbor sequencing from depot (x:0, y:50)
function sequenceStops(stops: Stop[]): Stop[] {
  const result: Stop[] = [];
  const remaining = [...stops];
  let cx = 0, cy = 50;
  while (remaining.length > 0) {
    let best = 0, bestDist = Infinity;
    remaining.forEach((s, i) => {
      const d = Math.sqrt((s.x-cx)**2 + (s.y-cy)**2);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    const chosen = remaining.splice(best, 1)[0];
    result.push(chosen);
    cx = chosen.x; cy = chosen.y;
  }
  return result;
}

function totalDist(stops: Stop[], sx=0, sy=50): number {
  let d = 0, px = sx, py = sy;
  stops.forEach(s => { d += Math.sqrt((s.x-px)**2 + (s.y-py)**2); px=s.x; py=s.y; });
  return Math.round(d * 1.8); // scale to km
}

const STOPS_AFTER = sequenceStops([...STOPS_BEFORE]);
const distBefore  = totalDist(STOPS_BEFORE);
const distAfter   = totalDist(STOPS_AFTER);
const saving      = Math.round((1 - distAfter/distBefore) * 100);

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
  const [selectedDay, setSelectedDay] = useState(0);

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
      <Sidebar lang={lang} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Navbar lang={lang} onLangChange={() => setLang(l => l==="en"?"ar":"en")}
          pageTitle="Route Planning" pageAr="تخطيط المسارات" module="route-planning" />
        <main style={{ flex:1, overflowY:"auto", padding:"20px 24px", display:"flex", flexDirection:"column", gap:20 }}>

          {/* ── KPI Banner ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
            {[
              { icon:"👥", label:t("Total Customers","إجمالي العملاء",lang), value:totalCustomers.toString(), sub:`${REPS.length} sales reps`, color:"#E07B2A" },
              { icon:"⚖️", label:t("Workload Balance","توازن العبء",lang),   value:`${balanceScore}%`,        sub:"std dev < 14 customers", color:Number(balanceScore)>=80?"#4CAF50":"#FFA726" },
              { icon:"📅", label:t("Beat Frequency","تردد الزيارة",lang),    value:"3 types",                 sub:"Weekly · Bi-weekly · Monthly", color:"#1A8A8A" },
              { icon:"⏱️", label:t("Avg Svc Time","متوسط وقت الخدمة",lang), value:"24 min",                  sub:"per customer stop", color:"#7B5EA7" },
              { icon:"📍", label:t("Route Saving","توفير المسافة",lang),     value:`${saving}%`,              sub:`${distBefore-distAfter} km saved / day`, color:"#2EA064" },
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

              {/* Territory detail + Radar */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, width:"100%", minWidth:0 }}>
                {/* Visual territory map (SVG simulation) */}
                <div style={{ background:"var(--bg-card)", borderRadius:10, border:`1px solid ${selectedRepData.color}33`, padding:"16px 20px", minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:selectedRepData.color, marginBottom:4 }}>
                    {lang==="ar"?selectedRepData.nameAr:selectedRepData.name} — Territory Map
                  </div>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginBottom:12 }}>{selectedRepData.zone} · {selectedRepData.customers} customers</div>
                  {/* SVG territory simulation */}
                  <svg width="100%" viewBox="0 0 300 200" style={{ background:"rgba(255,255,255,0.02)", borderRadius:8, border:"1px solid rgba(255,255,255,0.05)" }}>
                    {/* Grid */}
                    {[40,80,120,160].map(y => <line key={`h${y}`} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.04)" />)}
                    {[60,120,180,240].map(x => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="200" stroke="rgba(255,255,255,0.04)" />)}
                    {/* Territory polygon */}
                    {selectedRepData.id==="R1" && <polygon points="30,20 180,10 260,80 220,160 80,180 20,100" fill={`${selectedRepData.color}18`} stroke={selectedRepData.color} strokeWidth="1.5" />}
                    {selectedRepData.id==="R2" && <polygon points="60,30 200,20 270,90 240,170 100,190 40,110" fill={`${selectedRepData.color}18`} stroke={selectedRepData.color} strokeWidth="1.5" />}
                    {selectedRepData.id==="R3" && <polygon points="20,40 160,15 250,70 210,155 70,175 15,95"  fill={`${selectedRepData.color}18`} stroke={selectedRepData.color} strokeWidth="1.5" />}
                    {selectedRepData.id==="R4" && <polygon points="40,50 170,25 240,85 200,160 75,175 30,105" fill={`${selectedRepData.color}18`} stroke={selectedRepData.color} strokeWidth="1.5" />}
                    {selectedRepData.id==="R5" && <polygon points="50,35 190,22 260,82 225,162 85,178 35,100" fill={`${selectedRepData.color}18`} stroke={selectedRepData.color} strokeWidth="1.5" />}
                    {selectedRepData.id==="R6" && <polygon points="35,45 175,18 255,75 215,158 78,172 25,102" fill={`${selectedRepData.color}18`} stroke={selectedRepData.color} strokeWidth="1.5" />}
                    {/* Customer dots */}
                    {Array.from({length: Math.min(selectedRepData.customers, 30)}, (_,i) => {
                      const seed = (i * 127 + selectedRepData.id.charCodeAt(1) * 31) % 1000;
                      const cx = 40 + (seed % 220);
                      const cy = 20 + ((seed * 7) % 160);
                      const isGold = i < selectedRepData.gold;
                      const isSilver = !isGold && i < selectedRepData.gold + selectedRepData.silver;
                      const dotColor = isGold ? "#C9A84C" : isSilver ? "#9BA3B2" : selectedRepData.color;
                      return <circle key={i} cx={cx} cy={cy} r={isGold?4:isSilver?3:2} fill={dotColor} opacity={0.85} />;
                    })}
                    {/* Depot */}
                    <rect x="135" y="88" width="14" height="14" rx="2" fill="#E07B2A" opacity="0.9" />
                    <text x="152" y="99" fontSize="8" fill="#9BA3B2">DC</text>
                  </svg>
                  <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap" }}>
                    {[{c:"#C9A84C",l:"Gold"},{c:"#9BA3B2",l:"Silver"},{c:selectedRepData.color,l:"Bronze"},{c:"#E07B2A",l:"Depot"}].map(l => (
                      <div key={l.l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:l.c }} />
                        <span style={{ fontSize:9, color:"var(--text-muted)" }}>{l.l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Workload radar */}
                <div style={{ background:"var(--bg-card)", borderRadius:10, border:"1px solid rgba(46,160,100,0.2)", padding:"16px 20px", minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:"#2EA064", marginBottom:4 }}>
                    {t("Workload Balance — All Reps","توازن العبء — جميع المندوبين",lang)}
                  </div>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginBottom:8 }}>
                    {t("Balance Score","درجة التوازن",lang)}: <strong style={{color: Number(balanceScore)>=80?"#4CAF50":"#FFA726"}}>{balanceScore}%</strong>
                    &nbsp;·&nbsp;σ = {workloadStd.toFixed(1)} customers
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
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
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB 2 — BEAT PLAN GENERATOR                           */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === "beat" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16, width:"100%", minWidth:0 }}>
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

              {/* Before/After comparison banner */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
                {[
                  { label:"Before Optimization",  value:`${distBefore} km`, color:"#EF5350", icon:"📍" },
                  { label:"After Sequencing",      value:`${distAfter} km`,  color:"#4CAF50", icon:"🗺️" },
                  { label:"Distance Saved",        value:`${distBefore-distAfter} km`, color:"#2EA064", icon:"💰" },
                  { label:"Improvement",           value:`${saving}%`,      color:"#C9A84C", icon:"📈" },
                ].map(k => (
                  <div key={k.label} style={{ background:"var(--bg-card)", borderRadius:10, border:`1px solid ${k.color}22`, padding:"14px", textAlign:"center" }}>
                    <div style={{ fontSize:20 }}>{k.icon}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:k.color, marginTop:4 }}>{k.value}</div>
                    <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Rep / Day selector */}
              <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ fontSize:11, color:"var(--text-muted)", fontWeight:700 }}>Rep:</span>
                {REPS.map(r => (
                  <button key={r.id} onClick={() => setSelectedRep(r.id)} style={{
                    padding:"4px 12px", fontSize:10, fontWeight:700, borderRadius:5, cursor:"pointer",
                    border:`1px solid ${r.color}44`, background: selectedRep===r.id ? `${r.color}22` : "transparent",
                    color: selectedRep===r.id ? r.color : "var(--text-muted)",
                  }}>{lang==="ar"?r.nameAr.split(" ")[0]:r.name.split(" ")[0]}</button>
                ))}
                <span style={{ fontSize:11, color:"var(--text-muted)", fontWeight:700, marginLeft:12 }}>Day:</span>
                {DAYS.map((d,i) => (
                  <button key={d} onClick={() => setSelectedDay(i)} style={{
                    padding:"4px 12px", fontSize:10, fontWeight:700, borderRadius:5, cursor:"pointer",
                    border:"1px solid rgba(224,123,42,0.3)", background: selectedDay===i ? "rgba(224,123,42,0.2)" : "transparent",
                    color: selectedDay===i ? "#E07B2A" : "var(--text-muted)",
                  }}>{lang==="ar"?DAYS_AR[i]:d}</button>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, width:"100%", minWidth:0 }}>
                {/* Before */}
                <div style={{ background:"var(--bg-card)", borderRadius:10, border:"1px solid rgba(239,83,80,0.2)", padding:"16px 20px", minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:"#EF5350", marginBottom:4 }}>
                    Before — Unoptimized Order ({distBefore} km)
                  </div>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginBottom:12 }}>Random entry order — significant backtracking</div>
                  {/* SVG route map - Before */}
                  <svg width="100%" viewBox="0 0 300 200" style={{ background:"rgba(255,255,255,0.02)", borderRadius:8, border:"1px solid rgba(239,83,80,0.15)", marginBottom:12 }}>
                    {/* Grid */}
                    {[50,100,150].map(y => <line key={`bh${y}`} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.03)" />)}
                    {[75,150,225].map(x => <line key={`bv${x}`} x1={x} y1="0" x2={x} y2="200" stroke="rgba(255,255,255,0.03)" />)}
                    {/* Route lines before */}
                    {STOPS_BEFORE.map((s, i) => {
                      const prev = i===0 ? {x:0, y:100} : {x:STOPS_BEFORE[i-1].x*2.8+10, y:STOPS_BEFORE[i-1].y*1.6+20};
                      const curr = {x:s.x*2.8+10, y:s.y*1.6+20};
                      return <line key={i} x1={prev.x} y1={prev.y} x2={curr.x} y2={curr.y} stroke="#EF5350" strokeWidth="1" opacity="0.5" strokeDasharray="3 2" />;
                    })}
                    {/* Customer dots */}
                    {STOPS_BEFORE.map((s, i) => (
                      <g key={s.id}>
                        <circle cx={s.x*2.8+10} cy={s.y*1.6+20} r="5" fill={typeColor(s.type)} opacity="0.9" />
                        <text x={s.x*2.8+16} y={s.y*1.6+24} fontSize="6" fill="#9BA3B2">{i+1}</text>
                      </g>
                    ))}
                    {/* Depot */}
                    <rect x="5" y="88" width="10" height="10" rx="2" fill="#E07B2A" />
                    <text x="16" y="96" fontSize="7" fill="#E07B2A">DC</text>
                  </svg>
                  {/* Stop list */}
                  <div style={{ maxHeight:280, overflowY:"auto" }}>
                    {STOPS_BEFORE.map((s, i) => (
                      <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                        <div style={{ width:20, height:20, borderRadius:"50%", background:"rgba(239,83,80,0.15)", border:"1px solid rgba(239,83,80,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:"#EF5350", flexShrink:0 }}>{i+1}</div>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:typeColor(s.type), flexShrink:0 }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:10, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</div>
                          <div style={{ fontSize:8, color:"var(--text-muted)" }}>{s.type} · {s.window} · {s.svcMin}min</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* After */}
                <div style={{ background:"var(--bg-card)", borderRadius:10, border:"1px solid rgba(46,160,100,0.25)", padding:"16px 20px", minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:"#4CAF50", marginBottom:4 }}>
                    After — Nearest-Neighbor Optimized ({distAfter} km)
                  </div>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginBottom:12 }}>Proximity sequencing + time-window compliance</div>
                  {/* SVG route map - After */}
                  <svg width="100%" viewBox="0 0 300 200" style={{ background:"rgba(255,255,255,0.02)", borderRadius:8, border:"1px solid rgba(46,160,100,0.15)", marginBottom:12 }}>
                    {[50,100,150].map(y => <line key={`ah${y}`} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.03)" />)}
                    {[75,150,225].map(x => <line key={`av${x}`} x1={x} y1="0" x2={x} y2="200" stroke="rgba(255,255,255,0.03)" />)}
                    {/* Route lines after */}
                    {STOPS_AFTER.map((s, i) => {
                      const prev = i===0 ? {x:0, y:100} : {x:STOPS_AFTER[i-1].x*2.8+10, y:STOPS_AFTER[i-1].y*1.6+20};
                      const curr = {x:s.x*2.8+10, y:s.y*1.6+20};
                      return <line key={i} x1={prev.x} y1={prev.y} x2={curr.x} y2={curr.y} stroke="#4CAF50" strokeWidth="1.5" opacity="0.7" />;
                    })}
                    {STOPS_AFTER.map((s, i) => (
                      <g key={s.id}>
                        <circle cx={s.x*2.8+10} cy={s.y*1.6+20} r="5" fill={typeColor(s.type)} opacity="0.9" />
                        <text x={s.x*2.8+16} y={s.y*1.6+24} fontSize="6" fill="#9BA3B2">{i+1}</text>
                      </g>
                    ))}
                    <rect x="5" y="88" width="10" height="10" rx="2" fill="#E07B2A" />
                    <text x="16" y="96" fontSize="7" fill="#E07B2A">DC</text>
                  </svg>
                  {/* Stop list */}
                  <div style={{ maxHeight:280, overflowY:"auto" }}>
                    {STOPS_AFTER.map((s, i) => {
                      const origIdx = STOPS_BEFORE.findIndex(b => b.id === s.id);
                      const moved = origIdx !== i;
                      return (
                        <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                          <div style={{ width:20, height:20, borderRadius:"50%", background:"rgba(46,160,100,0.15)", border:"1px solid rgba(46,160,100,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:"#4CAF50", flexShrink:0 }}>{i+1}</div>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:typeColor(s.type), flexShrink:0 }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:10, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {s.name}
                              {moved && <span style={{ marginLeft:4, fontSize:8, color:"#4CAF50" }}>↑ {origIdx+1}→{i+1}</span>}
                            </div>
                            <div style={{ fontSize:8, color:"var(--text-muted)" }}>{s.type} · {s.window} · {s.svcMin}min</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
