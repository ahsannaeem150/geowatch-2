-- ============================================
-- GeoWatch: Audit Realm Separation (Phase 4)
-- ============================================
-- Run this as: sudo -u postgres psql -d geowatch_dev -f 002_audit_realm.sql
--
-- Adds realm and actor_type columns to audit_logs to separate
-- system (staff) activity from user (public) activity.
-- ============================================

-- Drop the foreign key constraint on user_id since it now holds both staff and public user IDs
ALTER TABLE audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- Add realm enum column
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS realm VARCHAR(20) NOT NULL DEFAULT 'system';

-- Add actor_type enum column
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS actor_type VARCHAR(20) NOT NULL DEFAULT 'staff';

-- Backfill existing rows: all current logs are system realm, staff actor
UPDATE audit_logs
    SET realm = 'system', actor_type = 'staff'
    WHERE realm = 'system' AND actor_type = 'staff';

-- Add check constraints for valid values
ALTER TABLE audit_logs
    DROP CONSTRAINT IF EXISTS chk_audit_logs_realm;
ALTER TABLE audit_logs
    ADD CONSTRAINT chk_audit_logs_realm
    CHECK (realm IN ('system', 'user'));

ALTER TABLE audit_logs
    DROP CONSTRAINT IF EXISTS chk_audit_logs_actor_type;
ALTER TABLE audit_logs
    ADD CONSTRAINT chk_audit_logs_actor_type
    CHECK (actor_type IN ('staff', 'public_user'));

-- Indexes for efficient realm filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_realm ON audit_logs(realm, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_type ON audit_logs(actor_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_realm_actor ON audit_logs(realm, actor_type, created_at DESC);

-- Update grants
GRANT SELECT, INSERT ON audit_logs TO geowatch_user;

-- ============================================
-- VERIFY
-- ============================================
SELECT 'realm column added' AS status;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs' AND column_name IN ('realm', 'actor_type');

SELECT realm, actor_type, COUNT(*) AS count
FROM audit_logs
GROUP BY realm, actor_type;
