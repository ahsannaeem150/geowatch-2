-- ============================================
-- GeoWatch: Zone Category Foreign Key (Phase 3)
-- ============================================
-- Run this as: sudo -u postgres psql -d geowatch_dev -f 004_zone_category_foreign_key.sql
--
-- Adds zone_category_id to incidents so polygon zones can reference
-- the zone_categories taxonomy independently from marker categories.
-- ============================================

BEGIN;

ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS zone_category_id INTEGER;

-- Drop existing FK if any and recreate with ON DELETE SET NULL
ALTER TABLE incidents
    DROP CONSTRAINT IF EXISTS incidents_zone_category_id_fkey;
ALTER TABLE incidents
    ADD CONSTRAINT incidents_zone_category_id_fkey
    FOREIGN KEY (zone_category_id) REFERENCES zone_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_zone_category_id ON incidents(zone_category_id);

GRANT SELECT, UPDATE, INSERT, REFERENCES ON zone_categories TO geowatch_user;
GRANT SELECT, INSERT, UPDATE ON incidents TO geowatch_user;

-- ============================================
-- VERIFY
-- ============================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'incidents' AND column_name = 'zone_category_id';

COMMIT;
