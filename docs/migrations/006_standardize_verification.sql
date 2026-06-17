-- GeoWatch Verification Standardization Migration
-- Incidents and timeline updates are the only entities with verification status.
-- Per-source verification is removed; legacy confirmed/contested values are retired.

-- ============================================
-- INCIDENTS
-- ============================================

-- Map legacy values to the new four-value enum.
UPDATE incidents
  SET verification_override = 'verified'
  WHERE verification_override = 'confirmed';

UPDATE incidents
  SET verification_override = 'disputed'
  WHERE verification_override = 'contested';

-- Backfill missing values so the column can be made NOT NULL.
UPDATE incidents
  SET verification_override = 'unverified'
  WHERE verification_override IS NULL;

-- Remove the old check constraint before renaming.
ALTER TABLE incidents
  DROP CONSTRAINT IF EXISTS incidents_verification_override_check;

-- Rename the column to reflect the new canonical status.
ALTER TABLE incidents
  RENAME COLUMN verification_override TO verification_status;

-- Enforce the standardized enum and require a value.
ALTER TABLE incidents
  ALTER COLUMN verification_status SET NOT NULL;

ALTER TABLE incidents
  ALTER COLUMN verification_status SET DEFAULT 'unverified';

ALTER TABLE incidents
  ADD CONSTRAINT incidents_verification_status_check
  CHECK (verification_status IN ('unverified', 'verified', 'disputed', 'debunked'));

-- Recreate the index on the new column name.
DROP INDEX IF EXISTS idx_incidents_verification_override;
CREATE INDEX idx_incidents_verification_status ON incidents(verification_status);

-- ============================================
-- INCIDENT SOURCES
-- ============================================

-- Per-source verification is no longer part of the domain model.
ALTER TABLE incident_sources
  DROP COLUMN IF EXISTS verification_status;
