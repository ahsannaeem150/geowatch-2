-- Migration: Add full-text search to incidents table
-- NOTE: Run this as the postgres superuser:
--   sudo -u postgres psql -d geowatch_dev -f docs/migrations/add-event-search.sql

-- Add search_vector column (auto-generated from title + description)
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B')
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS events_search_idx ON incidents USING GIN(search_vector);

-- Also add index on incident_updates summary for timeline search
ALTER TABLE incident_updates
ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(summary, ''))
) STORED;

CREATE INDEX IF NOT EXISTS event_updates_search_idx ON incident_updates USING GIN(search_vector);

-- Refresh statistics
ANALYZE incidents;
ANALYZE incident_updates;
