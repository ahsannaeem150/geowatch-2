-- Migration 012: admin workspace support
-- Tables for staff notifications, bookmarks, and recently viewed incidents/searches.

-- Staff bookmarks / saved incidents
CREATE TABLE IF NOT EXISTS staff_saved_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    notes TEXT,
    saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, incident_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_saved_incidents_user_id ON staff_saved_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_saved_incidents_incident_id ON staff_saved_incidents(incident_id);

-- Staff recents (viewed incidents and searches)
CREATE TABLE IF NOT EXISTS staff_recents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('search', 'incident')),
    payload JSONB NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_recents_user_type ON staff_recents(user_id, type, occurred_at DESC);

-- Notifications for staff users
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    link_path TEXT,
    payload JSONB,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_all ON notifications(user_id, created_at DESC);
