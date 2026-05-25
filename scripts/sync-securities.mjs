import https from 'https';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import Database from 'better-sqlite3';

const DB_PATH = path.join(process.cwd(), 'data', 'securities.db');
const CSV_URL = 'https://developer.paytmmoney.com/data/v1/scrips/security_master.csv';

// Initialize SQLite DB
const db = new Database(DB_PATH);

// Create table (drop if exists to refresh)
db.exec(`
  DROP TABLE IF EXISTS securities;
  CREATE TABLE securities (
    security_id TEXT,
    symbol TEXT,
    name TEXT,
    series TEXT,
    tick_size TEXT,
    lot_size TEXT,
    instrument_type TEXT,
    segment TEXT,
    exchange TEXT,
    upper_limit TEXT,
    lower_limit TEXT,
    expiry_date TEXT,
    strike_price TEXT,
    freeze_quantity TEXT
  );
`);

// Optimize performance for bulk insert
db.pragma('journal_mode = WAL');
db.pragma('synchronous = OFF');

const insertStmt = db.prepare(`
  INSERT INTO securities (
    security_id, symbol, name, series, tick_size, lot_size, 
    instrument_type, segment, exchange, upper_limit, lower_limit, 
    expiry_date, strike_price, freeze_quantity
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// We'll use a transaction for speed
const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    insertStmt.run(
      row.security_id, row.symbol, row.name, row.series, 
      row.tick_size, row.lot_size, row.instrument_type, 
      row.segment, row.exchange, row.upper_limit, 
      row.lower_limit, row.expiry_date, row.strike_price, row.freeze_quantity
    );
  }
});

console.log('Downloading and parsing security_master.csv...');

const req = https.get(CSV_URL, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to download CSV: HTTP ${res.statusCode}`);
    process.exit(1);
  }

  let batch = [];
  const BATCH_SIZE = 10000;
  let totalImported = 0;

  res.pipe(csv())
    .on('data', (data) => {
      batch.push(data);
      if (batch.length >= BATCH_SIZE) {
        insertMany(batch);
        totalImported += batch.length;
        console.log(`Imported ${totalImported} rows...`);
        batch = [];
      }
    })
    .on('end', () => {
      if (batch.length > 0) {
        insertMany(batch);
        totalImported += batch.length;
      }
      
      // Create indexes for fast search
      console.log('Creating indexes...');
      db.exec('CREATE INDEX idx_symbol ON securities(symbol);');
      db.exec('CREATE INDEX idx_name ON securities(name);');
      
      console.log(`Successfully imported ${totalImported} total securities.`);
      db.close();
    })
    .on('error', (err) => {
      console.error('Error parsing CSV:', err);
      db.close();
      process.exit(1);
    });
});

req.on('error', (err) => {
  console.error('Network error:', err);
  process.exit(1);
});
