-- Migration: Add incident_media table for file uploads
-- Run: sudo -u postgres psql -d geowatch_dev -f docs/media-migration.sql

CREATE TABLE IF NOT EXISTS incident_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,

    -- File metadata
    original_name VARCHAR(500) NOT NULL,
    stored_name VARCHAR(500) NOT NULL,        -- UUID-based filename on disk/R2
    file_type VARCHAR(20) NOT NULL,           -- 'image' | 'video'
    mime_type VARCHAR(50) NOT NULL,           -- 'image/webp', 'video/mp4'
    file_size_bytes INTEGER NOT NULL,

    -- URLs / paths
    file_url TEXT NOT NULL,                   -- Full URL or relative path
    thumbnail_url TEXT,                       -- Generated thumbnail URL

    -- Image dimensions (NULL for video until processed)
    width INTEGER,
    height INTEGER,

    -- Processing metadata
    is_processed BOOLEAN DEFAULT true,        -- Sharp/FFmpeg processing complete
    processing_error TEXT,                    -- Error message if processing failed

    -- Ordering
    display_order INTEGER DEFAULT 0,

    -- Audit
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_media_incident ON incident_media(incident_id);
CREATE INDEX idx_media_created ON incident_media(created_at DESC);
CREATE INDEX idx_media_type ON incident_media(incident_id, file_type);

-- Auto-update trigger
CREATE TRIGGER update_incident_media_updated_at
    BEFORE UPDATE ON incident_media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
