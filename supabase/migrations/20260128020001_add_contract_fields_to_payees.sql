-- Add contact and legal fields to payees for contract generation (Subcontractor Project Agreement)
ALTER TABLE payees ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE payees ADD COLUMN IF NOT EXISTS contact_title TEXT;
ALTER TABLE payees ADD COLUMN IF NOT EXISTS legal_form TEXT;
ALTER TABLE payees ADD COLUMN IF NOT EXISTS state_of_formation TEXT;

COMMENT ON COLUMN payees.contact_name IS 'Primary contact person name for contracts';
COMMENT ON COLUMN payees.contact_title IS 'Contact person title (e.g., President, Owner, Manager)';
COMMENT ON COLUMN payees.legal_form IS 'Legal entity type (e.g., LLC, Corp, Sole Proprietor)';
COMMENT ON COLUMN payees.state_of_formation IS 'State where entity was formed (e.g., KY, OH)';
