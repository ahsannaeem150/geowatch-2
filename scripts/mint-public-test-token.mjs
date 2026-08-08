// Dev aid: mint a public_user JWT for local screenshot/verify runs (Google
// sign-in is unusable on localhost). Uses the backend's own DB pool + JWT
// config — run from src/backend so .env.development loads:
//   cd src/backend && node ../../scripts/mint-public-test-token.mjs
import '../src/backend/src/config/env.js'; // must load before auth.service (reads process.env at module scope)
import { query } from '../src/backend/src/config/database.js';
import { generateToken } from '../src/backend/src/services/auth.service.js';

let user;
const existing = await query(`SELECT id, email, full_name FROM public_users ORDER BY created_at LIMIT 1`);
if (existing.rows.length) {
  user = existing.rows[0];
} else {
  const ins = await query(
    `INSERT INTO public_users (email, full_name, oauth_provider, oauth_id)
     VALUES ($1, $2, 'google', $3)
     RETURNING id, email, full_name`,
    ['dev.viewer@intelmap24.local', 'Dev Viewer', 'dev-local-viewer']
  );
  user = ins.rows[0];
}

const saved = await query(`SELECT COUNT(*)::int AS n FROM user_saved_incidents WHERE user_id = $1`, [user.id]);
if (saved.rows[0].n < 4) {
  const incidents = await query(
    `SELECT id FROM incidents ORDER BY created_at DESC LIMIT 6`
  );
  for (const row of incidents.rows) {
    await query(
      `INSERT INTO user_saved_incidents (user_id, incident_id) VALUES ($1, $2)
       ON CONFLICT (user_id, incident_id) DO NOTHING`,
      [user.id, row.id]
    );
  }
}

// Guarantee at least one saved polygon (zone) so zone-card states can be shot
await query(
  `INSERT INTO user_saved_incidents (user_id, incident_id)
   SELECT $1, id FROM incidents WHERE geometry_type = 'polygon' ORDER BY created_at DESC LIMIT 1
   ON CONFLICT (user_id, incident_id) DO NOTHING`,
  [user.id]
);

const final = await query(`SELECT COUNT(*)::int AS n FROM user_saved_incidents WHERE user_id = $1`, [user.id]);
const token = generateToken({ id: user.id, email: user.email, role: 'public_user' });
console.log(JSON.stringify({ userId: user.id, email: user.email, savedCount: final.rows[0].n, token }));
process.exit(0);
