import { NextResponse } from "next/server";
import { getMemoryKey } from "@/lib/memory";

export async function GET(request: Request) {
  try {
    const accessToken = await getMemoryKey('MARKET_ACCESS_TOKEN');
    if (!accessToken) {
      return NextResponse.json({ status: "UNKNOWN", error: "Missing Access Token" }, { status: 401 });
    }

    // Ping NIFTY 50 to check market status
    // NIFTY 50 Security ID is typically 26000 or similar, but the exact symbol might vary.
    // Instead of a specific ID, let's use the widely known NSE:26000 (NIFTY 50) or just fetch the search index for NIFTY 50
    // Actually, NIFTY 50 is NSE:26000
    const pref = "NSE:26000:LTP";
    const pmUrl = `https://developer.paytmmoney.com/data/v1/price/live?mode=LTP&pref=${pref}`;

    const pmResponse = await fetch(pmUrl, {
      method: "GET",
      headers: {
        "x-jwt-token": accessToken,
      },
      cache: "no-store",
    });

    if (!pmResponse.ok) {
       return NextResponse.json({ status: "UNKNOWN", error: "Failed to fetch from PM API" });
    }

    const pmData = await pmResponse.json();
    if (!pmData.data || pmData.data.length === 0) {
       return NextResponse.json({ status: "UNKNOWN", error: "No data returned" });
    }

    const item = pmData.data[0];
    if (item.found === false) {
       return NextResponse.json({ status: "CLOSED" });
    }

    // Check lastTradedTime
    // PM API returns lastTradedTime in Unix epoch seconds
    const lastTradedSeconds = item.lastTradedTime || item.lastUpdateDate || item.lastTradeTime;
    if (!lastTradedSeconds) {
       // If no time is available but found is true, assume closed safely
       return NextResponse.json({ status: "CLOSED" });
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const diffMinutes = (nowSeconds - lastTradedSeconds) / 60;

    // If the last trade was more than 10 minutes ago, market is closed
    const status = diffMinutes < 10 ? "OPEN" : "CLOSED";

    return NextResponse.json({ status, diffMinutes, lastTradedSeconds, nowSeconds });

  } catch (error: any) {
    return NextResponse.json({ status: "UNKNOWN", error: error.message });
  }
}
