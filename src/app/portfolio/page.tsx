"use client";

import { useTrading } from "@/context/TradingContext";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, RefreshCw } from "lucide-react";

export default function PortfolioPage() {
  const { funds, marginBlocked, marginAvailable, positions, squareOff, addFunds, withdrawFunds } = useTrading();
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  
  const [fundAmount, setFundAmount] = useState("");

  const livePositions = positions.filter(p => !p.isClosed);
  const closedPositions = positions.filter(p => p.isClosed);

  useEffect(() => {
    if (livePositions.length === 0) return;
    
    const fetchPrices = async () => {
      const prefs = livePositions.map(p => `${p.exchange}:${p.security_id}:LTP`);
      try {
        const res = await fetch(`/api/portfolio/live?prefs=${prefs.join(",")}`);
        const data = await res.json();
        if (!data.error) {
            setLivePrices(data);
        }
      } catch (e) {}
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 3000);
    return () => clearInterval(interval);
  }, [positions]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%", padding: "16px" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "32px" }}>Portfolio</h1>



      <div style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px", color: "var(--text-secondary)" }}>Live Positions</h2>
        {livePositions.length === 0 ? (
          <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            No open positions.
          </div>
        ) : (
          <div className="glass-panel" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-light)" }}>
                <tr>
                  <th style={{ padding: "16px" }}>Symbol</th>
                  <th style={{ padding: "16px" }}>Type</th>
                  <th style={{ padding: "16px" }}>Qty</th>
                  <th style={{ padding: "16px" }}>Avg Price</th>
                  <th style={{ padding: "16px" }}>Live LTP</th>
                  <th style={{ padding: "16px" }}>Live PnL</th>
                  <th style={{ padding: "16px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {livePositions.map(p => {
                  const ltp = livePrices[p.security_id.toString()] || p.averagePrice;
                  let pnl = 0;
                  if (p.type === "LONG") {
                    pnl = (ltp - p.averagePrice) * p.quantity;
                  } else {
                    pnl = (p.averagePrice - ltp) * p.quantity;
                  }
                  
                  // For options, PnL is cash logic is different since premium is paid/received
                  // But visually, the MTM PnL formula is the same!
                  // If I bought for 100, LTP is 150. PnL = +50.
                  // If I sold for 100, LTP is 150. PnL = -50.
                  const isUp = pnl >= 0;

                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "16px", fontWeight: 600 }}>
                         <a href={`/instrument/${encodeURIComponent(p.symbol)}`} style={{ color: "inherit", textDecoration: "none" }}>{p.symbol}</a>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <span style={{ 
                          padding: "4px 8px", 
                          borderRadius: "4px", 
                          fontSize: "12px", 
                          fontWeight: 600,
                          background: p.type === "LONG" ? "var(--trade-up-bg)" : "var(--trade-down-bg)",
                          color: p.type === "LONG" ? "var(--trade-up)" : "var(--trade-down)"
                        }}>{p.type}</span>
                      </td>
                      <td style={{ padding: "16px" }}>{p.type === "SHORT" ? "-" : ""}{p.quantity}</td>
                      <td style={{ padding: "16px" }}>₹{p.averagePrice.toFixed(2)}</td>
                      <td style={{ padding: "16px" }}>
                        {livePrices[p.security_id.toString()] ? `₹${ltp.toFixed(2)}` : "Loading..."}
                      </td>
                      <td style={{ padding: "16px", color: isUp ? "var(--trade-up)" : "var(--trade-down)", fontWeight: 600 }}>
                        {isUp ? "+" : "-"}₹{Math.abs(pnl).toFixed(2)}
                      </td>
                      <td style={{ padding: "16px", textAlign: "right" }}>
                        <button 
                          onClick={() => squareOff(p.id, ltp)}
                          style={{
                            padding: "8px 16px",
                            background: "transparent",
                            border: "1px solid var(--accent-primary)",
                            color: "var(--accent-primary)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: 600
                          }}
                        >
                          Square Off
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
