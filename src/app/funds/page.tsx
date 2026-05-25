"use client";

import { useTrading } from "@/context/TradingContext";
import { useState } from "react";
import { Wallet } from "lucide-react";

export default function FundsPage() {
  const { funds, marginBlocked, marginAvailable, addFunds, withdrawFunds } = useTrading();
  const [fundAmount, setFundAmount] = useState("");

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%", padding: "16px" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "32px" }}>Ledger & Funds</h1>

      <div className="glass-panel" style={{ padding: "32px", marginBottom: "40px" }}>
         <h2 style={{ fontSize: "20px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Wallet size={24} color="var(--accent-primary)" /> Ledger Overview
         </h2>
         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px", marginBottom: "32px" }}>
            <div>
               <div style={{ color: "var(--text-secondary)", fontSize: "16px", marginBottom: "8px" }}>Total Funds</div>
               <div style={{ fontSize: "32px", fontWeight: 700 }}>₹{funds.toFixed(2)}</div>
            </div>
            <div>
               <div style={{ color: "var(--text-secondary)", fontSize: "16px", marginBottom: "8px" }}>Margin Blocked</div>
               <div style={{ fontSize: "32px", fontWeight: 700, color: "var(--trade-down)" }}>₹{marginBlocked.toFixed(2)}</div>
            </div>
            <div>
               <div style={{ color: "var(--text-secondary)", fontSize: "16px", marginBottom: "8px" }}>Margin Available</div>
               <div style={{ fontSize: "32px", fontWeight: 700, color: "var(--trade-up)" }}>₹{marginAvailable.toFixed(2)}</div>
            </div>
         </div>
         
         <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <input 
              type="number" 
              value={fundAmount} 
              onChange={e => setFundAmount(e.target.value)} 
              placeholder="Amount (₹)" 
              style={{ padding: "16px", background: "var(--bg-dark)", border: "1px solid var(--border-light)", color: "white", borderRadius: "8px", fontSize: "16px", flex: 1, minWidth: "200px" }}
            />
            <button 
               onClick={() => { addFunds(Number(fundAmount)); setFundAmount(""); }}
               style={{ padding: "16px 32px", background: "var(--accent-primary)", border: "none", color: "white", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "16px" }}
            >Add Funds</button>
            <button 
               onClick={() => { withdrawFunds(Number(fundAmount)); setFundAmount(""); }}
               style={{ padding: "16px 32px", background: "transparent", border: "1px solid var(--text-secondary)", color: "var(--text-primary)", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "16px" }}
            >Withdraw</button>
         </div>
      </div>
    </div>
  );
}
