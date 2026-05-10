-- Migration: Rename events → incidents
-- Run as: sudo -u postgres psql -d geowatch_dev -f docs/migrations/rename-events-to-incidents.sql

-- ============================================
-- 1. RENAME TABLES
-- ============================================
ALTER TABLE events RENAME TO incidents;
ALTER TABLE event_sources RENAME TO incident_sources;
ALTER TABLE event_updates RENAME TO incident_updates;

-- ============================================
-- 2. RENAME COLUMNS (foreign keys)
-- ============================================
ALTER TABLE incident_sources RENAME COLUMN event_id TO incident_id;
ALTER TABLE incident_updates RENAME COLUMN event_id TO incident_id;

-- ============================================
-- 3. UPDATE FOREIGN KEY CONSTRAINTS
-- ============================================
-- incident_sources
ALTER TABLE incident_sources DROP CONSTRAINT IF EXISTS event_sources_event_id_fkey;
ALTER TABLE incident_sources ADD CONSTRAINT incident_sources_incident_id_fkey
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE;

-- incident_updates
ALTER TABLE incident_updates DROP CONSTRAINT IF EXISTS event_updates_event_id_fkey;
ALTER TABLE incident_updates ADD CONSTRAINT incident_updates_incident_id_fkey
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE;

-- ============================================
-- 4. RENAME INDEXES
-- ============================================
ALTER INDEX IF EXISTS idx_events_geom RENAME TO idx_incidents_geom;
ALTER INDEX IF EXISTS idx_events_dates RENAME TO idx_incidents_dates;
ALTER INDEX IF EXISTS idx_events_start_date RENAME TO idx_incidents_start_date;
ALTER INDEX IF EXISTS idx_events_category RENAME TO idx_incidents_category;
ALTER INDEX IF EXISTS idx_events_severity RENAME TO idx_incidents_severity;
ALTER INDEX IF EXISTS idx_events_status RENAME TO idx_incidents_status;
ALTER INDEX IF EXISTS idx_events_query RENAME TO idx_incidents_query;
ALTER INDEX IF EXISTS idx_events_created_by RENAME TO idx_incidents_created_by;
ALTER INDEX IF EXISTS idx_events_search RENAME TO idx_incidents_search;

ALTER INDEX IF EXISTS idx_event_sources_event_id RENAME TO idx_incident_sources_incident_id;
ALTER INDEX IF EXISTS idx_event_updates_event_id RENAME TO idx_incident_updates_incident_id;

-- ============================================
-- 5. RENAME TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS update_events_updated_at ON incidents;
CREATE TRIGGER update_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. UPDATE SEQUENCE (if any)
-- ============================================
-- UUID tables use gen_random_uuid(), no sequence to rename

-- ============================================
-- 7. GRANT PERMISSIONS (re-apply for app user)
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON incidents TO geowatch_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON incident_sources TO geowatch_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON incident_updates TO geowatch_user;
