import { NextResponse } from "next/server";
import { setMemoryKey } from "@/lib/memory";

export async function POST(request: Request) {
  try {
    const { request_token } = await request.json();

    if (!request_token) {
      return NextResponse.json({ error: "request_token is required" }, { status: 400 });
    }

    const apiKey = process.env.PAYTM_MONEY_API_KEY || process.env.MARKET_API_KEY;
    const apiSecret = process.env.PAYTM_MONEY_API_SECRET || process.env.MARKET_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "API credentials not configured in environment" }, { status: 500 });
    }

    // According to Paytm Money Open API documentation, the endpoint to generate session is:
    // POST https://developer.paytmmoney.com/accounts/v2/gettoken
    // with body { api_key, api_secret_key, request_token }
    
    const response = await fetch("https://developer.paytmmoney.com/accounts/v2/gettoken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        api_secret_key: apiSecret,
        request_token: request_token
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // data typically contains { access_token, public_access_token, read_access_token }
    if (data.access_token) {
        await setMemoryKey('PAYTM_MONEY_ACCESS_TOKEN', data.access_token);
        await setMemoryKey('PAYTM_MONEY_REQUEST_TOKEN', request_token);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
