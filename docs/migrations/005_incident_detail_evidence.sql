-- ============================================
-- GeoWatch: Incident Detail Evidence Model (Phase 1)
-- ============================================
-- Run this as: sudo -u postgres psql -d geowatch_dev -f 005_incident_detail_evidence.sql
--
-- 1. Adds per-update evidence linkage (update_id on sources/media).
-- 2. Adds curation primitives: pinned, featured per update, hero image.
-- 3. Adds archived X-post snapshot support.
-- 4. Adds media captions and update type/verification.
-- 5. Backfills existing sources/media to an initial report update.
-- ============================================

BEGIN;

-- ============================================
-- 1. INCIDENTS: hero image
-- ============================================
ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- ============================================
-- 2. INCIDENT_UPDATES: type, verification, featured item
-- ============================================
ALTER TABLE incident_updates
    ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'update',
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified',
    ADD COLUMN IF NOT EXISTS featured_source_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS featured_source_id UUID,
    ADD COLUMN IF NOT EXISTS featured_media_id UUID;

-- ============================================
-- 3. INCIDENT_SOURCES: per-update linkage, pin, archive
-- ============================================
ALTER TABLE incident_sources
    ADD COLUMN IF NOT EXISTS update_id UUID,
    ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS archive_media_id UUID,
    ADD COLUMN IF NOT EXISTS archive_reason TEXT,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ============================================
-- 4. INCIDENT_MEDIA: per-update linkage, pin, caption
-- ============================================
ALTER TABLE incident_media
    ADD COLUMN IF NOT EXISTS update_id UUID,
    ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS caption TEXT;

-- ============================================
-- 5. CREATE MISSING INITIAL REPORT UPDATES
-- ============================================
-- Some incidents have sources/media but no timeline updates.
-- Create an initial report update for every incident that lacks one,
-- using the incident's own metadata.
INSERT INTO incident_updates (
    incident_id,
    summary,
    update_date,
    source_url,
    embed_html,
    created_by,
    created_at,
    type,
    verification_status
)
SELECT
    i.id,
    COALESCE(NULLIF(i.title, ''), 'Initial report'),
    i.start_date,
    NULL,
    NULL,
    i.created_by,
    i.created_at,
    'report',
    'verified'
FROM incidents i
WHERE NOT EXISTS (
    SELECT 1 FROM incident_updates u WHERE u.incident_id = i.id
);

-- ============================================
-- 6. BACKFILL: mark earliest update per incident as the initial report
-- ============================================
UPDATE incident_updates u
SET type = 'report', verification_status = 'verified'
WHERE u.id IN (
    SELECT DISTINCT ON (incident_id) id
    FROM incident_updates
    ORDER BY incident_id, update_date ASC, created_at ASC
);

-- Remaining updates default to 'update' / 'unverified'
UPDATE incident_updates
SET type = COALESCE(type, 'update'),
    verification_status = COALESCE(verification_status, 'unverified');

-- ============================================
-- 7. BACKFILL: attach existing sources/media to the initial report update
-- ============================================
WITH initial_update AS (
    SELECT DISTINCT ON (incident_id) id AS update_id, incident_id
    FROM incident_updates
    ORDER BY incident_id, update_date ASC, created_at ASC
)
UPDATE incident_sources s
SET update_id = iu.update_id
FROM initial_update iu
WHERE s.incident_id = iu.incident_id
  AND s.update_id IS NULL;

WITH initial_update AS (
    SELECT DISTINCT ON (incident_id) id AS update_id, incident_id
    FROM incident_updates
    ORDER BY incident_id, update_date ASC, created_at ASC
)
UPDATE incident_media m
SET update_id = iu.update_id
FROM initial_update iu
WHERE m.incident_id = iu.incident_id
  AND m.update_id IS NULL;

-- ============================================
-- 8. ENFORCE update_id NOT NULL now that everything is backfilled
-- ============================================
ALTER TABLE incident_sources
    ALTER COLUMN update_id SET NOT NULL;

ALTER TABLE incident_media
    ALTER COLUMN update_id SET NOT NULL;

-- ============================================
-- 9. CHECK CONSTRAINTS
-- ============================================
ALTER TABLE incident_updates
    DROP CONSTRAINT IF EXISTS chk_incident_updates_type;
ALTER TABLE incident_updates
    ADD CONSTRAINT chk_incident_updates_type
    CHECK (type IN ('report', 'update'));

ALTER TABLE incident_updates
    DROP CONSTRAINT IF EXISTS chk_incident_updates_verification_status;
ALTER TABLE incident_updates
    ADD CONSTRAINT chk_incident_updates_verification_status
    CHECK (verification_status IN ('unverified', 'verified', 'disputed', 'debunked'));

ALTER TABLE incident_updates
    DROP CONSTRAINT IF EXISTS chk_incident_updates_featured_source_type;
ALTER TABLE incident_updates
    ADD CONSTRAINT chk_incident_updates_featured_source_type
    CHECK (featured_source_type IS NULL OR featured_source_type IN ('media', 'x_post', 'news_article', 'admin_note'));

-- ============================================
-- 10. FOREIGN KEYS
-- ============================================
ALTER TABLE incident_sources
    DROP CONSTRAINT IF EXISTS fk_incident_sources_update_id;
ALTER TABLE incident_sources
    ADD CONSTRAINT fk_incident_sources_update_id
    FOREIGN KEY (update_id) REFERENCES incident_updates(id) ON DELETE CASCADE;

ALTER TABLE incident_sources
    DROP CONSTRAINT IF EXISTS fk_incident_sources_archive_media_id;
ALTER TABLE incident_sources
    ADD CONSTRAINT fk_incident_sources_archive_media_id
    FOREIGN KEY (archive_media_id) REFERENCES incident_media(id) ON DELETE SET NULL;

ALTER TABLE incident_media
    DROP CONSTRAINT IF EXISTS fk_incident_media_update_id;
ALTER TABLE incident_media
    ADD CONSTRAINT fk_incident_media_update_id
    FOREIGN KEY (update_id) REFERENCES incident_updates(id) ON DELETE CASCADE;

ALTER TABLE incident_updates
    DROP CONSTRAINT IF EXISTS fk_incident_updates_featured_source_id;
ALTER TABLE incident_updates
    ADD CONSTRAINT fk_incident_updates_featured_source_id
    FOREIGN KEY (featured_source_id) REFERENCES incident_sources(id) ON DELETE SET NULL;

ALTER TABLE incident_updates
    DROP CONSTRAINT IF EXISTS fk_incident_updates_featured_media_id;
ALTER TABLE incident_updates
    ADD CONSTRAINT fk_incident_updates_featured_media_id
    FOREIGN KEY (featured_media_id) REFERENCES incident_media(id) ON DELETE SET NULL;

-- ============================================
-- 11. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_incident_sources_update_id
    ON incident_sources(update_id);

CREATE INDEX IF NOT EXISTS idx_incident_sources_archive_media_id
    ON incident_sources(archive_media_id);

CREATE INDEX IF NOT EXISTS idx_incident_sources_pinned
    ON incident_sources(pinned) WHERE pinned = true;

CREATE INDEX IF NOT EXISTS idx_incident_media_update_id
    ON incident_media(update_id);

CREATE INDEX IF NOT EXISTS idx_incident_media_pinned
    ON incident_media(pinned) WHERE pinned = true;

-- ============================================
-- 12. VERIFY BACKFILL
-- ============================================
SELECT
    (SELECT COUNT(*) FROM incident_sources WHERE update_id IS NULL) AS sources_without_update,
    (SELECT COUNT(*) FROM incident_media WHERE update_id IS NULL) AS media_without_update,
    (SELECT COUNT(*) FROM incident_updates WHERE type IS NULL) AS updates_without_type,
    (SELECT COUNT(*) FROM incident_updates WHERE verification_status IS NULL) AS updates_without_verification;

COMMIT;
