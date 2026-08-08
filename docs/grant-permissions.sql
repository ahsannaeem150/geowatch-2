-- Grant permissions for the application database user
-- Run this after database-schema.sql if tables were created by postgres superuser

GRANT USAGE ON SCHEMA public TO intelmap24_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO intelmap24_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO intelmap24_user;

-- Ensure future tables/sequences created by postgres also get these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO intelmap24_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO intelmap24_user;
