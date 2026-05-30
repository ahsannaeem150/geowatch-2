-- GeoWatch Database Schema
-- PostgreSQL 16 + PostGIS 3
-- NOTE: Run CREATE EXTENSION IF NOT EXISTS postgis; first

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- EVENTS
-- ============================================
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('conflict', 'protest', 'disaster', 'diplomacy', 'humanitarian', 'other')),
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'hidden')),
    start_date DATE NOT NULL,
    end_date DATE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- INCIDENT SOURCES (Tabs in event detail)
-- ============================================
CREATE TABLE incident_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    source_type VARCHAR(30) NOT NULL CHECK (source_type IN ('x_post', 'news_article', 'image', 'video', 'admin_note')),
    source_url TEXT,
    embed_html TEXT,
    media_url TEXT,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- EVENT TIMELINE UPDATES
-- ============================================
CREATE TABLE incident_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    update_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- ZONES / POLYGONS (Post-MVP)
-- ============================================
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    fill_color VARCHAR(7) NOT NULL DEFAULT '#FF0000',
    stroke_color VARCHAR(7) NOT NULL DEFAULT '#000000',
    stroke_width INTEGER NOT NULL DEFAULT 2,
    opacity DECIMAL(3, 2) NOT NULL DEFAULT 0.35,
    category VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_incidents_geom ON incidents USING GIST(geom);
CREATE INDEX idx_zones_geom ON zones USING GIST(geom);
CREATE INDEX idx_incidents_dates ON incidents(start_date, end_date);
CREATE INDEX idx_incidents_start_date ON incidents(start_date);
CREATE INDEX idx_incidents_category ON incidents(category);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_query ON incidents(status, start_date, end_date, category, severity);
CREATE INDEX idx_incidents_created_by ON incidents(created_by);
CREATE INDEX idx_incident_sources_incident_id ON event_sources(event_id);
CREATE INDEX idx_incident_updates_incident_id ON event_updates(event_id);

-- Full-text search (Post-MVP, schema-ready)
ALTER TABLE events ADD COLUMN search_vector tsvector 
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED;
CREATE INDEX idx_incidents_search ON incidents USING GIN(search_vector);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PUBLIC USERS (OAuth / Google Sign-In)
-- ============================================
CREATE TABLE public_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    oauth_provider VARCHAR(20) NOT NULL DEFAULT 'google',
    oauth_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_public_users_oauth ON public_users(oauth_provider, oauth_id);

-- ============================================
-- USER SAVED INCIDENTS (Bookmarks)
-- ============================================
CREATE TABLE user_saved_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public_users(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    notes TEXT,
    saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, incident_id)
);

CREATE INDEX idx_user_saved_incidents_user_id ON user_saved_incidents(user_id);
CREATE INDEX idx_user_saved_incidents_incident_id ON user_saved_incidents(incident_id);

-- ============================================
-- DELETED INCIDENTS LOG (Soft-delete tracking)
-- ============================================
CREATE TABLE deleted_incidents_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    deleted_by UUID,
    deleted_by_email VARCHAR(255),
    deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_snapshot JSONB NOT NULL
);

CREATE INDEX idx_deleted_incidents_log_incident_id ON deleted_incidents_log(incident_id);
CREATE INDEX idx_deleted_incidents_log_deleted_at ON deleted_incidents_log(deleted_at DESC);

-- ============================================
-- PERMISSIONS (run if tables created by superuser)
-- ============================================
-- GRANT USAGE ON SCHEMA public TO geowatch_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO geowatch_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO geowatch_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO geowatch_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO geowatch_user;