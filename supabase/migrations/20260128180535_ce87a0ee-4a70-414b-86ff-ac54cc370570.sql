-- Add internal_reference column for auto-generated Q-XX-XXXXX-XX format
ALTER TABLE contracts ADD COLUMN internal_reference TEXT;

-- Make contract_number nullable (user enters subcontract number manually)
ALTER TABLE contracts ALTER COLUMN contract_number DROP NOT NULL;