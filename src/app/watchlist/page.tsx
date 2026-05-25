"use client";

import { useTrading } from "@/context/TradingContext";
import { useEffect, useState } from "react";
import { ArrowRight, Star, Layers, Activity, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";

export default function WatchlistPage() {
  const { watchlist, toggleWatchlist, reorderWatchlist } = useTrading();
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (watchlist.length === 0) return;
    
    const fetchPrices = async () => {
      const prefs = watchlist.filter(w => w.security_id).map(w => `${w.exchange}:${w.security_id}:LTP`);
      if (prefs.length === 0) return;
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
  }, [watchlist]);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", width: "100%", padding: "16px" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "32px", display: "flex", alignItems: "center", gap: "12px" }}>
        <Star size={32} color="var(--accent-primary)" fill="var(--accent-primary)" /> Watchlist
      </h1>

      {watchlist.length === 0 ? (
        <div className="glass-panel" style={{ padding: "64px", textAlign: "center", color: "var(--text-muted)" }}>
          <Star size={48} color="var(--border-light)" style={{ marginBottom: "16px" }} />
          <h2 style={{ fontSize: "24px", marginBottom: "8px", color: "var(--text-primary)" }}>Your watchlist is empty</h2>
          <p>Search for instruments and click the Star icon to add them here.</p>
          <Link href="/search" style={{ display: "inline-block", marginTop: "24px", padding: "12px 24px", background: "var(--accent-primary)", color: "white", borderRadius: "8px", textDecoration: "none", fontWeight: 600 }}>
             Go to Search
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {watchlist.map((item, idx) => {
             const isDerivative = item.instrument_type !== "EQ" && item.instrument_type !== "INDEX";
             const ltp = item.security_id ? (livePrices[item.security_id.toString()] || 0) : 0;

             return (
              <div 
                key={item.security_id || idx} 
                className="glass-panel"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "20px 24px",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                   <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginRight: "8px" }}>
                     <button
                        onClick={() => {
                           if (idx > 0) {
                              const newList = [...watchlist];
                              [newList[idx-1], newList[idx]] = [newList[idx], newList[idx-1]];
                              reorderWatchlist(newList);
                           }
                        }}
                        style={{ background: "transparent", border: "none", cursor: idx > 0 ? "pointer" : "default", opacity: idx > 0 ? 1 : 0.2, color: "var(--text-muted)", padding: "2px" }}
                     >
                       <ChevronUp size={16} />
                     </button>
                     <button
                        onClick={() => {
                           if (idx < watchlist.length - 1) {
                              const newList = [...watchlist];
                              [newList[idx+1], newList[idx]] = [newList[idx], newList[idx+1]];
                              reorderWatchlist(newList);
                           }
                        }}
                        style={{ background: "transparent", border: "none", cursor: idx < watchlist.length - 1 ? "pointer" : "default", opacity: idx < watchlist.length - 1 ? 1 : 0.2, color: "var(--text-muted)", padding: "2px" }}
                     >
                       <ChevronDown size={16} />
                     </button>
                   </div>
                   <button 
                     onClick={(e) => { e.preventDefault(); toggleWatchlist(item); }}
                     style={{ 
                       background: "transparent", 
                       border: "none", 
                       cursor: "pointer",
                       padding: "8px",
                       display: "flex",
                       alignItems: "center",
                       justifyContent: "center"
                     }}
                  >
                     <Star size={24} fill="var(--accent-primary)" color="var(--accent-primary)" />
                  </button>
                  <Link href={`/instrument/${encodeURIComponent(item.symbol)}`} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ 
                        padding: "12px", 
                        background: "rgba(255,255,255,0.05)", 
                        borderRadius: "12px" 
                      }}>
                        {isDerivative ? <Layers size={24} color="var(--text-muted)" /> : <Activity size={24} color="var(--text-muted)" />}
                      </div>
                      <div>
                        <div style={{ fontSize: "18px", fontWeight: 600 }}>{item.symbol}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
                          <span style={{ 
                            padding: "2px 6px", 
                            background: "rgba(255,255,255,0.1)", 
                            borderRadius: "4px",
                            fontSize: "12px",
                            color: "var(--text-primary)"
                          }}>
                            {item.instrument_type} | {item.exchange || (item.symbol.toUpperCase().includes("SENSEX") || item.symbol.toUpperCase().includes("BSE") ? "BSE" : "NSE")}
                          </span>
                        </div>
                      </div>
                  </Link>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
                   <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
                          {ltp > 0 ? `₹${ltp.toFixed(2)}` : <span style={{ color: "var(--text-muted)", fontSize: "16px" }}>Loading...</span>}
                      </div>
                   </div>
                   <Link href={`/instrument/${encodeURIComponent(item.symbol)}`} style={{ color: "var(--text-muted)" }}>
                      <ArrowRight size={20} />
                   </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
