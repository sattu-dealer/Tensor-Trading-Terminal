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

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  // 1. Get security details from SQLite
  const stmt = db.prepare(`SELECT security_id, exchange, instrument_type FROM securities WHERE symbol = ? OR name = ? LIMIT 1`);
  const security = stmt.get(symbol, symbol) as any;

  if (!security) {
    return NextResponse.json({ error: "Security not found in master" }, { status: 404 });
  }

  // 2. Fetch real data from Paytm Money
  const accessToken = await getMemoryKey('PAYTM_MONEY_ACCESS_TOKEN');
  
  if (!accessToken) {
    return NextResponse.json({ error: "PAYTM_MONEY_ACCESS_TOKEN is missing in memory" }, { status: 401 });
  }

  try {
    // According to Paytm Money Open API, the live market data endpoint format:
    // GET https://developer.paytmmoney.com/data/v1/price/live?mode=FULL&pref=EXCHANGE:SECURITY_ID
    const pref = `${security.exchange}:${security.security_id}`;
    const pmUrl = `https://developer.paytmmoney.com/data/v1/price/live?mode=FULL&pref=${pref}`;

    const response = await fetch(pmUrl, {
      headers: {
        "x-jwt-token": accessToken
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Paytm API Error: ${response.status} ${errorData}`);
    }

    const pmData = await response.json();
    
    // 3. Map Paytm response to our app's structure
    // Paytm's response structure usually wraps data in an array inside 'data'
    const itemData = pmData.data?.[0];

    // If market is closed and live API clears its cache, it returns found: false
    if (!itemData || itemData.found === false) {
      return NextResponse.json({
        symbol,
        instrument_type: security.instrument_type,
        ltp: 0,
        change: 0,
        changePercent: 0,
        depth: { bids: [], asks: [] }
      });
    }

    // Adapt Paytm's depth array to our bids/asks structure
    // Usually Paytm returns depth as an array of 5 objects containing buyPrice/buyQty and sellPrice/sellQty
    const depth: { bids: any[], asks: any[] } = { bids: [], asks: [] };
    
    if (itemData.depth) {
       depth.bids = itemData.depth.buy ? itemData.depth.buy.filter((b: any) => b.price != null).map((b: any) => ({ price: b.price, quantity: b.quantity })) : [];
       depth.asks = itemData.depth.sell ? itemData.depth.sell.filter((a: any) => a.price != null).map((a: any) => ({ price: a.price, quantity: a.quantity })) : [];
    }

    return NextResponse.json({
      symbol,
      security_id: security.security_id,
      exchange: security.exchange,
      instrument_type: security.instrument_type,
      ltp: itemData.lastTradedPrice || itemData.ltp || 0,
      change: itemData.changeAbsolute || 0,
      changePercent: itemData.changePercent || 0,
      depth
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
