-- Add location_context to events table
-- Stores human-readable location (e.g. "Punjab, Pakistan") via reverse geocoding

ALTER TABLE events ADD COLUMN location_context VARCHAR(255);

-- Create index for filtering by location context (future use)
CREATE INDEX idx_events_location_context ON events(location_context);
