import { NextResponse } from "next/server";
import { getMemoryKey } from "@/lib/memory";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prefParam = searchParams.get("prefs");

  if (!prefParam) {
    return NextResponse.json({ error: "prefs parameter is required" }, { status: 400 });
  }

  const accessToken = await getMemoryKey('PAYTM_MONEY_ACCESS_TOKEN');
  if (!accessToken) {
    return NextResponse.json({ error: "Access token missing" }, { status: 401 });
  }

  const prefs = prefParam.split(',');
  const ltpMap: Record<string, number> = {};

  try {
    const chunkSize = 40;
    for (let i = 0; i < prefs.length; i += chunkSize) {
      const chunk = prefs.slice(i, i + chunkSize);
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
    }
    
    return NextResponse.json(ltpMap);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
