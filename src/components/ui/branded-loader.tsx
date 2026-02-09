import React, { useState, useEffect } from 'react';
import { getCompanyBranding } from '@/utils/companyBranding';
import { cn } from '@/lib/utils';

export interface BrandedLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DEFAULT_LOGO_URL = "https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/company-branding/Stacked%20Icon+Logo%20Transparent%202000x2000.png";

const sizeConfig = {
  sm: {
    container: 'gap-2 py-4',
    wrapper: 'w-10 h-10',
    ring: 'w-10 h-10 border-[3px]',
    logo: 'w-6 h-6',
    text: 'text-xs',
  },
  md: {
    container: 'gap-3 py-6',
    wrapper: 'w-14 h-14',
    ring: 'w-14 h-14 border-[3px]',
    logo: 'w-8 h-8',
    text: 'text-xs',
  },
  lg: {
    container: 'gap-4 py-8',
    wrapper: 'w-20 h-20',
    ring: 'w-20 h-20 border-4',
    logo: 'w-12 h-12',
    text: 'text-sm',
  },
};

export const BrandedLoader: React.FC<BrandedLoaderProps> = ({
  message,
  size = 'lg',
  className,
}) => {
  const [logoIcon, setLogoIcon] = useState<string | null>(null);

  useEffect(() => {
    getCompanyBranding().then(branding => {
      setLogoIcon(branding?.logo_icon_url || DEFAULT_LOGO_URL);
    });
  }, []);

  const config = sizeConfig[size];

  const displayMessage = message !== undefined
    ? message
    : size === 'sm'
      ? undefined
      : 'Loading...';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        config.container,
        className
      )}
      role="status"
      aria-label={displayMessage || 'Loading'}
    >
      <div className={cn('relative', config.wrapper)}>
        {/* Outer spinning ring */}
        <div
          className={cn(
            'absolute inset-0 border-primary/20 border-t-primary rounded-full branded-spin',
            config.ring
          )}
        />

        {/* Logo in center */}
        {logoIcon && (
          <img
            src={logoIcon}
            alt=""
            className={cn('absolute inset-0 m-auto object-contain', config.logo)}
          />
        )}
      </div>

      {displayMessage && (
        <span className={cn('font-medium text-primary', config.text)}>
          {displayMessage}
        </span>
      )}
    </div>
  );
};
