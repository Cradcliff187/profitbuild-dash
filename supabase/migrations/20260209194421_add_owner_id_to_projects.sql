-- Add owner_id to projects table
-- References payees where is_internal = true (internal employees)
-- Applied to Supabase 2026-02-09; kept in repo for migration history alignment.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES payees(id);
COMMENT ON COLUMN projects.owner_id IS 'Internal payee (employee) who owns/manages this project';
