-- Update company branding settings with Radcliff Construction brand colors
UPDATE company_branding_settings
SET 
  primary_color = '#cf791d',           -- Orange
  secondary_color = '#1b2b43',         -- Navy Blue
  accent_color = '#cf791d',            -- Orange accent
  light_bg_color = '#f4f7f9',          -- Light gray background
  updated_at = NOW()
WHERE id = 'adb6c3f7-c8c9-4314-8c4b-f1522ba232f9';