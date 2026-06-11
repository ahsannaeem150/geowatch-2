-- GeoWatch Seed Data
-- Run this after executing database-schema.sql
-- WARNING: This inserts a development super_admin with a known password.
-- Change the password before production use.

-- ============================================
-- CREATE EXTENSION (if not already done)
-- ============================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- SEED SUPER ADMIN
-- Password: AdminPass123! (bcrypt hash generated with 12 rounds)
-- ============================================
INSERT INTO users (id, email, password_hash, full_name, role, is_active)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@geowatch.local',
    '$2b$12$FzXmPf7g7Bdig2d.cT8U2e7ds8PrmkriPVln0MjGRzcFthNgS3knq',
    'System Administrator',
    'super_admin',
    true
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- SAMPLE EVENTS (for testing the public map before admin dashboard exists)
-- ============================================

-- Sample Event 1: Conflict in Eastern Europe
INSERT INTO incidents (
    id, title, description, latitude, longitude, geom,
    category, severity, status, start_date, end_date,
    created_by, created_at, updated_at
) VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Border Tensions Near Donbas Region',
    'Increased military activity reported along the eastern border. Local evacuations underway.',
    48.0159, 37.8028,
    ST_SetSRID(ST_MakePoint(37.8028, 48.0159), 4326),
    'conflict', 4, 'active', '2024-05-01', NULL,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Sample Event 2: Protest in South America
INSERT INTO incidents (
    id, title, description, latitude, longitude, geom,
    category, severity, status, start_date, end_date,
    created_by, created_at, updated_at
) VALUES (
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'Mass Protests in Buenos Aires',
    'Thousands gather in Plaza de Mayo demanding economic reforms. Peaceful but large crowds.',
    -34.6037, -58.3816,
    ST_SetSRID(ST_MakePoint(-58.3816, -34.6037), 4326),
    'protest', 3, 'active', '2024-05-03', NULL,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Sample Event 3: Natural Disaster in Asia
INSERT INTO incidents (
    id, title, description, latitude, longitude, geom,
    category, severity, status, start_date, end_date,
    created_by, created_at, updated_at
) VALUES (
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'Typhoon Warning: Northern Philippines',
    'Category 4 typhoon approaching Luzon. Evacuation orders issued for coastal provinces.',
    16.4023, 120.5960,
    ST_SetSRID(ST_MakePoint(120.5960, 16.4023), 4326),
    'disaster', 5, 'active', '2024-05-02', NULL,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Sample Event 4: Diplomatic Event (Europe)
INSERT INTO incidents (
    id, title, description, latitude, longitude, geom,
    category, severity, status, start_date, end_date,
    created_by, created_at, updated_at
) VALUES (
    'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'Peace Talks Begin in Geneva',
    'Multilateral negotiations commence at the Palais des Nations. Delegations from 12 nations present.',
    46.2044, 6.1432,
    ST_SetSRID(ST_MakePoint(6.1432, 46.2044), 4326),
    'diplomacy', 2, 'active', '2024-05-04', '2024-05-10',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Sample Event 5: Humanitarian Crisis (Africa)
INSERT INTO incidents (
    id, title, description, latitude, longitude, geom,
    category, severity, status, start_date, end_date,
    created_by, created_at, updated_at
) VALUES (
    'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
    'Refugee Camp Overcrowding in Darfur',
    'Aid organizations report critical water shortages. 40,000 displaced persons in need of emergency supplies.',
    13.0000, 24.0000,
    ST_SetSRID(ST_MakePoint(24.0000, 13.0000), 4326),
    'humanitarian', 4, 'active', '2024-04-20', NULL,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Sample Event 6: Historical / Resolved Event
INSERT INTO incidents (
    id, title, description, latitude, longitude, geom,
    category, severity, status, start_date, end_date,
    created_by, created_at, updated_at, resolved_at, resolved_by
) VALUES (
    'a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
    'Cyber Attack on Regional Grid (Resolved)',
    'Coordinated cyber attack disrupted power distribution. Grid restored after 18 hours. Investigation ongoing.',
    52.5200, 13.4050,
    ST_SetSRID(ST_MakePoint(13.4050, 52.5200), 4326),
    'other', 3, 'resolved', '2024-04-10', '2024-04-11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(), NOW(),
    '2024-04-11T08:00:00Z',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SAMPLE TIMELINE UPDATES
-- ============================================
INSERT INTO event_updates (id, event_id, summary, update_date, created_by)
VALUES
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Initial reports of troop movements along highway M04.', '2024-05-01T06:00:00Z', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Artillery fire confirmed near Horlivka. Civilians evacuating west.', '2024-05-02T14:30:00Z', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b3eebc99-9c0b-4ef8-bb6d-6bb9bd380aaa', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Protest organizers announce 48-hour demonstration plan.', '2024-05-03T10:00:00Z', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b4eebc99-9c0b-4ef8-bb6d-6bb9bd380abb', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Landfall expected within 24 hours. Emergency shelters activated.', '2024-05-03T18:00:00Z', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DEFAULT ZONE CATEGORIES (Polygon taxonomy)
-- ============================================
INSERT INTO zone_categories (name, slug, description, color, icon, sort_order, is_active)
VALUES
    ('NOTAM', 'notam', 'Notice to Airmen — temporary or permanent airspace restriction.', '#f97316', 'plane', 10, true),
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
