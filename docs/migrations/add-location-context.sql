-- Add location_context to incidents table
-- Stores human-readable location (e.g. "Punjab, Pakistan") via reverse geocoding

ALTER TABLE incidents ADD COLUMN location_context VARCHAR(255);

-- Create index for filtering by location context (future use)
CREATE INDEX idx_events_location_context ON incidents(location_context);
