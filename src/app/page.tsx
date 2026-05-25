"use client";

import { useTrading } from "@/context/TradingContext";
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, Key, Trash2, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { funds, positions, resetMemory } = useTrading();
  const { changePasskey } = useAuth();
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [marketStatus, setMarketStatus] = useState<"OPEN" | "CLOSED" | "UNKNOWN" | "LOADING">("LOADING");

  // Fetch live prices for positions to calculate PnL
  useEffect(() => {
    if (positions.length === 0) return;
    
    const fetchPrices = async () => {
      const prices: Record<string, number> = {};
      for (const pos of positions) {
        // Extract base symbol from futures if needed, but for simplicity we fetch the base quote
        const baseSymbol = pos.symbol.split(" ")[0];
        try {
          const res = await fetch(`/api/quotes?symbol=${baseSymbol}`);
          const data = await res.json();
          prices[pos.symbol] = data.ltp;
        } catch (e) {
          console.error(e);
        }
      }
      setLivePrices(prices);
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, [positions]);

  // Fetch Market Status separately
  useEffect(() => {
    fetch("/api/market-status")
      .then(res => res.json())
      .then(data => {
         setMarketStatus(data.status || "UNKNOWN");
      })
      .catch(() => setMarketStatus("UNKNOWN"));
  }, []);

  let totalPnL = 0;
  let investedValue = 0;

  positions.forEach(p => {
    const ltp = livePrices[p.symbol] || p.averagePrice;
    investedValue += p.quantity * p.averagePrice;
    
    if (p.type === "LONG") {
      totalPnL += (ltp - p.averagePrice) * p.quantity;
    } else {
      totalPnL += (p.averagePrice - ltp) * p.quantity;
    }
  });

  const pnlPercent = investedValue > 0 ? (totalPnL / investedValue) * 100 : 0;
  const isPositive = totalPnL >= 0;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%", padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "32px", margin: 0 }}>Dashboard</h1>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "8px", 
          background: "var(--bg-panel)", 
          padding: "8px 16px", 
          borderRadius: "20px", 
          border: "1px solid var(--border-light)",
          fontWeight: 600,
          fontSize: "13px",
          color: "var(--text-secondary)"
        }}>
           Market Status: 
           {marketStatus === "LOADING" && <span style={{ color: "var(--text-muted)" }}>Checking...</span>}
           {marketStatus === "OPEN" && (
             <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-primary)" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--trade-up)", boxShadow: "0 0 8px var(--trade-up)" }} />
                OPEN
             </div>
           )}
           {marketStatus === "CLOSED" && (
             <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-primary)" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--trade-down)", boxShadow: "0 0 8px var(--trade-down)" }} />
                CLOSED
             </div>
           )}
           {marketStatus === "UNKNOWN" && (
             <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-primary)" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--accent-primary)", boxShadow: "0 0 8px var(--accent-primary)" }} />
                UNKNOWN
             </div>
           )}
        </div>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        
        {/* Balance Card */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "16px", color: "var(--text-secondary)", fontWeight: 500 }}>Available Margin</h2>
            <Wallet size={20} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: "36px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
            ₹{funds.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* PnL Card */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "16px", color: "var(--text-secondary)", fontWeight: 500 }}>Net PnL</h2>
            <Activity size={20} color={isPositive ? "var(--trade-up)" : "var(--trade-down)"} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
            <div style={{ fontSize: "36px", fontWeight: 700, fontFamily: "var(--font-display)", color: isPositive ? "var(--trade-up)" : "var(--trade-down)" }}>
              {isPositive ? "+" : "-"}₹{Math.abs(totalPnL).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              marginBottom: "8px",
              padding: "4px 8px", 
              borderRadius: "8px", 
              fontSize: "14px",
              fontWeight: 600,
              backgroundColor: isPositive ? "var(--trade-up-bg)" : "var(--trade-down-bg)",
              color: isPositive ? "var(--trade-up)" : "var(--trade-down)"
            }}>
              {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              {Math.abs(pnlPercent).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "40px" }}>
        <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>Quick Actions</h2>
        <div style={{ display: "flex", gap: "16px" }}>
          <Link href="/search" className="glass-panel" style={{ 
            padding: "16px 24px", 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            transition: "all 0.2s ease",
            textDecoration: "none",
            color: "inherit"
          }}>
            <div style={{ background: "var(--accent-primary)", padding: "8px", borderRadius: "8px" }}>
              <Activity size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Explore Markets</div>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Search for stocks, futures & options</div>
            </div>
          </Link>
          
          <a href="/api/auth/login" className="glass-panel" style={{ 
            padding: "16px 24px", 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            transition: "all 0.2s ease",
            textDecoration: "none",
            color: "inherit"
          }}>
            <div style={{ background: "var(--trade-down)", padding: "8px", borderRadius: "8px" }}>
              <Key size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Refresh API Token</div>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Generate a new access token</div>
            </div>
          </a>

          <div 
             onClick={() => {
                if (window.confirm("Are you sure you want to clear your entire portfolio and order history? This cannot be undone.")) {
                   resetMemory();
                }
             }}
             className="glass-panel" 
             style={{ 
                padding: "16px 24px", 
                display: "flex", 
                alignItems: "center", 
                gap: "12px",
                transition: "all 0.2s ease",
                cursor: "pointer"
             }}
          >
            <div style={{ background: "var(--text-muted)", padding: "8px", borderRadius: "8px" }}>
              <Trash2 size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Clear Memory</div>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Flush all positions & orders</div>
            </div>
          </div>

          <div 
             onClick={async () => {
                const oldPass = window.prompt("Enter current passkey:");
                if (!oldPass) return;
                const newPass = window.prompt("Enter new passkey:");
                if (!newPass) return;
                const success = await changePasskey(oldPass, newPass);
                if (success) {
                  alert("Passkey updated successfully!");
                } else {
                  alert("Incorrect current passkey. Update failed.");
                }
             }}
             className="glass-panel" 
             style={{ 
                padding: "16px 24px", 
                display: "flex", 
                alignItems: "center", 
                gap: "12px",
                transition: "all 0.2s ease",
                cursor: "pointer"
             }}
          >
            <div style={{ background: "var(--accent-primary)", padding: "8px", borderRadius: "8px" }}>
              <Lock size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Change Passkey</div>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Update terminal access key</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
