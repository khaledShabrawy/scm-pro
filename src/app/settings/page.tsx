"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { DEFAULT_ALERTS } from "@/lib/notifications";

const t = (en: string, ar: string, lang: "en" | "ar") => lang === "ar" ? ar : en;

const SERVICE_LEVELS = [50,75,80,84,85,90,92,95,97,98,99,99.5,99.9];
const Z_VALUES: Record<number,number> = {
  50:0.000,75:0.674,80:0.842,84:1.000,85:1.036,90:1.282,
  92:1.405,95:1.645,97:1.881,98:2.054,99:2.326,99.5:2.576,99.9:3.090,
};

type AlgoConfig = { enabled: boolean; alpha?: number; beta?: number; gamma?: number; period?: number };
type AlgoConfigs = Record<string, AlgoConfig>;

export default function SettingsPage() {
  const [lang, setLang]   = useState<"en"|"ar">("en");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"algorithms"|"inventory"|"apics"|"system">("algorithms");

  // Algorithm settings
  const [algos, setAlgos] = useState<AlgoConfigs>({
    ses:   { enabled:true,  alpha:0.3 },
    holt:  { enabled:true,  alpha:0.3, beta:0.15 },
    hw:    { enabled:true,  alpha:0.3, beta:0.15, gamma:0.42, period:12 },
    arima: { enabled:true  },
    croston:{ enabled:false },
    xgb:   { enabled:true  },
    lstm:  { enabled:true  },
    ensemble:{ enabled:true },
  });

  // Inventory settings
  const [invSettings, setInvSettings] = useState({
    defaultSL: 95,
    reviewCycle: "periodic",
    holdingRate: 25,
    orderCost: 850,
    leadTimeDays: 14,
    leadTimeSigma: 2,
  });

  // APICS parameters
  const [apicsSettings, setApicsSettings] = useState({
    tsAlertThreshold: 4,
    mapeAlertThreshold: 15,
    abcCutA: 80,
    abcCutB: 95,
    cvCutX: 0.5,
    cvCutY: 1.0,
    sopCycle: "monthly",
    horizon: 18,
  });

  const tabs = [
    { id:"algorithms", en:"Forecast Algorithms", ar:"خوارزميات التنبؤ" },
    { id:"inventory",  en:"Inventory Parameters", ar:"معاملات المخزون" },
    { id:"apics",      en:"APICS Parameters",     ar:"معاملات APICS" },
    { id:"system",     en:"System",               ar:"النظام" },
  ] as const;

  const algoMeta = [
    { id:"ses",     label:"Simple Exponential Smoothing",  params:["alpha"], color:"#9BA3B2" },
    { id:"holt",    label:"Holt's Double Exponential",     params:["alpha","beta"], color:"#9BA3B2" },
    { id:"hw",      label:"Holt-Winters Seasonal",         params:["alpha","beta","gamma","period"], color:"#66BB6A" },
    { id:"arima",   label:"ARIMA / SARIMA",                params:[], color:"#66BB6A" },
    { id:"croston", label:"Croston (Intermittent Demand)", params:[], color:"#9BA3B2" },
    { id:"xgb",     label:"XGBoost ML",                   params:[], color:"#66BB6A" },
    { id:"lstm",    label:"LSTM Neural Network",           params:[], color:"#66BB6A" },
    { id:"ensemble",label:"Ensemble (All Models)",         params:[], color:"#C9A84C" },
  ];

  const inputStyle = (focused = false): React.CSSProperties => ({
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${focused ? "rgba(201,168,76,0.5)" : "rgba(201,168,76,0.15)"}`,
    borderRadius: 6, padding: "7px 10px",
    color: "var(--text)", fontSize: 12, width: "100%", outline: "none",
  });

  const sliderStyle: React.CSSProperties = {
    width: "100%", accentColor: "#C9A84C", cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      <Sidebar lang={lang} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar lang={lang} onLangChange={() => setLang(l => l === "en" ? "ar" : "en")}
          pageTitle="Settings" pageAr="الإعدادات" module="settings"
          exportData={SERVICE_LEVELS.map(sl => ({ "Service Level %": sl, "Z-Value": Z_VALUES[sl] }))}
          exportFilename="settings-parameters"
          alerts={DEFAULT_ALERTS}
          onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header */}
          <div style={{ padding: "16px 20px", background: "rgba(155,163,178,0.06)", borderRadius: 10, border: "1px solid rgba(155,163,178,0.15)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
              {t("SCM Pro — Configuration", "SCM Pro — الإعدادات والتكوين", lang)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {t("APICS CPIM V8.1 compliant parameters. Changes apply to all modules.", "معاملات متوافقة مع APICS CPIM V8.1. تُطبَّق التغييرات على جميع الوحدات.", lang)}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(155,163,178,0.15)" }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "8px 16px", fontSize: 12, fontWeight: 700, background: "transparent", cursor: "pointer", border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #9BA3B2" : "2px solid transparent",
                color: activeTab === tab.id ? "var(--text)" : "var(--text-muted)", transition: "all 0.2s",
              }}>{lang === "ar" ? tab.ar : tab.en}</button>
            ))}
          </div>

          {/* ── ALGORITHMS ── */}
          {activeTab === "algorithms" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "8px 0" }}>
                {t("Enable/disable forecasting models and tune smoothing parameters.", "تفعيل/تعطيل نماذج التنبؤ وضبط معاملات التمهيد.", lang)}
              </div>
              {algoMeta.map(a => {
                const cfg = algos[a.id];
                return (
                  <div key={a.id} style={{
                    background: "var(--bg-card)", borderRadius: 10,
                    border: `1px solid ${cfg.enabled ? a.color + "33" : "rgba(155,163,178,0.1)"}`,
                    padding: "16px 20px",
                    opacity: cfg.enabled ? 1 : 0.55,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: a.params.length > 0 && cfg.enabled ? 14 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: cfg.enabled ? a.color : "rgba(155,163,178,0.3)",
                        }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: cfg.enabled ? "var(--text)" : "var(--text-muted)" }}>{a.label}</span>
                        {a.id === "ensemble" && <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(201,168,76,0.15)", color: "#C9A84C", borderRadius: 4, fontWeight: 700 }}>RECOMMENDED</span>}
                      </div>
                      {/* Toggle */}
                      <div
                        onClick={() => setAlgos(prev => ({ ...prev, [a.id]: { ...prev[a.id], enabled: !prev[a.id].enabled } }))}
                        style={{
                          width: 44, height: 24, borderRadius: 12, cursor: "pointer",
                          background: cfg.enabled ? "#C9A84C" : "rgba(155,163,178,0.2)",
                          position: "relative", transition: "background 0.2s",
                        }}>
                        <div style={{
                          position: "absolute", top: 3, left: cfg.enabled ? 23 : 3,
                          width: 18, height: 18, borderRadius: "50%",
                          background: "white", transition: "left 0.2s",
                        }} />
                      </div>
                    </div>

                    {/* Smoothing params */}
                    {cfg.enabled && a.params.length > 0 && (
                      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        {a.params.map(param => {
                          const val = (cfg as Record<string,number|boolean>)[param] as number ?? 0;
                          const isInt = param === "period";
                          const min = isInt ? 2 : 0.01;
                          const max = isInt ? 52 : 0.99;
                          const step = isInt ? 1 : 0.01;
                          return (
                            <div key={param} style={{ flex: 1, minWidth: 140 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>{param}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#C9A84C" }}>{isInt ? val : val.toFixed(2)}</span>
                              </div>
                              <input type="range" min={min} max={max} step={step} value={val} style={sliderStyle}
                                onChange={e => setAlgos(prev => ({ ...prev, [a.id]: { ...prev[a.id], [param]: isInt ? parseInt(e.target.value) : parseFloat(e.target.value) } }))} />
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                                <span>{min}</span><span>{max}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── INVENTORY PARAMETERS ── */}
          {activeTab === "inventory" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.15)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#C9A84C", marginBottom: 16 }}>
                  {t("Safety Stock Configuration", "إعدادات مخزون الأمان", lang)}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    {t("Default Service Level", "مستوى الخدمة الافتراضي", lang)}
                  </label>
                  <select value={invSettings.defaultSL}
                    onChange={e => setInvSettings(p => ({ ...p, defaultSL: parseInt(e.target.value) }))}
                    style={{ ...inputStyle(), appearance: "none" }}>
                    {SERVICE_LEVELS.map(sl => (
                      <option key={sl} value={sl} style={{ background: "#1C2435" }}>{sl}% — Z = {Z_VALUES[sl].toFixed(3)}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 10, color: "#C9A84C", marginTop: 4 }}>
                    Z = {Z_VALUES[invSettings.defaultSL]?.toFixed(3)} &nbsp;|&nbsp; SS = Z × √(LT×σ²_d + D²×σ²_LT)
                  </div>
                </div>

                {[
                  { key:"holdingRate", label:t("Holding Cost Rate (i)", "معدل تكلفة الاحتجاز", lang), unit:"%", min:10, max:40, step:1 },
                  { key:"orderCost",   label:t("Order Cost (S)", "تكلفة الطلب", lang),              unit:"EGP", min:100, max:5000, step:50 },
                  { key:"leadTimeDays",label:t("Avg Lead Time", "متوسط وقت الانتظار", lang),       unit:"days", min:1, max:90, step:1 },
                  { key:"leadTimeSigma",label:t("Lead Time σ", "انحراف وقت الانتظار", lang),       unit:"days", min:0, max:14, step:0.5 },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.label}</label>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#C9A84C" }}>
                        {(invSettings as unknown as Record<string,number>)[f.key]} {f.unit}
                      </span>
                    </div>
                    <input type="range" min={f.min} max={f.max} step={f.step}
                      value={(invSettings as unknown as Record<string,number>)[f.key]} style={sliderStyle}
                      onChange={e => setInvSettings(p => ({ ...p, [f.key]: parseFloat(e.target.value) }))} />
                  </div>
                ))}
              </div>

              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(123,94,167,0.2)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#7B5EA7", marginBottom: 16 }}>
                  {t("Review Policy", "سياسة المراجعة", lang)}
                </div>
                {[
                  { id:"continuous", label:t("Continuous Review (Q,R)", "مراجعة مستمرة", lang), desc: "Reorder when inventory hits ROP" },
                  { id:"periodic",   label:t("Periodic Review (P,T)", "مراجعة دورية", lang),    desc: "Review at fixed intervals" },
                  { id:"minmax",     label:t("Min-Max Policy", "سياسة الحد الأدنى-الأقصى", lang),desc: "Reorder between min and max bounds" },
                ].map(policy => (
                  <div key={policy.id} onClick={() => setInvSettings(p => ({ ...p, reviewCycle: policy.id }))}
                    style={{
                      padding: "14px 16px", marginBottom: 8, borderRadius: 8, cursor: "pointer",
                      background: invSettings.reviewCycle === policy.id ? "rgba(123,94,167,0.12)" : "transparent",
                      border: `1px solid ${invSettings.reviewCycle === policy.id ? "rgba(123,94,167,0.4)" : "rgba(123,94,167,0.1)"}`,
                      transition: "all 0.2s",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid #7B5EA7`, background: invSettings.reviewCycle === policy.id ? "#7B5EA7" : "transparent" }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: invSettings.reviewCycle === policy.id ? "#7B5EA7" : "var(--text)" }}>{policy.label}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, marginLeft: 22 }}>{policy.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── APICS PARAMETERS ── */}
          {activeTab === "apics" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.2)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#C9A84C", marginBottom: 16 }}>
                  {t("Forecast Control Limits", "حدود التحكم في التنبؤ", lang)}
                </div>
                {[
                  { key:"tsAlertThreshold",   label:"Tracking Signal Alert (|TS| >)", unit:"",    min:2, max:8,  step:0.5, note:"APICS: Alert if |TS| > ±4" },
                  { key:"mapeAlertThreshold",  label:"MAPE Alert Threshold",           unit:"%",   min:5, max:30, step:1,   note:"Flag SKUs above this threshold" },
                  { key:"abcCutA",             label:"ABC Cut-off A (%)",              unit:"%",   min:60,max:90, step:1,   note:"Default 80% cumulative value" },
                  { key:"abcCutB",             label:"ABC Cut-off B (%)",              unit:"%",   min:85,max:99, step:1,   note:"Default 95% cumulative value" },
                  { key:"cvCutX",              label:"XYZ Cut-off X (CV <)",           unit:"",    min:0.1,max:0.8,step:0.05, note:"CV < 0.5 = X (stable)" },
                  { key:"cvCutY",              label:"XYZ Cut-off Y (CV <)",           unit:"",    min:0.5,max:1.5,step:0.05, note:"CV < 1.0 = Y (variable)" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.label}</label>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#C9A84C" }}>
                        {(apicsSettings as unknown as Record<string,number>)[f.key]}{f.unit}
                      </span>
                    </div>
                    <input type="range" min={f.min} max={f.max} step={f.step}
                      value={(apicsSettings as unknown as Record<string,number>)[f.key]} style={sliderStyle}
                      onChange={e => setApicsSettings(p => ({ ...p, [f.key]: parseFloat(e.target.value) }))} />
                    <div style={{ fontSize: 9, color: "rgba(201,168,76,0.6)", marginTop: 2 }}>{f.note}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(26,138,138,0.2)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1A8A8A", marginBottom: 16 }}>
                  {t("S&OP Configuration", "إعدادات S&OP", lang)}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    {t("S&OP Review Cycle", "دورة مراجعة S&OP", lang)}
                  </label>
                  {["weekly","monthly","quarterly"].map(cycle => (
                    <div key={cycle} onClick={() => setApicsSettings(p => ({ ...p, sopCycle: cycle }))}
                      style={{
                        padding: "10px 14px", marginBottom: 6, borderRadius: 8, cursor: "pointer",
                        background: apicsSettings.sopCycle === cycle ? "rgba(26,138,138,0.1)" : "transparent",
                        border: `1px solid ${apicsSettings.sopCycle === cycle ? "rgba(26,138,138,0.4)" : "rgba(26,138,138,0.1)"}`,
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #1A8A8A", background: apicsSettings.sopCycle === cycle ? "#1A8A8A" : "transparent" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: apicsSettings.sopCycle === cycle ? "#1A8A8A" : "var(--text)", textTransform: "capitalize" }}>{cycle}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <label style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("Planning Horizon", "أفق التخطيط", lang)}</label>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1A8A8A" }}>{apicsSettings.horizon} months</span>
                  </div>
                  <input type="range" min={6} max={36} step={3} value={apicsSettings.horizon} style={sliderStyle}
                    onChange={e => setApicsSettings(p => ({ ...p, horizon: parseInt(e.target.value) }))} />
                </div>

                {/* APICS Z-table reference */}
                <div style={{ background: "rgba(26,138,138,0.06)", borderRadius: 8, padding: "12px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#1A8A8A", marginBottom: 8 }}>APICS Service Level Z-Table</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
                    {[90,95,98,99].map(sl => (
                      <div key={sl} style={{ textAlign: "center", padding: "6px", background: "rgba(26,138,138,0.08)", borderRadius: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#1A8A8A" }}>{sl}%</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>Z={Z_VALUES[sl]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SYSTEM ── */}
          {activeTab === "system" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(155,163,178,0.15)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>
                  {t("Application Info", "معلومات التطبيق", lang)}
                </div>
                {[
                  { label:"Platform",           value:"SCM Pro" },
                  { label:"Version",            value:"1.0.0" },
                  { label:"APICS Standard",     value:"CPIM V8.1" },
                  { label:"Framework",          value:"Next.js 16 (App Router)" },
                  { label:"Algorithm Engine",   value:"TypeScript + Recharts" },
                  { label:"Build",              value:"Production" },
                  { label:"Modules",            value:"Demand · Supply · S&OP · Inventory · Distribution · Analytics" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(155,163,178,0.06)" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid rgba(155,163,178,0.15)", padding: "20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>
                  {t("User Profile", "ملف المستخدم", lang)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: "14px", background: "rgba(201,168,76,0.06)", borderRadius: 8, border: "1px solid rgba(201,168,76,0.15)" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#E07B2A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#0A0E1A" }}>KM</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>Khaled Mahmoud</div>
                    <div style={{ fontSize: 11, color: "#C9A84C" }}>Supply Chain Director</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>k.mahmoud35032@gmail.com</div>
                  </div>
                </div>
                {[
                  { label:t("Language","اللغة",lang),      value: lang === "en" ? "English" : "العربية" },
                  { label:t("Role","الدور",lang),           value:"Supply Chain Director" },
                  { label:t("Access Level","صلاحية الوصول",lang), value:"Full Admin" },
                  { label:t("Last Login","آخر دخول",lang), value:"Today, 09:14 AM" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(155,163,178,0.06)" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button style={{ padding: "10px 24px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "transparent", border: "1px solid rgba(155,163,178,0.3)", color: "var(--text-muted)" }}>
              {t("Reset to Defaults", "إعادة تعيين", lang)}
            </button>
            <button style={{ padding: "10px 24px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,#C9A84C,#E07B2A)", border: "none", color: "#0A0E1A" }}>
              {t("Save Changes", "حفظ التغييرات", lang)}
            </button>
          </div>

        </main>
      </div>
    </div>
  );
}
