import '../src/config/env.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { query } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationPath = resolve(__dirname, '../../../docs/migrations/011_add_domain_light_color.sql');

async function main() {
  const sql = readFileSync(migrationPath, 'utf8');
  console.log('Running migration:', migrationPath);
  await query(sql);
  console.log('Migration complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
