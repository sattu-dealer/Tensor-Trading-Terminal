import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

// Initialize SQLite DB connection once
const DB_PATH = path.join(process.cwd(), "data", "securities.db");
let db: Database.Database | null = null;

try {
  db = new Database(DB_PATH, { readonly: true });
} catch (e) {
  console.error("Could not open securities.db. Did you run the sync script?");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    // Perform partial match on symbol or name, limit to top 50 results
    const stmt = db.prepare(`
      SELECT security_id as id, CASE WHEN symbol = '' THEN name ELSE symbol END as symbol, name, instrument_type as type, exchange 
      FROM securities 
      WHERE symbol LIKE ? OR name LIKE ?
      ORDER BY 
        CASE WHEN symbol = ? OR name = ? THEN 1 WHEN symbol LIKE ? OR name LIKE ? THEN 2 ELSE 3 END,
        CASE 
          WHEN instrument_type = 'I' THEN 1 
          WHEN instrument_type = 'ES' THEN 2 
          WHEN instrument_type = 'ETF' THEN 3
          WHEN instrument_type LIKE 'FUT%' THEN 4
          ELSE 5
        END,
        name ASC
      LIMIT 50
    `);
    
    // Using %QUERY% for partial matching everywhere
    const exact = query.toUpperCase();
    const exactStart = `${query.toUpperCase()}%`;
    const partial = `%${query.toUpperCase()}%`;
    
    const results = stmt.all(partial, partial, exact, exact, exactStart, exactStart);
    
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
