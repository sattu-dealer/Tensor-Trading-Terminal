import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.PAYTM_MONEY_API_KEY || process.env.MARKET_API_KEY;
  if (!apiKey) {
    return new NextResponse("API_KEY is not configured in environment variables", { status: 500 });
  }

  // Redirect to API Login Page
  const redirectUrl = `https://login.paytmmoney.com/merchant-login?apiKey=${apiKey}`;
  return NextResponse.redirect(redirectUrl);
}
