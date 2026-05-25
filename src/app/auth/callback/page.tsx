"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"LOADING" | "SUCCESS" | "ERROR">("LOADING");
  const [message, setMessage] = useState("Exchanging request token for access token...");

  useEffect(() => {
    const requestToken = searchParams.get("requestToken");
    
    if (!requestToken) {
      setStatus("ERROR");
      setMessage("No requestToken found in URL parameters.");
      return;
    }

    const exchangeToken = async () => {
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ request_token: requestToken })
        });

        const data = await res.json();

        if (res.ok && data.access_token) {
           setStatus("SUCCESS");
           setMessage("Access token successfully generated and written to .env.local!");
        } else {
           setStatus("ERROR");
           setMessage(data.error || data.message || "Failed to exchange token.");
        }
      } catch (err: any) {
        setStatus("ERROR");
        setMessage(err.message || "An unexpected error occurred.");
      }
    };

    exchangeToken();
  }, [searchParams]);

  return (
    <div style={{ maxWidth: "600px", margin: "100px auto", textAlign: "center", padding: "40px" }} className="glass-panel">
      {status === "LOADING" && (
        <div style={{ color: "var(--accent-primary)" }}>
           <Loader2 size={64} className="spin" style={{ margin: "0 auto", marginBottom: "24px" }} />
           <h1 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Authenticating...</h1>
           <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>{message}</p>
        </div>
      )}

      {status === "SUCCESS" && (
        <div style={{ color: "var(--trade-up)" }}>
           <CheckCircle size={64} style={{ margin: "0 auto", marginBottom: "24px" }} />
           <h1 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Authentication Successful</h1>
           <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>{message}</p>
           
           <div style={{ padding: "16px", background: "rgba(255, 170, 0, 0.1)", border: "1px solid rgba(255, 170, 0, 0.3)", borderRadius: "8px", marginTop: "24px", color: "var(--text-primary)" }}>
              <strong>Important:</strong> Since your .env.local file was updated automatically, you MUST restart your Next.js development server for the changes to take effect.
           </div>

           <Link href="/" style={{ display: "inline-block", marginTop: "32px", padding: "12px 32px", background: "var(--accent-primary)", color: "white", borderRadius: "8px", textDecoration: "none", fontWeight: 600 }}>
             Return to Dashboard
           </Link>
        </div>
      )}

      {status === "ERROR" && (
        <div style={{ color: "var(--trade-down)" }}>
           <XCircle size={64} style={{ margin: "0 auto", marginBottom: "24px" }} />
           <h1 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Authentication Failed</h1>
           <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>{message}</p>
           
           <Link href="/" style={{ display: "inline-block", marginTop: "32px", padding: "12px 32px", background: "var(--bg-panel)", border: "1px solid var(--border-light)", color: "var(--text-primary)", borderRadius: "8px", textDecoration: "none", fontWeight: 600 }}>
             Go Back
           </Link>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}
