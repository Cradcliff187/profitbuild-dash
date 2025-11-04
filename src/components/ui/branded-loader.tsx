import React, { useState, useEffect } from 'react';
import { getCompanyBranding } from '@/utils/companyBranding';

export interface BrandedLoaderProps {
  message?: string;
}

const DEFAULT_LOGO_URL = "https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Stacked%20Icon+Logo%20Transparent%202000x2000.png";

export const BrandedLoader: React.FC<BrandedLoaderProps> = ({ 
  message = "Loading..." 
}) => {
  const [logoIcon, setLogoIcon] = useState<string | null>(null);
  
  useEffect(() => {
    getCompanyBranding().then(branding => {
      setLogoIcon(branding?.logo_icon_url || DEFAULT_LOGO_URL);
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="relative w-20 h-20">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full branded-spin" />
        
        {/* Logo in center */}
        {logoIcon && (
          <img 
            src={logoIcon}
            alt=""
            className="absolute inset-0 m-auto w-12 h-12 object-contain"
          />
        )}
      </div>
      
      <span className="text-sm font-medium text-primary">{message}</span>
    </div>
  );
};
