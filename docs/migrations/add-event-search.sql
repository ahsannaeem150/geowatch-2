-- Migration: Add full-text search to events table
-- NOTE: Run this as the postgres superuser:
--   sudo -u postgres psql -d geowatch_dev -f docs/migrations/add-event-search.sql

-- Add search_vector column (auto-generated from title + description)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B')
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS events_search_idx ON events USING GIN(search_vector);

-- Also add index on event_updates summary for timeline search
ALTER TABLE event_updates
ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(summary, ''))
) STORED;

CREATE INDEX IF NOT EXISTS event_updates_search_idx ON event_updates USING GIN(search_vector);

-- Refresh statistics
ANALYZE events;
ANALYZE event_updates;
