-- Migration 010: add details column to incident_updates
-- Supports richer timeline entries with a short summary plus a body/details field.

ALTER TABLE incident_updates
  ADD COLUMN IF NOT EXISTS details TEXT;

-- Backfill existing rows so summary remains the visible body and details stays empty.
UPDATE incident_updates SET details = '' WHERE details IS NULL;
