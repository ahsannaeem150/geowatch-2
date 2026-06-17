-- GeoWatch source account metadata and X post archiving support
-- Adds a reusable account table for external sources (X, news, etc.)
-- and extra columns on incident_sources for account linkage,
-- archive reason, and availability checks.

-- ============================================
-- SOURCE ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS source_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(20) NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  profile_url TEXT,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, username)
);

CREATE INDEX IF NOT EXISTS idx_source_accounts_platform_username
  ON source_accounts(platform, username);

CREATE INDEX IF NOT EXISTS idx_source_accounts_suspended
  ON source_accounts(is_suspended);

-- ============================================
-- INCIDENT SOURCES
-- ============================================
ALTER TABLE incident_sources
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES source_accounts(id) ON DELETE SET NULL;

ALTER TABLE incident_sources
  ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(30);

ALTER TABLE incident_sources
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_incident_sources_account_id
  ON incident_sources(account_id);

CREATE INDEX IF NOT EXISTS idx_incident_sources_archived_checked
  ON incident_sources(archived, last_checked_at);
