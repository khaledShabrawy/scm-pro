"use client";
import { useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";
import { holtWinters, wmape, trackingSignal, bias } from "@/lib/apics-algorithms";
import { DEFAULT_ALERTS } from "@/lib/notifications";

// ─── Mock historical data (12 months actual) ─────────────
const ACTUAL = [28400,31200,35800,42100,38600,44200,51800,48900,43200,39800,45600,52300];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
                "Jan'","Feb'","Mar'","Apr'","May'","Jun'"];

// Generate forecasts
function genForecast(alpha=0.3,beta=0.15,gamma=0.42) {
  const hw = holtWinters(ACTUAL, alpha, beta, gamma, 12);
  // project 6 more months
  const last = hw[hw.length-1];
  const proj = [last*1.03,last*1.06,last*1.09,last*1.05,last*1.08,last*1.12];
  return [...hw, ...proj];
}

const ALGORITHMS = [
  { id:"ses",   name:"Simple Exp. Smoothing",  nameAr:"تمهيد أسي بسيط",     mape:18.4, bias:3.2,  status:"Standby", color:"#9BA3B2" },
  { id:"holt",  name:"Holt's Double Exp.",      nameAr:"هولت المزدوج",         mape:15.1, bias:2.1,  status:"Standby", color:"#9BA3B2" },
  { id:"hw",    name:"Holt-Winters Seasonal",   nameAr:"هولت-وينترز الموسمي", mape:13.2, bias:1.9,  status:"Running", color:"#66BB6A" },
  { id:"arima", name:"ARIMA / SARIMA",           nameAr:"أريما الموسمي",       mape:12.8, bias:1.4,  status:"Running", color:"#66BB6A" },
  { id:"crost", name:"Croston (Intermittent)",  nameAr:"كروستون - طلب متقطع",  mape:null, bias:null, status:"Standby", color:"#9BA3B2" },
  { id:"xgb",   name:"XGBoost ML",              nameAr:"XGBoost تعلم آلي",    mape:10.9, bias:0.8,  status:"Running", color:"#66BB6A" },
  { id:"lstm",  name:"LSTM Neural Network",     nameAr:"شبكة LSTM",            mape:11.3, bias:1.1,  status:"Running", color:"#66BB6A" },
  { id:"ens",   name:"ENSEMBLE (All Models)",   nameAr:"النموذج المجمّع",      mape:9.8,  bias:0.6,  status:"Active",  color:"#C9A84C", best:true },
];

const ABC_XYZ = [
  { seg:"AX", count:847,  value:"EGP 28.4M", strategy:"Statistical + High SL",  strategyAr:"إحصائي + مستوى خدمة عالٍ", bg:"rgba(46,160,100,0.15)", border:"rgba(46,160,100,0.4)" },
  { seg:"AY", count:1203, value:"EGP 18.2M", strategy:"ML Model + Calc SS",     strategyAr:"نموذج ML + مخزون أمان محسوب",bg:"rgba(46,160,100,0.08)", border:"rgba(46,160,100,0.3)" },
  { seg:"AZ", count:234,  value:"EGP 15.8M", strategy:"Croston + Flex Supply",  strategyAr:"كروستون + إمداد مرن",         bg:"rgba(224,123,42,0.1)",  border:"rgba(224,123,42,0.35)"},
  { seg:"BX", count:623,  value:"EGP 6.1M",  strategy:"SES / Holt",             strategyAr:"تمهيد أسي",                   bg:"rgba(96,184,212,0.08)", border:"rgba(96,184,212,0.25)"},
  { seg:"BY", count:891,  value:"EGP 5.8M",  strategy:"Holt-Winters",           strategyAr:"هولت-وينترز",                 bg:"rgba(96,184,212,0.06)", border:"rgba(96,184,212,0.2)" },
  { seg:"BZ", count:312,  value:"EGP 2.1M",  strategy:"Croston SBA",            strategyAr:"كروستون SBA",                  bg:"rgba(201,168,76,0.06)", border:"rgba(201,168,76,0.2)" },
  { seg:"CX", count:445,  value:"EGP 0.8M",  strategy:"Min-Max",                strategyAr:"الحد الأدنى-الأقصى",          bg:"rgba(155,163,178,0.05)",border:"rgba(155,163,178,0.15)"},
  { seg:"CY", count:189,  value:"EGP 0.4M",  strategy:"Periodic Review",        strategyAr:"مراجعة دورية",                bg:"rgba(155,163,178,0.04)",border:"rgba(155,163,178,0.12)"},
  { seg:"CZ", count:103,  value:"EGP 0.2M",  strategy:"⚠ Phase-Out Review",    strategyAr:"⚠ مراجعة للإيقاف",           bg:"rgba(229,115,115,0.1)", border:"rgba(229,115,115,0.35)"},
];

const ERROR_HEAT = [
  { cat:"Beverages",     data:[8.2,9.1,11.3,7.8,8.9,10.2,9.4,8.6,11.8,9.2,8.4,7.9] },
  { cat:"Dairy",         data:[12.4,14.2,18.7,11.9,13.5,16.1,14.8,12.3,19.2,13.8,12.1,11.4]},
  { cat:"Snacks",        data:[9.8,10.6,12.4,8.9,9.7,11.8,10.3,9.1,13.2,10.4,9.2,8.7]},
  { cat:"Confectionery", data:[7.4,8.2,9.8,6.9,7.8,9.1,8.4,7.2,10.6,8.1,7.4,6.8]},
  { cat:"Home Care",     data:[15.2,17.8,22.4,14.3,16.8,19.7,17.2,14.9,23.8,16.4,14.8,13.9]},
  { cat:"Personal Care", data:[11.3,12.8,15.6,10.7,11.9,13.8,12.4,11.1,16.4,12.1,11.0,10.3]},
];
const MONTHS_SHORT = ["J","F","M","A","M","J","J","A","S","O","N","D"];

function heatColor(v: number) {
  if (v < 10) return "rgba(46,160,100,0.7)";
  if (v < 15) return "rgba(255,183,77,0.7)";
  if (v < 20) return "rgba(224,123,42,0.7)";
  return "rgba(229,115,115,0.8)";
}

const TOP_DEVIATIONS = [
  { sku:"Pepsi 600ml",    actual:45200, forecast:38100, err:18.6, dir:"+" },
  { sku:"Dairy Mix 1L",   actual:12800, forecast:15200, err:-15.8,dir:"-" },
  { sku:"Chips 50g",      actual:28900, forecast:22400, err:29.0, dir:"+" },
  { sku:"Juice 250ml",    actual:9200,  forecast:11000, err:-16.4,dir:"-" },
  { sku:"Water 1.5L",     actual:67400, forecast:58200, err:15.8, dir:"+" },
];

export default function DemandPage() {
  const [lang, setLang] = useState<"en"|"ar">("en");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unit, setUnit] = useState<"units"|"revenue">("units");
  const [selAlgo, setSelAlgo] = useState("ens");

  const forecast = useMemo(() => genForecast(), []);

  const chartData = MONTHS.map((m, i) => ({
    month: m,
    actual:   i < 12 ? ACTUAL[i]           : null,
    forecast: i < 12 ? Math.round(forecast[i]) : Math.round(forecast[i]),
    lastYear: i < 12 ? Math.round(ACTUAL[i] * 0.88) : null,
    upper:    Math.round((forecast[i] ?? 0) * 1.12),
    lower:    Math.round((forecast[i] ?? 0) * 0.88),
  }));

  const wmapeVal = wmape(ACTUAL, forecast.slice(0,12)).toFixed(1);
  const tsVal    = trackingSignal(ACTUAL, forecast.slice(0,12)).toFixed(2);
  const biasVal  = bias(ACTUAL, forecast.slice(0,12)).toFixed(0);

  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:"var(--bg-primary)" }}>
      <Sidebar lang={lang} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Navbar
          lang={lang}
          onLangChange={() => setLang(l => l==="en"?"ar":"en")}
          pageTitle="Demand Planning"
          pageAr="تخطيط الطلب"
          module="demand"
          exportData={chartData.map(d => ({ Month: d.month, "Actual Units": d.actual ?? "", "Forecast (HW)": d.forecast, "Last Year": d.lastYear ?? "" }))}
          exportFilename="demand-forecast"
          alerts={DEFAULT_ALERTS}
          onMenuToggle={() => setSidebarOpen(o => !o)}
        />
        <main style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>

          {/* ── Page Header ── */}
          <div style={{
            background:"linear-gradient(135deg,#1A0E05 0%,#0A0E1A 100%)",
            border:"1px solid rgba(224,123,42,0.2)",
            borderRadius:10, padding:"16px 20px", marginBottom:16,
            display:"flex", alignItems:"center", justifyContent:"space-between"
          }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:900, color:"var(--text)", margin:0 }}>
                {t("Demand Planning & AI Forecasting","تخطيط الطلب والتنبؤ بالذكاء الاصطناعي")}
              </h1>
              <p style={{ fontSize:11.5, color:"var(--text-muted)", margin:"4px 0 0" }}>
                {t("APICS CPIM V8.1 • 8 Algorithm Models • Ensemble ML Active",
                   "معيار APICS V8.1 • 8 نماذج تنبؤ • نموذج Ensemble نشط")}
              </p>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {[
                { label:"● Live",         color:"var(--green-light)", bg:"rgba(46,160,100,0.12)" },
                { label:"Auto-Refresh 5m",color:"var(--blue-light)", bg:"rgba(96,184,212,0.1)" },
                { label:"Egypt & MENA",   color:"var(--gold)",       bg:"rgba(201,168,76,0.1)"  },
              ].map(b => (
                <span key={b.label} style={{
                  fontSize:10.5, fontWeight:700, padding:"4px 10px", borderRadius:20,
                  color:b.color, background:b.bg, border:`1px solid ${b.color}33`
                }}>{b.label}</span>
              ))}
            </div>
          </div>

          {/* ── KPI Row ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:14 }}>
            {[
              { label: t("FORECAST ACCURACY (WMAPE)","دقة التنبؤ (WMAPE)"),
                value: `${100-Number(wmapeVal)}%`, color:"var(--orange)",
                sub: t(`vs Target 85% — APICS MAD: ${(Number(wmapeVal)*0.8).toFixed(0)}`,`الهدف 85% — MAD: ${(Number(wmapeVal)*0.8).toFixed(0)}`),
                warn: Number(wmapeVal) > 15 },
              { label: t("FORECAST BIAS (MPE)","انحياز التنبؤ"),
                value: `+${(Number(biasVal)/1000).toFixed(1)}%`, color:"var(--orange)",
                sub: t("Over-forecasting — TS: "+tsVal,"فوق التقدير — TS: "+tsVal),
                warn: Math.abs(Number(tsVal)) > 4 },
              { label: t("ACTIVE SKUs FORECASTED","SKUs نشطة"),
                value: "4,847", color:"var(--text)",
                sub: t("● 99.2% coverage","● تغطية 99.2%"), warn:false },
              { label: t("TOTAL DEMAND — THIS MONTH","إجمالي الطلب هذا الشهر"),
                value: "EGP 38.4M", color:"var(--gold)",
                sub: t("▲ +12.3% vs SPLY","▲ +12.3% مقارنة بالسنة السابقة"), warn:false },
              { label: t("ACTIVE PROMOTIONS","العروض الترويجية"),
                value: "8", color:"var(--blue-light)",
                sub: t("+23% avg demand lift","+23% رفع متوسط الطلب"), warn:false },
              { label: t("NEW PRODUCT FORECASTS","توقعات المنتجات الجديدة"),
                value: "23", color:"var(--purple-light)",
                sub: t("NPI models active","نماذج NPI نشطة"), warn:false },
            ].map((k,i) => (
              <div key={i} className="card" style={{ padding:"12px 14px" }}>
                <div style={{ fontSize:9.5, color:"var(--text-muted)", fontWeight:700, textTransform:"uppercase", marginBottom:6, lineHeight:1.3 }}>{k.label}</div>
                <div className="kpi-number" style={{ color:k.color, fontSize:"1.8rem" }}>{k.value}</div>
                <div style={{ fontSize:10, color: k.warn ? "var(--red)" : "var(--text-muted)", marginTop:5 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Main: Chart + Algorithm Panel ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:12, marginBottom:12 }}>

            {/* Forecast Chart */}
            <div className="card" style={{ padding:"14px 16px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:14, color:"var(--text)" }}>
                    {t("Demand Forecast vs Actuals","التنبؤ بالطلب مقارنة بالفعلي")}
                  </div>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>
                    {t("APICS Tracking Signal: ","إشارة التتبع APICS: ")}{tsVal}
                    {Math.abs(Number(tsVal)) > 4
                      ? <span style={{color:"var(--red)",marginLeft:4}}>⚠ Bias Alert</span>
                      : <span style={{color:"var(--green-light)",marginLeft:4}}>✓ In Control</span>}
                  </div>
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  {(["units","revenue"] as const).map(u => (
                    <button key={u} onClick={() => setUnit(u)} style={{
                      padding:"3px 10px", borderRadius:6, fontSize:10.5, fontWeight:700,
                      background: unit===u ? "var(--orange)" : "transparent",
                      color: unit===u ? "#0A0E1A" : "var(--text-muted)",
                      border: `1px solid ${unit===u ? "var(--orange)" : "rgba(255,255,255,0.1)"}`,
                      cursor:"pointer"
                    }}>{u === "units" ? t("Units","وحدات") : t("Revenue","إيرادات")}</button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top:5, right:10, bottom:5, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize:9, fill:"var(--text-muted)" }} />
                  <YAxis tick={{ fontSize:9, fill:"var(--text-muted)" }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:6, fontSize:11 }}
                    labelStyle={{ color:"var(--text)", fontWeight:700 }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
                  <ReferenceLine x="May" stroke="var(--orange)" strokeDasharray="4 2" label={{ value:"Today", fill:"var(--orange)", fontSize:9 }} />
                  <Line dataKey="actual"   name={t("Actual","الفعلي")}   stroke="var(--text)"        strokeWidth={2} dot={false} connectNulls={false} />
                  <Line dataKey="forecast" name={t("Forecast (HW)","التنبؤ")}stroke="var(--orange)" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  <Line dataKey="lastYear" name={t("Last Year","العام السابق")} stroke="rgba(155,163,178,0.5)" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Algorithm Selector */}
            <div className="card" style={{ padding:"14px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ fontWeight:800, fontSize:13, color:"var(--text)" }}>
                  {t("Algorithm Selector","محدد الخوارزمية")}
                </div>
                <span style={{
                  fontSize:9.5, fontWeight:700, padding:"2px 7px", borderRadius:20,
                  background:"rgba(46,160,100,0.15)", color:"var(--green-light)",
                  border:"1px solid rgba(46,160,100,0.3)"
                }}>● Auto-Best</span>
              </div>

              {/* Header */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 52px 48px 56px", gap:4, marginBottom:4, padding:"0 4px" }}>
                {[t("Algorithm","الخوارزمية"), "MAPE", "Bias", t("Status","الحالة")].map(h => (
                  <div key={h} style={{ fontSize:9, color:"var(--text-muted)", fontWeight:700, textTransform:"uppercase" }}>{h}</div>
                ))}
              </div>

              {ALGORITHMS.map(alg => (
                <div key={alg.id} onClick={() => setSelAlgo(alg.id)} style={{
                  display:"grid", gridTemplateColumns:"1fr 52px 48px 56px", gap:4,
                  padding:"6px 4px", borderRadius:6, cursor:"pointer", marginBottom:1,
                  background: alg.best
                    ? "rgba(201,168,76,0.08)"
                    : selAlgo===alg.id ? "rgba(255,255,255,0.04)" : "transparent",
                  borderLeft: alg.best ? "2px solid var(--gold)" : selAlgo===alg.id ? "2px solid var(--blue-light)" : "2px solid transparent",
                }}>
                  <div style={{ fontSize:10.5, color: alg.best ? "var(--gold)" : "var(--text)", fontWeight: alg.best ? 700 : 500 }}>
                    {lang==="ar" ? alg.nameAr : alg.name}
                  </div>
                  <div style={{ fontSize:10.5, color: alg.mape ? (alg.mape<12?"var(--green-light)":alg.mape<15?"var(--orange)":"var(--text-muted)") : "var(--text-muted)" }}>
                    {alg.mape ? `${alg.mape}%` : "—"}
                  </div>
                  <div style={{ fontSize:10.5, color:"var(--text-muted)" }}>
                    {alg.bias ? `+${alg.bias}%` : "—"}
                  </div>
                  <div style={{ fontSize:9.5 }}>
                    <span style={{
                      padding:"2px 5px", borderRadius:4, fontWeight:700,
                      background: alg.status==="Active" ? "rgba(201,168,76,0.15)" :
                                  alg.status==="Running" ? "rgba(46,160,100,0.12)" : "rgba(155,163,178,0.08)",
                      color: alg.status==="Active" ? "var(--gold)" :
                             alg.status==="Running" ? "var(--green-light)" : "var(--text-muted)"
                    }}>{alg.status==="Active"?"★ "+alg.status:alg.status}</span>
                  </div>
                </div>
              ))}

              <div style={{ marginTop:10, padding:"8px 10px", borderRadius:6, background:"rgba(201,168,76,0.06)", border:"1px solid rgba(201,168,76,0.2)" }}>
                <div style={{ fontSize:9.5, color:"var(--gold)", fontWeight:700, marginBottom:4 }}>
                  {t("APICS MAD Formula","معادلة MAD — APICS")}
                </div>
                <div style={{ fontSize:9, color:"var(--text-muted)", fontFamily:"monospace" }}>
                  MAD = Σ|A-F| / n = <span style={{color:"var(--orange)"}}>{(Number(wmapeVal) * 420).toFixed(0)} units</span>
                </div>
                <div style={{ fontSize:9, color:"var(--text-muted)", fontFamily:"monospace", marginTop:2 }}>
                  TS = RSFE / MAD = <span style={{ color: Math.abs(Number(tsVal))>4 ? "var(--red)" : "var(--green-light)" }}>{tsVal}</span>
                  {Math.abs(Number(tsVal)) > 4 && <span style={{color:"var(--red)"}}> ⚠ Bias!</span>}
                </div>
                <div style={{ fontSize:9, color:"var(--text-muted)", fontFamily:"monospace", marginTop:2 }}>
                  WMAPE = Σ|A-F| / ΣA = <span style={{color:"var(--orange)"}}>{wmapeVal}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom: ABC-XYZ + Heatmap + Top Deviations ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 300px", gap:12 }}>

            {/* ABC-XYZ Matrix */}
            <div className="card" style={{ padding:"14px" }}>
              <div style={{ fontWeight:800, fontSize:13, color:"var(--text)", marginBottom:4 }}>
                {t("ABC-XYZ Segmentation — APICS","تصنيف ABC-XYZ — APICS")}
              </div>
              <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                {[["A","80% Value","var(--green-light)"],["B","15% Value","var(--blue-light)"],["C","5% Value","var(--text-muted)"]].map(([l,d,c])=>(
                  <span key={l} style={{ fontSize:9, padding:"2px 7px", borderRadius:4, fontWeight:700,
                    background:`${c}22`, color:c as string, border:`1px solid ${c}44` }}>{l}: {d}</span>
                ))}
              </div>
              {/* 3×3 grid headers */}
              <div style={{ display:"grid", gridTemplateColumns:"60px 1fr 1fr 1fr", gap:3, marginBottom:3 }}>
                <div/>
                {["X (CV<0.5)","Y (0.5-1.0)","Z (CV>1.0)"].map(h=>(
                  <div key={h} style={{ fontSize:8.5, color:"var(--text-muted)", fontWeight:700, textAlign:"center" }}>{h}</div>
                ))}
              </div>
              {["A","B","C"].map((abc,ri) => (
                <div key={abc} style={{ display:"grid", gridTemplateColumns:"60px 1fr 1fr 1fr", gap:3, marginBottom:3 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:"var(--text-muted)", display:"flex", alignItems:"center" }}>{abc}</div>
                  {["X","Y","Z"].map(xyz => {
                    const seg = ABC_XYZ.find(s=>s.seg===`${abc}${xyz}`)!;
                    return (
                      <div key={xyz} style={{
                        padding:"5px 6px", borderRadius:5, textAlign:"center",
                        background:seg.bg, border:`1px solid ${seg.border}`
                      }}>
                        <div style={{ fontSize:11, fontWeight:800, color:"var(--text)" }}>{seg.count.toLocaleString()}</div>
                        <div style={{ fontSize:8, color:"var(--text-muted)" }}>{seg.value}</div>
                        <div style={{ fontSize:7.5, color:"var(--text-muted)", marginTop:1 }}>
                          {lang==="ar" ? seg.strategyAr : seg.strategy}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{ fontSize:9, color:"var(--text-muted)", marginTop:6, textAlign:"right" }}>
                {t("Total: 4,847 SKUs | EGP 77.8M","إجمالي: 4,847 SKU | EGP 77.8M")}
              </div>
            </div>

            {/* Error Heatmap */}
            <div className="card" style={{ padding:"14px" }}>
              <div style={{ fontWeight:800, fontSize:13, color:"var(--text)", marginBottom:4 }}>
                {t("MAPE Heatmap — by Category × Month","خريطة حرارية MAPE — فئة × شهر")}
              </div>
              <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                {[["<10% ✓","rgba(46,160,100,0.7)"],["10-15%","rgba(255,183,77,0.7)"],["15-20%","rgba(224,123,42,0.7)"],[">20% ✗","rgba(229,115,115,0.8)"]].map(([l,c])=>(
                  <span key={l} style={{ fontSize:8.5, display:"flex", alignItems:"center", gap:3, color:"var(--text-muted)" }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:c, display:"inline-block" }}/>
                    {l}
                  </span>
                ))}
              </div>
              {/* Month headers */}
              <div style={{ display:"grid", gridTemplateColumns:"90px repeat(12,1fr)", gap:2, marginBottom:2 }}>
                <div/>
                {MONTHS_SHORT.map((m,i)=><div key={i} style={{ fontSize:7.5, color:"var(--text-muted)", textAlign:"center", fontWeight:700 }}>{m}</div>)}
              </div>
              {ERROR_HEAT.map(row => (
                <div key={row.cat} style={{ display:"grid", gridTemplateColumns:"90px repeat(12,1fr)", gap:2, marginBottom:2 }}>
                  <div style={{ fontSize:9, color:"var(--text-muted)", display:"flex", alignItems:"center" }}>{row.cat}</div>
                  {row.data.map((v,i) => (
                    <div key={i} style={{
                      borderRadius:3, background:heatColor(v), height:22,
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      <span style={{ fontSize:7.5, fontWeight:700, color:"rgba(255,255,255,0.9)" }}>{v.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Top Deviations */}
            <div className="card" style={{ padding:"14px" }}>
              <div style={{ fontWeight:800, fontSize:13, color:"var(--text)", marginBottom:10 }}>
                {t("Top Deviations — Action Required","أكبر الانحرافات — تحتاج إجراء")}
              </div>
              {TOP_DEVIATIONS.map((d,i) => (
                <div key={i} style={{
                  padding:"8px 10px", borderRadius:6, marginBottom:6,
                  background: Math.abs(d.err) > 20 ? "rgba(229,115,115,0.07)" : "rgba(255,183,77,0.06)",
                  border: `1px solid ${Math.abs(d.err)>20 ? "rgba(229,115,115,0.25)" : "rgba(255,183,77,0.2)"}`,
                }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:10.5, fontWeight:700, color:"var(--text)" }}>{d.sku}</span>
                    <span style={{
                      fontSize:10, fontWeight:800, padding:"1px 6px", borderRadius:4,
                      background: Math.abs(d.err)>20 ? "rgba(229,115,115,0.15)" : "rgba(255,183,77,0.15)",
                      color: Math.abs(d.err)>20 ? "var(--red)" : "var(--orange)"
                    }}>{d.dir}{Math.abs(d.err)}%</span>
                  </div>
                  <div style={{ fontSize:9, color:"var(--text-muted)" }}>
                    {t("Actual","الفعلي")}: <span style={{color:"var(--text)"}}>{d.actual.toLocaleString()}</span>
                    {" | "}{t("Forecast","التنبؤ")}: <span style={{color:"var(--text)"}}>{d.forecast.toLocaleString()}</span>
                  </div>
                  <button style={{
                    marginTop:5, fontSize:9.5, fontWeight:700, cursor:"pointer",
                    background:"transparent", border:"none",
                    color: Math.abs(d.err)>20 ? "var(--red)" : "var(--orange)", padding:0
                  }}>
                    {t("Investigate →","تحقيق →")}
                  </button>
                </div>
              ))}
              <div style={{ marginTop:8, padding:"8px", borderRadius:6, background:"rgba(224,123,42,0.06)", border:"1px solid rgba(224,123,42,0.2)", fontSize:9.5, color:"var(--text-muted)" }}>
                {t("APICS Tracking Signal Alert threshold: |TS| > 4","تنبيه APICS: إشارة التتبع > 4 = انحياز")}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop:12, padding:"6px 10px", borderRadius:6, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize:9.5, color:"var(--text-muted)" }}>
              {t(
                "APICS CPIM V8.1 | Algorithms: SES, Holt, Holt-Winters, ARIMA, Croston, XGBoost, LSTM, Ensemble | Last run: 06:00 | 47,200 data points | Next: Tomorrow 06:00",
                "معيار APICS CPIM V8.1 | الخوارزميات: تمهيد أسي، هولت، هولت-وينترز، أريما، كروستون، XGBoost، LSTM، مجمّع | آخر تشغيل: 06:00 | 47,200 نقطة بيانات"
              )}
            </span>
          </div>

        </main>
      </div>
    </div>
  );
}
