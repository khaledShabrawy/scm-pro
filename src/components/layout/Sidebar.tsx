"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/demand",   icon: "📊", en: "Demand Planning",   ar: "تخطيط الطلب",        color: "#E07B2A" },
  { href: "/supply",   icon: "🏭", en: "Supply Planning",   ar: "تخطيط الإمداد",      color: "#7B5EA7" },
  { href: "/sop",      icon: "⚖️", en: "S&OP Balance",      ar: "التوازن",             color: "#1A8A8A" },
  { href: "/inventory",icon: "📦", en: "Inventory",         ar: "المخزون",             color: "#C9A84C" },
  { href: "/distribution",icon:"🚛",en:"Distribution",      ar: "التوزيع",             color: "#2EA064" },
  { href: "/route-planning",icon:"🗺️",en:"Route Planning",  ar: "تخطيط المسارات",     color: "#E07B2A" },
  { href: "/analytics",icon: "📈", en: "Analytics",         ar: "التحليلات",           color: "#60B8D4" },
  { href: "/settings", icon: "⚙️", en: "Settings",          ar: "الإعدادات",           color: "#9BA3B2" },
];

interface SidebarProps {
  lang: "en" | "ar";
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ lang, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`scm-sidebar-overlay${isOpen ? " is-open" : ""}`}
        onClick={onClose}
      />

    <aside className={`scm-sidebar${isOpen ? " is-open" : ""}`} style={{
      width: 240,
      minHeight: "100vh",
      background: "#060B14",
      borderRight: "1px solid rgba(201,168,76,0.12)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8,
            background: "linear-gradient(135deg,#C9A84C,#E07B2A)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "#0A0E1A"
          }}>S</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text)", lineHeight: 1 }}>SCM Pro</div>
            <div style={{ fontSize: 10, color: "var(--gold)", marginTop: 2, fontWeight: 600 }}>Demand & Supply AI</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px" }}>
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 7, marginBottom: 2,
                background: active ? `${item.color}14` : "transparent",
                borderLeft: active ? `3px solid ${item.color}` : "3px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <div>
                  <div style={{
                    fontSize: 12.5, fontWeight: active ? 700 : 500,
                    color: active ? item.color : "var(--text-muted)",
                    lineHeight: 1.2
                  }}>{lang === "ar" ? item.ar : item.en}</div>
                  {lang === "ar" && (
                    <div style={{ fontSize: 9, color: "rgba(155,163,178,0.5)" }}>{item.en}</div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(201,168,76,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg,#C9A84C,#E07B2A)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 13, color: "#0A0E1A"
          }}>KM</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Khaled Mahmoud</div>
            <div style={{ fontSize: 9.5, color: "var(--text-muted)" }}>Supply Chain Director</div>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
