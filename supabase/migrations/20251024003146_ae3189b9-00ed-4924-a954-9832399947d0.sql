-- Fix logo URLs to match actual uploaded filenames in storage
UPDATE public.company_branding_settings
SET 
  logo_full_url = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Full Horizontal Logo - 200x48.svg',
  logo_icon_url = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Icon Only 48x48.svg',
  logo_stacked_url = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Stacked Icon+Name Logo 200x80.svg',
  logo_report_header_url = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/PNG - Icon Only 150x150.png',
  updated_at = NOW()
WHERE id = 'adb6c3f7-c8c9-4314-8c4b-f1522ba232f9';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access to Company Branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete branding" ON storage.objects;

-- Create storage RLS policies for public read access
CREATE POLICY "Public Access to Company Branding"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-branding');

-- Allow authenticated users to manage branding files
CREATE POLICY "Authenticated users can upload branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-branding');

CREATE POLICY "Authenticated users can update branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-branding');

CREATE POLICY "Authenticated users can delete branding"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-branding');