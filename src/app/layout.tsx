import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SCM Pro — Demand & Supply AI Platform",
  description: "APICS CPIM V8.1 Compliant Supply Chain Intelligence Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text)" }}>
        {children}
      </body>
    </html>
  );
}
