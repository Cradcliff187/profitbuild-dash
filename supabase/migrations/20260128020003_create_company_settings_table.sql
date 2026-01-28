-- Company settings for RCG info used in contract headers/footers and elsewhere
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL DEFAULT 'text'
    CHECK (setting_type IN ('text', 'number', 'boolean', 'json')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO company_settings (setting_key, setting_value, description) VALUES
  ('company_legal_name', 'RCG LLC, a Kentucky limited liability company', 'Full legal name for contracts'),
  ('company_display_name', 'Radcliff Construction Group, LLC', 'Display name for signature blocks'),
  ('company_address', '23 Erlanger Road, Erlanger, KY 41017', 'Primary business address'),
  ('company_phone', '(859) 802-0746', 'Main phone number'),
  ('company_email', 'matt@radcliffcg.com', 'Main contact email'),
  ('company_website', 'teamradcliff.com', 'Company website'),
  ('signatory_name', 'Matt Radcliff', 'Default signatory name'),
  ('signatory_title', 'President/Owner', 'Default signatory title'),
  ('contract_number_prefix', '', 'Prefix for auto-generated contract numbers');

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company settings" ON company_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can update company settings" ON company_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'executive')
    )
  );

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE company_settings IS 'Company-wide settings including RCG info for contract generation';
