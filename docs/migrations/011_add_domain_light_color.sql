-- Add light-mode color column to domains table
-- Superadmins can set a separate color for light theme UI elements.

ALTER TABLE domains
ADD COLUMN light_color VARCHAR(7) NOT NULL DEFAULT '#6b7280';

ALTER TABLE domains
ADD CONSTRAINT chk_domains_light_color_hex
CHECK (light_color ~ '^#[0-9A-Fa-f]{6}$');
