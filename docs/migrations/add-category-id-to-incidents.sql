-- ============================================
-- GeoWatch: Add category_id to incidents & zones
-- ============================================
-- Run this as: postgres superuser
--
-- This script:
-- 1. Adds category_id column to incidents and zones
-- 2. Migrates existing category strings to category IDs
-- 3. Creates indexes for performance
-- 4. Verifies migration
--
-- Prerequisites: add-domains-and-categories.sql must already be run.

-- ============================================
-- ADD category_id TO incidents
-- ============================================
ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS category_id INT REFERENCES categories(id) ON DELETE SET NULL;

-- Also add to zones for future use
ALTER TABLE zones
    ADD COLUMN IF NOT EXISTS category_id INT REFERENCES categories(id) ON DELETE SET NULL;

-- Drop the NOT NULL constraint on the old category column so new inserts work
-- while the old column still exists for reference
ALTER TABLE incidents ALTER COLUMN category DROP NOT NULL;
ALTER TABLE zones ALTER COLUMN category DROP NOT NULL;

-- ============================================
-- MIGRATE EXISTING INCIDENTS
-- ============================================
UPDATE incidents i
SET category_id = c.id
FROM categories c
JOIN domains d ON c.domain_id = d.id
WHERE i.category = 'conflict' AND d.slug = 'conflict' AND c.slug = 'unclassified-conflict';

UPDATE incidents i
SET category_id = c.id
FROM categories c
JOIN domains d ON c.domain_id = d.id
WHERE i.category = 'protest' AND d.slug = 'civil-unrest' AND c.slug = 'unclassified-civil-unrest';

UPDATE incidents i
SET category_id = c.id
FROM categories c
JOIN domains d ON c.domain_id = d.id
WHERE i.category = 'disaster' AND d.slug = 'natural-hazard' AND c.slug = 'unclassified-natural-hazard';

UPDATE incidents i
SET category_id = c.id
FROM categories c
JOIN domains d ON c.domain_id = d.id
WHERE i.category = 'diplomacy' AND d.slug = 'political' AND c.slug = 'unclassified-political';

UPDATE incidents i
SET category_id = c.id
FROM categories c
JOIN domains d ON c.domain_id = d.id
WHERE i.category = 'humanitarian' AND d.slug = 'humanitarian' AND c.slug = 'unclassified-humanitarian';

UPDATE incidents i
SET category_id = c.id
FROM categories c
JOIN domains d ON c.domain_id = d.id
WHERE i.category = 'other' AND d.slug = 'political' AND c.slug = 'other';

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_categories_domain ON categories(domain_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_domains_active ON domains(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_incidents_category_id ON incidents(category_id);
CREATE INDEX IF NOT EXISTS idx_incidents_category_severity ON incidents(category_id, severity);

-- Drop old category index (optional — uncomment when fully confident)
-- DROP INDEX IF EXISTS idx_incidents_category;

-- ============================================
-- VERIFY MIGRATION
-- ============================================
SELECT 'Incidents migrated:' AS check_item, COUNT(*) AS count FROM incidents WHERE category_id IS NOT NULL
UNION ALL
SELECT 'Incidents pending migration:', COUNT(*) FROM incidents WHERE category_id IS NULL;
