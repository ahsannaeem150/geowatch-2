-- GeoWatch Verification System Migration
-- Adds source-level verification and incident-level override

-- ============================================
-- SOURCE VERIFICATION
-- ============================================
ALTER TABLE incident_sources
  ADD COLUMN verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified'
  CHECK (verification_status IN ('unverified', 'verified', 'disputed', 'debunked'));

CREATE INDEX idx_incident_sources_verification ON incident_sources(verification_status);

-- ============================================
-- INCIDENT VERIFICATION OVERRIDE
-- ============================================
ALTER TABLE incidents
  ADD COLUMN verification_override VARCHAR(20) DEFAULT NULL
  CHECK (verification_override IN ('unverified', 'verified', 'confirmed', 'contested', NULL));

CREATE INDEX idx_incidents_verification_override ON incidents(verification_override);
