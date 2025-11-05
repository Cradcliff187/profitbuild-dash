-- Make estimate_id nullable in quotes table to support change order quotes
ALTER TABLE quotes ALTER COLUMN estimate_id DROP NOT NULL;