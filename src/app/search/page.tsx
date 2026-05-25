"use client";

import { useState } from "react";
import { Search as SearchIcon, ArrowRight, Layers } from "lucide-react";
import Link from "next/link";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || query.length < 2) return; // Require at least 2 chars
    
    setLoading(true);
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", padding: "16px" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "24px" }}>Search Markets</h1>
      
      <form onSubmit={handleSearch} style={{ position: "relative", marginBottom: "32px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Seach any scrip, future or option"
          style={{
            width: "100%",
            padding: "16px 24px 16px 56px",
            fontSize: "18px",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-light)",
            borderRadius: "16px",
            color: "var(--text-primary)",
            outline: "none",
            boxShadow: "var(--shadow-panel)"
          }}
        />
        <SearchIcon 
          size={24} 
          color="var(--text-muted)" 
          style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)" }} 
        />
        <button type="submit" style={{ display: "none" }}>Search</button>
      </form>

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px" }}>Searching Security Master...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {results.map((item) => {
             const isDerivative = item.type !== "EQ" && item.type !== "INDEX";
             return (
              <Link 
                key={item.id} 
                href={`/instrument/${encodeURIComponent(item.symbol)}`}
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
                  <div style={{ 
                    padding: "12px", 
                    background: "rgba(255,255,255,0.05)", 
                    borderRadius: "12px" 
                  }}>
                    {isDerivative ? <Layers size={24} color="var(--accent-primary)" /> : <SearchIcon size={24} color="var(--text-muted)" />}
                  </div>
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: 600 }}>{item.symbol}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
                      {item.name} &bull; 
                      <span style={{ 
                        marginLeft: "8px", 
                        padding: "2px 6px", 
                        background: "rgba(255,255,255,0.1)", 
                        borderRadius: "4px",
                        fontSize: "12px",
                        color: "var(--text-primary)"
                      }}>
                        {item.type} | {item.exchange}
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight size={20} color="var(--text-muted)" />
              </Link>
            )
          })}
          {results.length === 0 && query && !loading && (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px" }}>
              No results found for "{query}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
