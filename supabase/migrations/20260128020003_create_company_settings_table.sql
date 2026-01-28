-- Idempotent: safe when company_settings already exists (e.g. from an earlier migration or MCP).
-- Company settings for RCG info used in contract headers/footers and elsewhere.
-- setting_value is JSONB to match production and 20260128162416; use to_jsonb(...::text) in INSERTs.
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  setting_type TEXT NOT NULL DEFAULT 'text'
    CHECK (setting_type IN ('text', 'number', 'boolean', 'json')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO company_settings (setting_key, setting_value, description) VALUES
  ('company_legal_name', to_jsonb('RCG LLC, a Kentucky limited liability company'::text), 'Full legal name for contracts'),
  ('company_display_name', to_jsonb('Radcliff Construction Group, LLC'::text), 'Display name for signature blocks'),
  ('company_address', to_jsonb('23 Erlanger Road, Erlanger, KY 41017'::text), 'Primary business address'),
  ('company_phone', to_jsonb('(859) 802-0746'::text), 'Main phone number'),
  ('company_email', to_jsonb('matt@radcliffcg.com'::text), 'Main contact email'),
  ('company_website', to_jsonb('teamradcliff.com'::text), 'Company website'),
  ('signatory_name', to_jsonb('Matt Radcliff'::text), 'Default signatory name'),
  ('signatory_title', to_jsonb('President/Owner'::text), 'Default signatory title'),
  ('contract_number_prefix', to_jsonb(''::text), 'Prefix for auto-generated contract numbers')
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company settings" ON company_settings;
CREATE POLICY "Users can view company settings" ON company_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update company settings" ON company_settings;
CREATE POLICY "Admins can update company settings" ON company_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'executive')
    )
  );

DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE company_settings IS 'Company-wide settings including RCG info for contract generation';
