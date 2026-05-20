"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { DataRow } from "@/lib/data-io";

const DataToolbar = dynamic(() => import("@/components/ui/DataToolbar"), { ssr: false });

interface NavbarProps {
  lang: "en" | "ar";
  onLangChange: () => void;
  pageTitle: string;
  pageAr: string;
  module: string;
  /** Data rows for CSV/Excel export (optional) */
  exportData?: DataRow[];
  /** Export filename without extension */
  exportFilename?: string;
  /** Live notification alerts (injected from layout or page) */
  alerts?: { id: string; level: "high" | "medium" | "low"; msg: string; page: string }[];
  /** Called when hamburger is clicked (mobile) */
  onMenuToggle?: () => void;
}

export default function Navbar({
  lang, onLangChange, pageTitle, pageAr, exportData, exportFilename, alerts = [], onMenuToggle,
}: NavbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);

  const highCount = alerts.filter(a => a.level === "high").length;
  const totalCount = alerts.length;

  const levelColor = (l: "high"|"medium"|"low") =>
    l === "high" ? "#EF5350" : l === "medium" ? "#FFA726" : "#4CAF50";
  const levelIcon  = (l: "high"|"medium"|"low") =>
    l === "high" ? "🔴" : l === "medium" ? "🟡" : "🟢";

  return (
    <header style={{
      height: 56,
      background: "#0D1220",
      borderBottom: "1px solid rgba(201,168,76,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      flexShrink: 0,
      position: "relative",
      zIndex: 100,
    }}>
      {/* Left — hamburger (mobile) + breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Hamburger — only visible on mobile via CSS */}
        <button className="scm-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
          ☰
        </button>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }} className="scm-breadcrumb-prefix">SCM Pro</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }} className="scm-breadcrumb-prefix">›</span>
          <span className="scm-page-title" style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
            {lang === "ar" ? pageAr : pageTitle}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

        {/* DataToolbar — CSV/Excel import·export */}
        {exportData && exportFilename && (
          <DataToolbar data={exportData} filename={exportFilename} />
        )}

        {/* Module badge */}
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px",
          borderRadius: 4, border: "1px solid rgba(201,168,76,0.3)",
          color: "var(--gold)", background: "rgba(201,168,76,0.08)",
        }}>APICS V8.1</span>

        {/* Lang toggle */}
        <button onClick={onLangChange} style={{
          display: "flex", alignItems: "center", gap: 1,
          background: "rgba(96,184,212,0.08)",
          border: "1px solid rgba(96,184,212,0.3)",
          borderRadius: 6, padding: "4px 2px", cursor: "pointer",
        }}>
          {(["AR","EN"] as const).map(l => (
            <span key={l} style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
              background: (lang === "ar" ? "AR" : "EN") === l ? "var(--blue-light)" : "transparent",
              color:      (lang === "ar" ? "AR" : "EN") === l ? "#0A0E1A" : "var(--text-muted)",
              transition: "all 0.2s",
            }}>{l}</span>
          ))}
        </button>

        {/* Notification bell */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            style={{ background: notifOpen ? "rgba(201,168,76,0.08)" : "transparent", border:"none", cursor:"pointer",
              padding:"2px 4px", borderRadius:6 } as React.CSSProperties}
          >
            <span style={{ fontSize: 18 }}>🔔</span>
            {totalCount > 0 && (
              <span style={{
                position: "absolute", top: -2, right: -2,
                width: 16, height: 16, borderRadius: "50%",
                background: highCount > 0 ? "var(--red)" : "#FFA726",
                fontSize: 9, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white",
              }}>{totalCount > 9 ? "9+" : totalCount}</span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <>
              {/* Backdrop */}
              <div style={{ position:"fixed", inset:0, zIndex:90 }}
                onClick={() => setNotifOpen(false)} />
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                width: 340, background: "#0D1424",
                border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10,
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 200,
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
                    Alerts
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: highCount > 0 ? "#EF5350" : "#FFA726",
                    background: highCount > 0 ? "rgba(239,83,80,0.12)" : "rgba(255,167,38,0.12)",
                    border: `1px solid ${highCount > 0 ? "#EF535033" : "#FFA72633"}`,
                    padding: "2px 8px", borderRadius: 4,
                  }}>{totalCount} active</span>
                </div>

                <div style={{ maxHeight: 360, overflowY: "auto" }}>
                  {totalCount === 0 ? (
                    <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                      ✓ No active alerts
                    </div>
                  ) : (
                    alerts.map(a => (
                      <div key={a.id} style={{
                        padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                        borderLeft: `3px solid ${levelColor(a.level)}`,
                        background: `${levelColor(a.level)}06`,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", lineHeight: 1.4 }}>
                              {levelIcon(a.level)} {a.msg}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3 }}>{a.page}</div>
                          </div>
                          <span style={{
                            fontSize: 8, fontWeight: 800, color: levelColor(a.level),
                            background: `${levelColor(a.level)}18`,
                            border: `1px solid ${levelColor(a.level)}33`,
                            padding: "2px 6px", borderRadius: 3, whiteSpace: "nowrap",
                          }}>{a.level.toUpperCase()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{
                  padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 10, color: "var(--text-muted)", textAlign: "center",
                }}>
                  Auto-refreshed every 5 min · APICS CPIM V8.1
                </div>
              </div>
            </>
          )}
        </div>

        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg,#C9A84C,#E07B2A)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 12, color: "#0A0E1A", cursor: "pointer",
        }}>KM</div>
      </div>
    </header>
  );
}
