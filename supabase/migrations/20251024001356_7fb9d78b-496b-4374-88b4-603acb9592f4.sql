-- Populate company branding settings with uploaded logo URLs
UPDATE public.company_branding_settings
SET 
  logo_full_url = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Full_Horizontal_Logo_-_200x48.svg',
  logo_icon_url = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Icon_Only_48x48.svg',
  logo_stacked_url = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Full_Icon%2BName_Logo_200x80.svg',
  logo_report_header_url = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/PNG_-_Icon_Only_150x150.png',
  updated_at = NOW()
WHERE id = 'adb6c3f7-c8c9-4314-8c4b-f1522ba232f9';