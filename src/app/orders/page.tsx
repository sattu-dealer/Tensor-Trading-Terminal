"use client";

import { useTrading } from "@/context/TradingContext";
import { useState, useEffect } from "react";
import { List } from "lucide-react";

type OrderTab = "ALL" | "PENDING" | "EXECUTED" | "CANCELLED" | "REJECTED";

export default function OrdersPage() {
  const { orders, cancelOrder } = useTrading();
  
  // Smart default logic: If there are pending orders, default to PENDING, else ALL.
  // We use state initialization to handle this exactly once on mount.
  const [activeTab, setActiveTab] = useState<OrderTab>("ALL");

  useEffect(() => {
     if (orders.some(o => o.status === "PENDING")) {
         setActiveTab("PENDING");
     }
  }, []); // Only run on mount to set initial smart default

  const filteredOrders = orders.slice().reverse().filter(o => {
      if (activeTab === "ALL") return true;
      return o.status === activeTab;
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%", padding: "16px" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "32px", display: "flex", alignItems: "center", gap: "12px" }}>
        <List size={32} color="var(--accent-primary)" /> Orders
      </h1>

      {/* Tabs */}
      <div style={{ 
        display: "flex", 
        gap: "16px", 
        marginBottom: "24px",
        borderBottom: "1px solid var(--border-light)",
        paddingBottom: "16px",
        overflowX: "auto"
      }}>
        {(["ALL", "PENDING", "EXECUTED", "CANCELLED", "REJECTED"] as OrderTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 24px",
              background: activeTab === tab ? "var(--accent-primary)" : "transparent",
              color: activeTab === tab ? "white" : "var(--text-secondary)",
              border: "none",
              borderRadius: "20px",
              cursor: "pointer",
              fontWeight: 600,
              transition: "all 0.2s ease",
              whiteSpace: "nowrap"
            }}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-light)" }}>
            <tr>
              <th style={{ padding: "16px" }}>Time</th>
              <th style={{ padding: "16px" }}>Symbol</th>
              <th style={{ padding: "16px" }}>Type</th>
              <th style={{ padding: "16px" }}>Qty</th>
              <th style={{ padding: "16px" }}>Price</th>
              <th style={{ padding: "16px" }}>Margin Blocked</th>
              <th style={{ padding: "16px" }}>Status</th>
              <th style={{ padding: "16px", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(o => {
               let statusBg = "rgba(255,255,255,0.1)";
               let statusColor = "var(--text-secondary)";
               
               if (o.status === "PENDING") {
                  statusBg = "rgba(234, 179, 8, 0.15)";
                  statusColor = "#eab308";
               } else if (o.status === "EXECUTED") {
                  statusBg = "var(--trade-up-bg)";
                  statusColor = "var(--trade-up)";
               } else if (o.status === "CANCELLED" || o.status === "REJECTED") {
                  statusBg = "var(--trade-down-bg)";
                  statusColor = "var(--trade-down)";
               }

               return (
                <tr key={o.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", opacity: o.status === "EXECUTED" || o.status === "CANCELLED" || o.status === "REJECTED" ? 0.6 : 1 }}>
                  <td style={{ padding: "16px", color: "var(--text-muted)" }}>{new Date(o.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: "16px", fontWeight: 600 }}>{o.symbol}</td>
                  <td style={{ padding: "16px", color: o.type === "BUY" ? "var(--trade-up)" : "var(--trade-down)", fontWeight: 600 }}>
                    {o.type}
                  </td>
                  <td style={{ padding: "16px" }}>{o.quantity}</td>
                  <td style={{ padding: "16px" }}>{o.limitPrice === null ? "MKT" : `₹${o.limitPrice.toFixed(2)}`}</td>
                  <td style={{ padding: "16px" }}>₹{o.marginBlocked.toFixed(2)}</td>
                  <td style={{ padding: "16px" }}>
                    <span style={{ 
                      padding: "4px 8px", 
                      borderRadius: "4px", 
                      fontSize: "12px", 
                      fontWeight: 600,
                      background: statusBg,
                      color: statusColor
                    }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px", textAlign: "right" }}>
                    {o.status === "PENDING" && (
                      <button 
                        onClick={() => cancelOrder(o.id)}
                        style={{
                          padding: "6px 12px",
                          background: "transparent",
                          border: "1px solid var(--text-muted)",
                          color: "var(--text-muted)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          transition: "all 0.2s ease"
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.color = "white";
                            e.currentTarget.style.borderColor = "white";
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.color = "var(--text-muted)";
                            e.currentTarget.style.borderColor = "var(--text-muted)";
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
                  {activeTab === "ALL" ? "No orders placed yet." : `No ${activeTab.toLowerCase()} orders.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
