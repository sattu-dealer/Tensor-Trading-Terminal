"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Lock, User, ArrowRight } from "lucide-react";

export default function LoginScreen() {
  const { login } = useAuth();
  const [userId, setUserId] = useState("");
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(userId, passkey);
    setLoading(false);
    if (!success) {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500); // remove shake class after animation
    }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100vh",
      background: "var(--bg-dark)",
      backgroundImage: "radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.04), transparent 25%), radial-gradient(circle at 85% 30%, rgba(16, 185, 129, 0.03), transparent 25%)",
      fontFamily: "var(--font-sans)",
      color: "var(--text-primary)"
    }}>
      
      {/* CSS for shake animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          50% { transform: translateX(10px); }
          75% { transform: translateX(-10px); }
        }
        .shake-anim {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}} />

      <div 
        className={`glass-panel ${shake ? 'shake-anim' : ''}`}
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: error ? "1px solid var(--trade-down)" : "1px solid var(--border-light)"
        }}
      >
        
        <div style={{ marginBottom: "32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h1 style={{ 
            fontSize: "36px", 
            color: "var(--accent-primary)", 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            marginBottom: "8px"
          }}>
            <div style={{ width: "18px", height: "18px", background: "var(--accent-primary)", borderRadius: "50%", boxShadow: "var(--shadow-glow)" }} />
            Tensor
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>Sign in to access your premium terminal</p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ position: "relative" }}>
            <User size={18} color="var(--text-muted)" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="User ID"
              value={userId}
              onChange={(e) => { setUserId(e.target.value); setError(false); }}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid var(--border-light)",
                borderRadius: "12px",
                padding: "16px 16px 16px 44px",
                color: "white",
                fontSize: "15px",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--border-focus)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border-light)"}
            />
          </div>

          <div style={{ position: "relative" }}>
            <Lock size={18} color="var(--text-muted)" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="password"
              placeholder="Passkey"
              value={passkey}
              onChange={(e) => { setPasskey(e.target.value); setError(false); }}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid var(--border-light)",
                borderRadius: "12px",
                padding: "16px 16px 16px 44px",
                color: "white",
                fontSize: "15px",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--border-focus)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border-light)"}
            />
          </div>

          {error && (
            <div style={{ color: "var(--trade-down)", fontSize: "13px", textAlign: "center", marginTop: "-8px" }}>
              Invalid User ID or Passkey
            </div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              background: "var(--accent-primary)",
              color: "white",
              border: "none",
              padding: "16px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "8px",
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "var(--accent-primary-hover)"}
            onMouseOut={(e) => e.currentTarget.style.background = "var(--accent-primary)"}
          >
            Access Terminal <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
