import { query } from './src/backend/src/config/database.js';

async function migrate() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS deleted_incidents_log (
        id SERIAL PRIMARY KEY,
        incident_id UUID NOT NULL,
        deleted_by UUID,
        deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        original_status VARCHAR(20) NOT NULL,
        restored_at TIMESTAMP WITH TIME ZONE,
        restored_by UUID,
        purged_at TIMESTAMP WITH TIME ZONE,
        purged_by UUID
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_deleted_log_incident ON deleted_incidents_log(incident_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_deleted_log_deleted_at ON deleted_incidents_log(deleted_at)`);
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_deleted_log_active ON deleted_incidents_log(incident_id) WHERE restored_at IS NULL AND purged_at IS NULL`);
    console.log('✓ Created deleted_incidents_log table + indexes');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
