import fs from 'fs';
import path from 'path';

async function generateToken() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  let apiKey = '';
  let apiSecret = '';
  let reqToken = '';

  envContent.split('\n').forEach(line => {
    if (line.startsWith('PAYTM_MONEY_API_KEY=')) apiKey = line.split('=')[1].trim();
    if (line.startsWith('PAYTM_MONEY_API_SECRET=')) apiSecret = line.split('=')[1].trim();
    if (line.startsWith('PAYTM_MONEY_REQUEST_TOKEN=')) reqToken = line.split('=')[1].trim();
  });

  if (!apiKey || !apiSecret || !reqToken) {
    console.error("Missing credentials in .env.local");
    process.exit(1);
  }

  console.log("Exchanging Request Token for Access Token...");

  try {
    const response = await fetch("https://developer.paytmmoney.com/accounts/v2/gettoken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        api_secret_key: apiSecret,
        request_token: reqToken
      })
    });

    const data = await response.json();
    
    if (response.ok && data.access_token) {
       console.log("Successfully retrieved access token!");
       fs.appendFileSync(envPath, `\nPAYTM_MONEY_ACCESS_TOKEN=${data.access_token}\n`);
       console.log("Saved PAYTM_MONEY_ACCESS_TOKEN to .env.local");
    } else {
       console.error("Failed to generate token. Paytm returned:", data);
    }
  } catch (err) {
    console.error("Error exchanging token:", err);
  }
}

generateToken();
