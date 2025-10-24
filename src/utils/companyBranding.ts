import { supabase } from '@/integrations/supabase/client';

export interface CompanyBranding {
  id: string;
  logo_full_url: string | null;
  logo_icon_url: string | null;
  logo_stacked_url: string | null;
  logo_report_header_url: string | null;
  company_name: string;
  company_legal_name: string | null;
  company_abbreviation: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_license: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  light_bg_color: string;
  created_at: string;
  updated_at: string;
}

export async function getCompanyBranding(): Promise<CompanyBranding | null> {
  try {
    const { data, error } = await supabase
      .from('company_branding_settings')
      .select('*')
      .single();
    
    if (error) {
      console.error('Error fetching company branding:', error);
      return null;
    }
    
    // Log logo URLs for debugging
    if (data?.logo_full_url) {
      console.log('✅ Full logo URL:', data.logo_full_url);
    }
    if (data?.logo_icon_url) {
      console.log('✅ Icon logo URL:', data.logo_icon_url);
    }
    if (data?.logo_stacked_url) {
      console.log('✅ Stacked logo URL:', data.logo_stacked_url);
    }
    
    return data;
  } catch (error) {
    console.error('Exception fetching company branding:', error);
    return null;
  }
}

export async function updateCompanyBranding(
  branding: Partial<CompanyBranding>
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('company_branding_settings')
    .update(branding)
    .eq('id', branding.id);
  
  return { error };
}

export async function uploadLogo(
  file: File,
  variant: 'full' | 'icon' | 'stacked' | 'report-header'
): Promise<string | null> {
  const fileName = `logo-${variant}-${Date.now()}.${file.name.split('.').pop()}`;
  
  const { data, error } = await supabase.storage
    .from('company-branding')
    .upload(fileName, file);
  
  if (error) {
    console.error('Error uploading logo:', error);
    return null;
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from('company-branding')
    .getPublicUrl(data.path);
  
  return publicUrl;
}

export async function getLogoSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('company-branding')
    .createSignedUrl(path, 3600); // 1 hour expiry
  
  if (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
  
  return data.signedUrl;
}
