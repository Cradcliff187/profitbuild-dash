-- Add notes column to payees table (idempotent - safe to run if column exists)
ALTER TABLE payees ADD COLUMN IF NOT EXISTS notes text;