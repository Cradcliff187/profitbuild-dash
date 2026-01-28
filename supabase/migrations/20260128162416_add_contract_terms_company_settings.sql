-- Contract terms defaults for template placeholders (payment, cure periods, insurance, governing law, venue, arbitration).
-- useContractData reads these and pre-fills contract generation; users can override per contract in the UI.
-- setting_value is jsonb; store plain strings via to_jsonb(...::text).

INSERT INTO company_settings (setting_key, setting_value, description) VALUES
  ('payment_terms_days', to_jsonb('30'::text), 'Payment timing (days)'),
  ('liquidated_damages_daily', to_jsonb('100.00'::text), 'Daily liquidated damages amount (no $; template adds $)'),
  ('lien_cure_days', to_jsonb('10'::text), 'Lien cure period (days)'),
  ('delay_notice_days', to_jsonb('3'::text), 'Delay notice (calendar days)'),
  ('notice_cure_days', to_jsonb('7'::text), 'Default / notice cure period (days)'),
  ('default_cure_hours', to_jsonb('48'::text), 'Default cure window (hours)'),
  ('insurance_cancellation_notice_days', to_jsonb('30'::text), 'Insurance cancellation notice (days)'),
  ('insurance_limit_1m', to_jsonb('1,000,000'::text), 'Insurance limit $1M (number only; template adds $)'),
  ('insurance_limit_2m', to_jsonb('2,000,000'::text), 'Insurance limit $2M (number only; template adds $)'),
  ('governing_state', to_jsonb('Kentucky'::text), 'Governing law (value only)'),
  ('governing_county_state', to_jsonb('Boone County, Kentucky'::text), 'Venue'),
  ('arbitration_location', to_jsonb('Covington, Kentucky'::text), 'Arbitration location')
ON CONFLICT (setting_key) DO NOTHING;
