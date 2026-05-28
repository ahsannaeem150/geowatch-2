-- ============================================
-- GeoWatch: Superadmin Foundation (Phase 1)
-- ============================================
-- Run this as: sudo -u postgres psql -d geowatch_dev -f 001_superadmin_foundation.sql
--
-- Creates the audit_logs table and adds last_login_at to users.
-- This is the immutable audit trail for all platform governance.
-- ============================================

-- ============================================
-- AUDIT LOGS
-- ============================================
-- Append-only table. Never UPDATE, never DELETE.
-- Every mutating action in the platform is recorded here.

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    details JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying from the superadmin panel
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- USERS: last_login_at
-- ============================================
-- Tracks when a user last successfully authenticated.
-- Updated by the login controller on every successful login.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- ============================================
-- PERMISSIONS
-- ============================================
-- Grant CRUD on audit_logs to the application user

GRANT SELECT, INSERT ON audit_logs TO geowatch_user;
GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO geowatch_user;

-- ============================================
-- VERIFY
-- ============================================
SELECT 'audit_logs table created' AS status;
SELECT COUNT(*) AS audit_log_count FROM audit_logs;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'last_login_at';
