"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart, Search, Briefcase, Settings, Wallet, Star, List, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import LoginScreen from "../auth/LoginScreen";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: <LineChart size={20} /> },
    { name: "Watchlist", href: "/watchlist", icon: <Star size={20} /> },
    { name: "Search", href: "/search", icon: <Search size={20} /> },
    { name: "Portfolio", href: "/portfolio", icon: <Briefcase size={20} /> },
    { name: "Orders", href: "/orders", icon: <List size={20} /> },
    { name: "Funds", href: "/funds", icon: <Wallet size={20} /> },
  ];

  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside className="glass-panel" style={{ 
        width: "260px", 
        height: "calc(100vh - 32px)", 
        margin: "16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}>
        <div>
          <div style={{ padding: "24px", borderBottom: "1px solid var(--border-light)" }}>
            <h1 style={{ fontSize: "24px", color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "12px", height: "12px", background: "var(--accent-primary)", borderRadius: "50%", boxShadow: "var(--shadow-glow)" }} />
              Tensor
            </h1>
          </div>
          
          <nav style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background: isActive ? "var(--bg-panel-hover)" : "transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  transition: "all 0.2s ease"
                }}>
                  {item.icon}
                  <span style={{ fontWeight: isActive ? 600 : 400 }}>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            color: "var(--text-muted)",
            cursor: "not-allowed"
          }}>
            <Settings size={20} />
            <span>Settings</span>
          </div>
          
          <div 
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              color: "var(--trade-down)",
              cursor: "pointer",
              borderRadius: "12px",
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "var(--trade-down-bg)"}
            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        padding: "16px 16px 16px 0", 
        height: "100vh",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }}>
        {children}
      </main>
    </div>
  );
}
