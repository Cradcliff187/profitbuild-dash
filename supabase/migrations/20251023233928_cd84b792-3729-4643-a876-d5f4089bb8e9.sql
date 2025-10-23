-- Company branding settings table
CREATE TABLE IF NOT EXISTS public.company_branding_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_full_url TEXT,
  logo_icon_url TEXT,
  logo_stacked_url TEXT,
  logo_report_header_url TEXT,
  company_name TEXT DEFAULT 'Construction Company',
  company_legal_name TEXT,
  company_abbreviation TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_license TEXT,
  primary_color TEXT DEFAULT '#1b2b43',
  secondary_color TEXT DEFAULT '#2b2b2b',
  accent_color TEXT DEFAULT '#cf791d',
  light_bg_color TEXT DEFAULT '#f4f7f9',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.company_branding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read branding settings"
  ON public.company_branding_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can update branding settings"
  ON public.company_branding_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for company branding
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-branding', 'company-branding', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Anyone authenticated can view branding files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-branding' AND auth.role() = 'authenticated');

CREATE POLICY "Only admins can upload branding files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-branding' AND
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Only admins can update branding files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'company-branding' AND
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Insert default Radcliff Construction Group settings
INSERT INTO public.company_branding_settings (
  company_name,
  company_legal_name,
  company_abbreviation,
  primary_color,
  secondary_color,
  accent_color,
  light_bg_color
) VALUES (
  'Radcliff Construction Group',
  'Radcliff Construction Group, LLC',
  'RCG',
  '#1b2b43',
  '#2b2b2b',
  '#cf791d',
  '#f4f7f9'
);