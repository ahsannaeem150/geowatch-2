-- ============================================
-- GeoWatch: Polygon Zones Foundation (Phase 1)
-- ============================================
-- Run this as: sudo -u postgres psql -d geowatch_dev -f 003_polygon_zones.sql
--
-- This script:
-- 1. Adds geometry_type to incidents and widens geom to GEOMETRY(Geometry, 4326)
-- 2. Makes latitude/longitude nullable (polygons do not have a single coordinate)
-- 3. Creates the zone_categories taxonomy table
-- 4. Seeds the 8 default zone categories
-- 5. Drops the legacy zones table (data is discarded intentionally)
-- ============================================

BEGIN;

-- ============================================
-- 1. INCIDENTS: geometry_type + polymorphic geom
-- ============================================
ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS geometry_type VARCHAR(10) NOT NULL DEFAULT 'point';

-- Backfill existing rows so the check constraint can be applied safely
UPDATE incidents
    SET geometry_type = 'point'
    WHERE geometry_type IS NULL;

ALTER TABLE incidents
    DROP CONSTRAINT IF EXISTS chk_incidents_geometry_type;
ALTER TABLE incidents
    ADD CONSTRAINT chk_incidents_geometry_type
    CHECK (geometry_type IN ('point', 'polygon'));

-- Widen geom from Point-only to any Geometry (Point or Polygon)
ALTER TABLE incidents
    ALTER COLUMN geom TYPE GEOMETRY(Geometry, 4326);

-- Polygons do not require a single lat/lon
ALTER TABLE incidents
    ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE incidents
    ALTER COLUMN longitude DROP NOT NULL;

-- ============================================
-- 2. ZONE CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS zone_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#9f1239',
    icon VARCHAR(50) DEFAULT 'shield',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed default zone categories
INSERT INTO zone_categories (name, slug, description, color, icon, sort_order, is_active)
VALUES
    ('NOTAM', 'notam', 'Notice to Airmen — temporary or permanent airspace restriction.', '#6366f1', 'plane', 10, true),
    ('NOTMAR', 'notmar', 'Notice to Mariners — maritime hazard or restricted area.', '#0ea5e9', 'anchor', 20, true),
    ('Curfew', 'curfew', 'Movement restriction during specified hours.', '#7c3aed', 'lock', 30, true),
    ('No-Fly Zone', 'no-fly-zone', 'Prohibited airspace for all or selected aircraft.', '#ef4444', 'alert-triangle', 40, true),
    ('Maritime Exclusion Zone', 'maritime-exclusion-zone', 'Area off-limits to maritime traffic.', '#06b6d4', 'ship', 50, true),
    ('Protest Area', 'protest-area', 'Designated or observed public assembly area.', '#eab308', 'megaphone', 60, true),
    ('Evacuation Zone', 'evacuation-zone', 'Area from which people should evacuate.', '#22c55e', 'flag', 70, true),
    ('Shelter-in-Place', 'shelter-in-place', 'Area where people should remain indoors.', '#3b82f6', 'home', 80, true)
ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        color = EXCLUDED.color,
        icon = EXCLUDED.icon,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zone_categories_active ON zone_categories(is_active) WHERE is_active = true;

-- Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_zone_categories_updated_at ON zone_categories;
CREATE TRIGGER update_zone_categories_updated_at BEFORE UPDATE ON zone_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. DROP LEGACY ZONES TABLE
-- ============================================
DROP TABLE IF EXISTS zones CASCADE;

-- ============================================
-- 4. PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON zone_categories TO geowatch_user;
GRANT USAGE, SELECT ON SEQUENCE zone_categories_id_seq TO geowatch_user;

-- ============================================
-- VERIFY
-- ============================================
SELECT 'incidents geometry_type added' AS check_item,
       COUNT(*) FILTER (WHERE geometry_type IS NOT NULL) AS populated,
       COUNT(*) AS total
FROM incidents;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'incidents' AND column_name IN ('geom', 'geometry_type', 'latitude', 'longitude');

SELECT id, name, slug, color, icon, sort_order, is_active
FROM zone_categories
ORDER BY sort_order;

COMMIT;
