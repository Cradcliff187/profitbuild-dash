-- Update company branding settings with new high-resolution transparent PNG logos
UPDATE company_branding_settings
SET 
  logo_stacked_url = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Stacked%20Icon+Logo%20Transparent%202000x2000.png',
  logo_full_url = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Full%20Horizontal%20Logo%20-%201500x500.png',
  logo_icon_url = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Large%20Icon%20Only.png',
  updated_at = NOW()
WHERE id = 'adb6c3f7-c8c9-4314-8c4b-f1522ba232f9';