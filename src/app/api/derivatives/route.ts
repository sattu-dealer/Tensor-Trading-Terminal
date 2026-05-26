import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { getMemoryKey } from "@/lib/memory";

const DB_PATH = path.join(process.cwd(), "data", "securities.db");
let db: Database.Database | null = null;

try {
  db = new Database(DB_PATH, { readonly: true });
} catch (e) {}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const ltpParam = searchParams.get("ltp");
  const baseLtp = ltpParam ? parseFloat(ltpParam) : 0;

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    // 1. Fetch Futures
    const futStmt = db.prepare(`
      SELECT security_id, exchange, symbol, expiry_date as expiry 
      FROM securities 
      WHERE instrument_type IN ('FUTSTK', 'FUTIDX') AND symbol LIKE ? 
      ORDER BY expiry_date ASC
    `);
    const futuresRaw = futStmt.all(`${symbol}-%`);

    // 2. Fetch Options
    const optStmt = db.prepare(`
      SELECT security_id, exchange, symbol, expiry_date as expiry, strike_price as strike 
      FROM securities 
      WHERE instrument_type IN ('OPTSTK', 'OPTIDX') AND symbol LIKE ? 
      ORDER BY expiry_date ASC, CAST(strike_price AS REAL) ASC
    `);
    const optionsRaw = optStmt.all(`${symbol}-%`);

    // 3. Group Options into Chain & Slice to ATM +/- 5
    const expiryDates = Array.from(new Set(optionsRaw.map((o: any) => o.expiry)));
    
    const optionsChain = expiryDates.map(expiry => {
       const optsForExpiry = optionsRaw.filter((o: any) => o.expiry === expiry);
       const strikesSet = Array.from(new Set(optsForExpiry.map((o: any) => parseFloat(o.strike)))).sort((a, b) => a - b);
       
       let atmIndex = 0;
       let minDiff = Infinity;
       strikesSet.forEach((strike, index) => {
           const diff = Math.abs(strike - baseLtp);
           if (diff < minDiff) {
               minDiff = diff;
               atmIndex = index;
           }
       });

       const startIndex = Math.max(0, atmIndex - 5);
       const endIndex = Math.min(strikesSet.length - 1, atmIndex + 5);
       const slicedStrikes = strikesSet.slice(startIndex, endIndex + 1);
       
       const strikes = slicedStrikes.map(strike => {
           const calls: any[] = optsForExpiry.filter((o: any) => parseFloat(o.strike) === strike && o.symbol.endsWith('CE'));
           const puts: any[] = optsForExpiry.filter((o: any) => parseFloat(o.strike) === strike && o.symbol.endsWith('PE'));
           return {
              strike,
              call: calls.length > 0 ? { symbol: calls[0].symbol, id: calls[0].security_id, exchange: calls[0].exchange } : null,
              put: puts.length > 0 ? { symbol: puts[0].symbol, id: puts[0].security_id, exchange: puts[0].exchange } : null
           };
       });

       return { expiry, strikes };
    });

    // 4. Batch Fetch LTPs
    const prefs: string[] = [];
    futuresRaw.forEach((f: any) => prefs.push(`${f.exchange}:${f.security_id}:LTP`));
    optionsChain.forEach(chain => {
       chain.strikes.forEach(s => {
          if (s.call) prefs.push(`${s.call.exchange}:${s.call.id}:LTP`);
          if (s.put) prefs.push(`${s.put.exchange}:${s.put.id}:LTP`);
       });
    });

    const ltpMap: Record<string, number> = {};
    const accessToken = await getMemoryKey('MARKET_ACCESS_TOKEN');
    
    if (accessToken && prefs.length > 0) {
       const chunkSize = 40;
       for (let i = 0; i < prefs.length; i += chunkSize) {
           const chunk = prefs.slice(i, i + chunkSize);
           try {
               const pmUrl = `https://developer.paytmmoney.com/data/v1/price/live?mode=LTP&pref=${chunk.join(',')}`;
               const response = await fetch(pmUrl, { headers: { "x-jwt-token": accessToken } });
               if (response.ok) {
                   const data = await response.json();
                   data.data?.forEach((item: any) => {
                       if (item.found !== false && item.lastTradedPrice != null) {
                           ltpMap[item.security_id.toString()] = item.lastTradedPrice;
                       }
                   });
               }
           } catch (e) {}
       }
    }

    // 5. Map back to final response
    const futures = futuresRaw.map((f: any) => ({
       symbol: f.symbol,
       expiry: f.expiry,
       ltp: ltpMap[f.security_id.toString()] || 0
    }));

    const finalOptionsChain = optionsChain.map(chain => ({
       ...chain,
       strikes: chain.strikes.map(s => ({
          strike: s.strike,
          callSymbol: s.call?.symbol || null,
          callLtp: s.call ? (ltpMap[s.call.id.toString()] || 0) : 0,
          putSymbol: s.put?.symbol || null,
          putLtp: s.put ? (ltpMap[s.put.id.toString()] || 0) : 0
       }))
    }));

    return NextResponse.json({
      symbol,
      optionsChain: finalOptionsChain,
      futures
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
