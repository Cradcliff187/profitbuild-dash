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

export type LogoVariant = 'full' | 'icon' | 'stacked' | 'report-header';

export interface BrandingColors {
  primary: string;
  secondary: string;
  accent: string;
  lightBg: string;
}
