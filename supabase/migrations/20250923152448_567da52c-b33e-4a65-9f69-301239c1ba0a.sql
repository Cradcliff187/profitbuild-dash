-- Add missing project status enum values
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'on_hold';