"use client";

import { useTrading } from "@/context/TradingContext";
import { useEffect, useState, use } from "react";
import { ArrowUpRight, ArrowDownRight, Activity, Star } from "lucide-react";

export default function InstrumentPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const symbol = decodeURIComponent(unwrappedParams.id);
  const { funds, marginAvailable, placeOrder, orders, executeOrder, watchlist, toggleWatchlist } = useTrading();
  
  const [data, setData] = useState<any>(null);
  const [derivatives, setDerivatives] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"QUOTE" | "OPTIONS" | "FUTURES">("QUOTE");
  
  // Order Form State
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState("");
  const [isMarket, setIsMarket] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await fetch(`/api/quotes?symbol=${symbol}`);
        const result = await res.json();
        if (!res.ok) {
           setError(result.error || "Failed to fetch market data.");
           return;
        }
        setData(result);
        setError(null);
      } catch (e: any) {
        setError(e.message);
        console.error(e);
      }
    };
    fetchQuote();
    const interval = setInterval(fetchQuote, 2000);
    return () => clearInterval(interval);
  }, [symbol]);

  // Fetch derivatives only when tabs are switched
  useEffect(() => {
    if (activeTab !== "QUOTE" && !derivatives && data) {
      fetch(`/api/derivatives?symbol=${encodeURIComponent(symbol)}&ltp=${data.ltp}`)
        .then(res => res.json())
        .then(d => {
           setDerivatives(d);
           if (d.optionsChain && d.optionsChain.length > 0) {
             setSelectedExpiry(d.optionsChain[0].expiry);
           }
        });
    }
  }, [activeTab, symbol, derivatives, data]);

  // Order Matching Logic
  useEffect(() => {
    if (!data || !data.depth) return;
    
    const pendingOrders = orders.filter(o => o.symbol === symbol && o.status === "PENDING");
    pendingOrders.forEach(order => {
      const bestAsk = data.depth.asks?.[0]?.price;
      const bestBid = data.depth.bids?.[0]?.price;

      if (order.limitPrice === null) {
        // Market order - match against best bid/ask
        const price = order.type === "BUY" ? bestAsk : bestBid;
        if (price != null) executeOrder(order.id, price);
      } else {
        // Limit order
        if (order.type === "BUY" && bestAsk != null && bestAsk <= order.limitPrice) {
          executeOrder(order.id, bestAsk);
        } else if (order.type === "SELL" && bestBid != null && bestBid >= order.limitPrice) {
          executeOrder(order.id, bestBid);
        }
      }
    });
  }, [data, orders, symbol, executeOrder]);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const res = placeOrder({
      symbol,
      instrument_type: data.instrument_type,
      security_id: data.security_id,
      exchange: data.exchange,
      type: orderType as any,
      quantity: Number(quantity),
      limitPrice: isMarket ? null : Number(limitPrice),
      currentLtp: data.ltp
    });
    if (res.success) {
       alert("Order Placed");
    } else {
       alert(res.message);
    }
  };

  const calculateReqMargin = () => {
     if (!data) return 0;
     const price = isMarket ? data.ltp : Number(limitPrice || 0);
     if (data.instrument_type === 'EQ' || data.instrument_type === 'ES') return (quantity * price) * 0.20;
     if (data.instrument_type.includes('FUT')) return (quantity * price) * 0.15;
     if (data.instrument_type.includes('OPT')) {
         if (orderType === 'BUY') return quantity * price;
         const parts = symbol.split('-');
         const strikePart = parts[parts.length - 2];
         const strikeVal = parseFloat(strikePart) || price * 100;
         return (quantity * strikeVal) * 0.15;
     }
     return quantity * price;
  };

  const calculateEstCharges = () => {
     if (!data) return 0;
     const price = isMarket ? data.ltp : Number(limitPrice || 0);
     if (data.instrument_type.includes('FUT') || data.instrument_type.includes('OPT')) return 25.0;
     return Math.min((quantity * price) * 0.0003, 20.0);
  };

  if (error) return (
    <div style={{ padding: "40px", textAlign: "center", color: "var(--trade-down)" }}>
      <h3>Error Loading Market Data</h3>
      <p>{error}</p>
      <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>Please check your .env.local credentials and ensure PAYTM_MONEY_ACCESS_TOKEN is set.</p>
    </div>
  );

  if (!data) return <div style={{ padding: "40px", textAlign: "center" }}>Loading Market Data...</div>;

  const isUp = data.change >= 0;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%", padding: "16px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
      {/* Main Column */}
      <div>
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <h1 style={{ fontSize: "36px", margin: 0 }}>{symbol}</h1>
            <button 
               onClick={() => toggleWatchlist({ symbol, security_id: data.security_id, exchange: data.exchange, instrument_type: data.instrument_type })}
               style={{
                 background: "rgba(255,255,255,0.05)",
                 border: "1px solid var(--border-light)",
                 padding: "12px",
                 borderRadius: "12px",
                 cursor: "pointer",
                 display: "flex",
                 alignItems: "center",
                 gap: "8px",
                 color: "var(--text-primary)",
                 fontWeight: 600
               }}
            >
               <Star size={24} fill={watchlist.some(w => w.symbol === symbol) ? "var(--accent-primary)" : "none"} color={watchlist.some(w => w.symbol === symbol) ? "var(--accent-primary)" : "var(--text-muted)"} />
               <span>{watchlist.some(w => w.symbol === symbol) ? "Watchlisted" : "Add to Watchlist"}</span>
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
            <span style={{ fontSize: "48px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
              ₹{data.ltp.toFixed(2)}
            </span>
            <span style={{ 
              fontSize: "20px", 
              fontWeight: 600, 
              color: isUp ? "var(--trade-up)" : "var(--trade-down)",
              display: "flex",
              alignItems: "center"
            }}>
              {isUp ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
              {Math.abs(data.change).toFixed(2)} ({Math.abs(data.changePercent).toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "24px", borderBottom: "1px solid var(--border-light)" }}>
          {["QUOTE", "OPTIONS", "FUTURES"].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                background: "none",
                border: "none",
                color: activeTab === tab ? "var(--accent-primary)" : "var(--text-secondary)",
                padding: "12px 0",
                fontSize: "16px",
                fontWeight: 600,
                borderBottom: activeTab === tab ? "2px solid var(--accent-primary)" : "2px solid transparent",
                cursor: "pointer"
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "QUOTE" && data.instrument_type !== "I" && (
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ marginBottom: "16px", fontSize: "18px" }}>Market Depth (Order Book)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Bids */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", marginBottom: "8px", fontSize: "12px", fontWeight: 600 }}>
                  <span>BID</span>
                  <span>QTY</span>
                </div>
                {data.depth.bids.map((b: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", color: "var(--trade-up)" }}>
                    <span>{b.price != null ? b.price.toFixed(2) : "0.00"}</span>
                    <span>{b.quantity}</span>
                  </div>
                ))}
              </div>
              {/* Asks */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", marginBottom: "8px", fontSize: "12px", fontWeight: 600 }}>
                  <span>ASK</span>
                  <span>QTY</span>
                </div>
                {data.depth.asks.map((a: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", color: "var(--trade-down)" }}>
                    <span>{a.price != null ? a.price.toFixed(2) : "0.00"}</span>
                    <span>{a.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "QUOTE" && data.instrument_type === "I" && (
           <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
             Order Book (Market Depth) is not available for Indices.
           </div>
        )}

        {activeTab === "OPTIONS" && derivatives && (
           <div className="glass-panel" style={{ padding: "24px" }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
               <h3 style={{ fontSize: "18px" }}>Option Chain</h3>
               {derivatives.optionsChain.length > 0 && (
                 <select 
                   value={selectedExpiry || ""} 
                   onChange={(e) => setSelectedExpiry(e.target.value)}
                   style={{ padding: "8px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-light)", color: "var(--text-primary)", borderRadius: "8px", fontWeight: 600, outline: "none" }}
                 >
                   {derivatives.optionsChain.map((chain: any, i: number) => (
                     <option key={i} value={chain.expiry} style={{ background: "var(--bg-dark)" }}>
                       {chain.expiry.split(' ')[0]}
                     </option>
                   ))}
                 </select>
               )}
             </div>
             
             {derivatives.optionsChain.length === 0 && <div style={{ color: "var(--text-secondary)" }}>No options available for this instrument.</div>}
             {derivatives.optionsChain.filter((c: any) => c.expiry === selectedExpiry).map((chain: any, i: number) => (
               <div key={i} style={{ marginBottom: "24px" }}>
                 <table style={{ width: "100%", textAlign: "center", borderCollapse: "collapse" }}>
                   <thead>
                     <tr style={{ borderBottom: "1px solid var(--border-light)", color: "var(--text-secondary)" }}>
                       <th style={{ padding: "8px", width: "33%" }}>Call (CE)</th>
                       <th style={{ padding: "8px", width: "33%" }}>Strike</th>
                       <th style={{ padding: "8px", width: "33%" }}>Put (PE)</th>
                     </tr>
                   </thead>
                   <tbody>
                     {chain.strikes.map((s: any, j: number) => {
                       const isCallItm = data && parseFloat(s.strike) < data.ltp;
                       const isPutItm = data && parseFloat(s.strike) > data.ltp;
                       return (
                         <tr key={j} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                           <td style={{ padding: "8px", background: isCallItm ? "rgba(255, 215, 0, 0.05)" : "transparent" }}>
                             {s.callSymbol ? (
                               <a href={`/instrument/${encodeURIComponent(s.callSymbol)}`} style={{ color: "var(--trade-up)", textDecoration: "none", fontWeight: 600 }}>
                                 ₹{s.callLtp.toFixed(2)}
                               </a>
                             ) : "-"}
                           </td>
                           <td style={{ padding: "8px", fontWeight: 600, color: "var(--text-primary)" }}>{s.strike}</td>
                           <td style={{ padding: "8px", background: isPutItm ? "rgba(255, 215, 0, 0.05)" : "transparent" }}>
                             {s.putSymbol ? (
                               <a href={`/instrument/${encodeURIComponent(s.putSymbol)}`} style={{ color: "var(--trade-down)", textDecoration: "none", fontWeight: 600 }}>
                                 ₹{s.putLtp.toFixed(2)}
                               </a>
                             ) : "-"}
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
             ))}
           </div>
        )}

        {activeTab === "FUTURES" && derivatives && (
           <div className="glass-panel" style={{ padding: "24px" }}>
             <h3 style={{ marginBottom: "16px", fontSize: "18px" }}>Futures</h3>
             {derivatives.futures.length === 0 && <div style={{ color: "var(--text-secondary)" }}>No futures available for this instrument.</div>}
             {derivatives.futures.map((f: any, i: number) => (
               <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderBottom: "1px solid var(--border-light)" }}>
                 <div>
                   <div style={{ fontWeight: 600, fontSize: "16px" }}>{f.symbol}</div>
                   <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Expiry: {f.expiry.split(' ')[0]}</div>
                 </div>
                 <a href={`/instrument/${encodeURIComponent(f.symbol)}`} style={{
                    padding: "8px 16px",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    textDecoration: "none",
                    fontWeight: 600
                 }}>
                   ₹{f.ltp.toFixed(2)}
                 </a>
               </div>
             ))}
           </div>
        )}
      </div>

      {/* Sidebar / Order Entry */}
      <div>
        <div className="glass-panel" style={{ padding: "24px", position: "sticky", top: "16px" }}>
          {data && data.instrument_type === "I" ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px 0" }}>
              Ordering is not available for Indices.
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: "20px", marginBottom: "24px" }}>Place Order</h2>
              
              <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                <button 
                  onClick={() => setOrderType("BUY")}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: orderType === "BUY" ? "var(--trade-up)" : "var(--bg-dark)",
                    color: orderType === "BUY" ? "white" : "var(--text-primary)"
                  }}
                >BUY</button>
                <button 
                  onClick={() => setOrderType("SELL")}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: orderType === "SELL" ? "var(--trade-down)" : "var(--bg-dark)",
                    color: orderType === "SELL" ? "white" : "var(--text-primary)"
                  }}
                >SELL</button>
              </div>

              <form onSubmit={handlePlaceOrder} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                   <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)" }}>Order Type</label>
                   <div style={{ display: "flex", gap: "16px" }}>
                     <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                       <input type="radio" checked={isMarket} onChange={() => setIsMarket(true)} /> Market
                     </label>
                     <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                       <input type="radio" checked={!isMarket} onChange={() => setIsMarket(false)} /> Limit
                     </label>
                   </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)" }}>Quantity</label>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value as any)}
                    style={{
                      width: "100%", padding: "12px", background: "var(--bg-dark)", 
                      border: "1px solid var(--border-light)", color: "var(--text-primary)", borderRadius: "8px"
                    }}
                    min="1"
                    required
                  />
                </div>

                {!isMarket && (
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)" }}>Limit Price</label>
                    <input 
                      type="number" 
                      value={limitPrice} 
                      onChange={e => setLimitPrice(e.target.value as any)}
                      style={{
                        width: "100%", padding: "12px", background: "var(--bg-dark)", 
                        border: "1px solid var(--border-light)", color: "var(--text-primary)", borderRadius: "8px"
                      }}
                      step="0.05"
                      required
                    />
                  </div>
                )}

                <div style={{ margin: "16px 0", padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", color: "var(--text-secondary)", fontSize: "14px" }}>
                    <span>Margin Required:</span>
                    <span>₹{calculateReqMargin().toFixed(2)} <span style={{fontSize: "12px", opacity: 0.7}}>+ ₹{calculateEstCharges().toFixed(2)} charges</span></span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "14px" }}>
                    <span>Margin Available:</span>
                    <span style={{ color: "var(--text-primary)" }}>₹{marginAvailable.toFixed(2)}</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  style={{
                    padding: "16px",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "16px",
                    cursor: "pointer",
                    background: orderType === "BUY" ? "var(--trade-up)" : "var(--trade-down)",
                    color: "white",
                    boxShadow: "var(--shadow-glow)"
                  }}
                >
                  Confirm {orderType}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
