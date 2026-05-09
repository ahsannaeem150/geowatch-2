#!/usr/bin/env node
/**
 * Backfill location_context for existing events.
 * Run: node scripts/backfill-location-context.mjs
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'geowatch_dev',
  user: process.env.DB_USER || 'geowatch_user',
  password: process.env.DB_PASSWORD || 'geowatch_dev_pass_2024',
});

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'GeoWatch/1.0 (https://geowatch.local)';

async function reverseGeocode(lat, lng) {
  try {
    const url = `${NOMINATIM_REVERSE_URL}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&addressdetails=1&zoom=10`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) {
      console.error(`    HTTP ${res.status}: ${res.statusText}`);
      return null;
    }

    const data = await res.json();

    if (data.error) {
      console.error(`    Nominatim error: ${data.error}`);
      return null;
    }

    if (!data.address) {
      console.error(`    No address in response`);
      console.error(`    Response:`, JSON.stringify(data).slice(0, 200));
      return null;
    }

    const addr = data.address;
    const parts = [];

    if (addr.state) parts.push(addr.state);
    else if (addr.province) parts.push(addr.province);
    else if (addr.region) parts.push(addr.region);
    else if (addr.county) parts.push(addr.county);

    if (addr.country) parts.push(addr.country);

    if (parts.length === 0) {
      console.error(`    No state/province/country found in address:`, JSON.stringify(addr));
      return null;
    }

    return parts.join(', ');
  } catch (err) {
    console.error(`    Exception: ${err.message}`);
    return null;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('Fetching events without location_context...');
  const result = await pool.query(
    `SELECT id, latitude, longitude FROM events 
     WHERE location_context IS NULL AND status != 'hidden'
     ORDER BY created_at DESC`
  );

  const events = result.rows;
  console.log(`Found ${events.length} events to backfill.\n`);

  if (events.length === 0) {
    console.log('Nothing to do. Exiting.');
    await pool.end();
    return;
  }

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`[${i + 1}/${events.length}] ${event.latitude}, ${event.longitude}`);
    const ctx = await reverseGeocode(event.latitude, event.longitude);

    if (ctx) {
      await pool.query('UPDATE events SET location_context = $1 WHERE id = $2', [
        ctx,
        event.id,
      ]);
      updated++;
      console.log(`  ✓ ${ctx}\n`);
    } else {
      failed++;
      console.log(`  ✗ Failed\n`);
    }

    // Nominatim rate limit: max 1 request per second
    if (i < events.length - 1) {
      await sleep(1100);
    }
  }

  console.log(`Done. Updated: ${updated}, Failed: ${failed}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
