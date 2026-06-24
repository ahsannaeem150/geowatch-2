#!/usr/bin/env node
/**
 * Backfill domain.light_color values based on existing domain.color values.
 *
 * Light-mode colors are darkened versions of the dark-mode color so they remain
 * readable on white/off-white backgrounds. Run this after applying migration
 * 011_add_domain_light_color.sql.
 */

import '../src/backend/src/config/env.js';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'geowatch_dev',
  user: process.env.DB_USER || 'geowatch_user',
  password: process.env.DB_PASSWORD || '',
});

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r, g, b) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function isLightColor(hex) {
  return getLuminance(hex) > 0.55;
}

function darken(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor));
}

function computeLightColor(darkColor) {
  // Keep dark colors roughly as-is; darken light colors significantly.
  if (isLightColor(darkColor)) {
    return darken(darkColor, 0.38);
  }
  // Slightly darken medium colors so they still feel intentional on white.
  if (getLuminance(darkColor) > 0.35) {
    return darken(darkColor, 0.18);
  }
  return darkColor;
}

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT id, name, color FROM domains ORDER BY id');
    console.log(`Backfilling light_color for ${rows.length} domains...`);

    for (const domain of rows) {
      const lightColor = computeLightColor(domain.color);
      await client.query('UPDATE domains SET light_color = $1 WHERE id = $2', [lightColor, domain.id]);
      console.log(`  ${domain.name}: ${domain.color} → ${lightColor}`);
    }

    console.log('Done.');
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
