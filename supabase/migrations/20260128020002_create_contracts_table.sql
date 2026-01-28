-- Ensure trigger function exists for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Contracts table: supports multiple contract types; this implementation uses subcontractor_project_agreement
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  payee_id UUID NOT NULL REFERENCES payees(id) ON DELETE RESTRICT,

  -- Contract identification
  contract_number TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'subcontractor_project_agreement'
    CHECK (contract_type IN ('subcontractor_project_agreement')),

  -- Financial
  subcontract_price DECIMAL(12,2) NOT NULL,

  -- Dates
  agreement_date DATE NOT NULL,
  project_start_date DATE,
  project_end_date DATE,

  -- All field values at generation time (audit trail)
  field_values JSONB NOT NULL,

  -- Generated documents
  docx_storage_path TEXT,
  pdf_storage_path TEXT,
  docx_url TEXT,
  pdf_url TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generated', 'sent', 'signed', 'void', 'superseded')),

  -- Metadata
  version INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(project_id, contract_number)
);

CREATE INDEX idx_contracts_project_id ON contracts(project_id);
CREATE INDEX idx_contracts_payee_id ON contracts(payee_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_created_at ON contracts(created_at DESC);
CREATE INDEX idx_contracts_contract_type ON contracts(contract_type);

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contracts" ON contracts
  FOR SELECT USING (true);

CREATE POLICY "Users can insert contracts" ON contracts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update contracts" ON contracts
  FOR UPDATE USING (true);

COMMENT ON TABLE contracts IS 'Generated contracts (subcontractor project agreements and future contract types)';
COMMENT ON COLUMN contracts.contract_type IS 'Type of contract, e.g. subcontractor_project_agreement; extensible for future types';
COMMENT ON COLUMN contracts.field_values IS 'JSON snapshot of all field values used at generation time';
COMMENT ON COLUMN contracts.version IS 'Version number for tracking regenerations/amendments';
