-- Add internal_reference column for auto-generated Q-XX-XXXXX-XX format (idempotent for Preview)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS internal_reference TEXT;

-- Make contract_number nullable (user enters subcontract number manually); skip if already nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'contract_number'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE contracts ALTER COLUMN contract_number DROP NOT NULL;
  END IF;
END $$;