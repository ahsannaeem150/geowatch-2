-- GeoWatch Database Schema
-- PostgreSQL 16 + PostGIS 3
-- NOTE: Run CREATE EXTENSION IF NOT EXISTS postgis; first

-- ============================================
-- USERS (Staff)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

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
-- DOMAINS (Incident Taxonomy)
-- ============================================
CREATE TABLE domains (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#9f1239',
    icon VARCHAR(50) DEFAULT 'shield',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- CATEGORIES (Incident Taxonomy)
-- ============================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    severity_schema JSONB,
    default_severity INTEGER DEFAULT 3,
    requires_location BOOLEAN NOT NULL DEFAULT true,
    requires_casualties BOOLEAN NOT NULL DEFAULT false,
    requires_property_damage BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (domain_id, slug)
);

-- ============================================
-- INCIDENTS
-- ============================================
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geom GEOMETRY(Geometry, 4326) NOT NULL,
    geometry_type VARCHAR(10) NOT NULL DEFAULT 'point' CHECK (geometry_type IN ('point', 'polygon')),
    category_id INTEGER REFERENCES categories(id),
    zone_category_id INTEGER REFERENCES zone_categories(id) ON DELETE SET NULL,
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'hidden')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    location_context TEXT,
    verification_override VARCHAR(20) CHECK (verification_override IN ('unverified', 'verified', 'confirmed', 'contested')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- INCIDENT SOURCES
-- ============================================
CREATE TABLE incident_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    source_type VARCHAR(30) NOT NULL CHECK (source_type IN ('x_post', 'news_article', 'image', 'video', 'admin_note')),
    source_url TEXT,
    embed_html TEXT,
    media_url TEXT,
    description TEXT,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'disputed', 'debunked')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- INCIDENT TIMELINE UPDATES
-- ============================================
CREATE TABLE incident_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    update_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    source_url TEXT,
    embed_html TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- INCIDENT MEDIA (File uploads)
-- ============================================
CREATE TABLE incident_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    original_name VARCHAR(500) NOT NULL,
    stored_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    width INTEGER,
    height INTEGER,
    is_processed BOOLEAN DEFAULT true,
    processing_error TEXT,
    display_order INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- ZONE CATEGORIES (Polygon taxonomy)
-- ============================================
CREATE TABLE zone_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#9f1239',
    icon VARCHAR(50) DEFAULT 'shield',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

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

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    user_email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    realm VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (realm IN ('system', 'user')),
    actor_type VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (actor_type IN ('staff', 'public_user')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

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
    data_snapshot JSONB NOT NULL,
    purge_after TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_incidents_geom ON incidents USING GIST(geom);
CREATE INDEX idx_zone_categories_active ON zone_categories(is_active) WHERE is_active = true;
CREATE INDEX idx_incidents_dates ON incidents(start_date, end_date);
CREATE INDEX idx_incidents_start_date ON incidents(start_date);
CREATE INDEX idx_incidents_category_id ON incidents(category_id);
CREATE INDEX idx_incidents_zone_category_id ON incidents(zone_category_id);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_query ON incidents(status, start_date, end_date, category_id, severity);
CREATE INDEX idx_incidents_created_by ON incidents(created_by);
CREATE INDEX idx_incident_sources_incident_id ON incident_sources(incident_id);
CREATE INDEX idx_incident_updates_incident_id ON incident_updates(incident_id);
CREATE INDEX idx_media_incident ON incident_media(incident_id);
CREATE INDEX idx_media_created ON incident_media(created_at DESC);
CREATE INDEX idx_media_type ON incident_media(incident_id, file_type);
CREATE INDEX idx_user_saved_incidents_user_id ON user_saved_incidents(user_id);
CREATE INDEX idx_user_saved_incidents_incident_id ON user_saved_incidents(incident_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_realm ON audit_logs(realm);
CREATE INDEX idx_deleted_incidents_log_incident_id ON deleted_incidents_log(incident_id);
CREATE INDEX idx_deleted_incidents_log_deleted_at ON deleted_incidents_log(deleted_at DESC);

-- Full-text search
ALTER TABLE incidents ADD COLUMN search_vector tsvector 
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

CREATE TRIGGER update_public_users_updated_at BEFORE UPDATE ON public_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zone_categories_updated_at BEFORE UPDATE ON zone_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incident_media_updated_at BEFORE UPDATE ON incident_media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PERMISSIONS (run if tables created by superuser)
-- ============================================
-- GRANT USAGE ON SCHEMA public TO geowatch_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO geowatch_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO geowatch_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO geowatch_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO geowatch_user;
