/**
 * Hook for checking feature flags
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FeatureFlagConfig {
  environment?: 'sandbox' | 'production';
  allowConnection?: boolean;
  allowReceiptSync?: boolean;
  allowExpenseSync?: boolean;
  requireConfirmation?: boolean;
  showDryRunPreview?: boolean;
  allowedUserIds?: string[];
}

interface FeatureFlag {
  flag_name: string;
  enabled: boolean;
  config: FeatureFlagConfig;
}

export function useFeatureFlag(flagName: string) {
  return useQuery({
    queryKey: ['feature-flag', flagName],
    queryFn: async (): Promise<FeatureFlag | null> => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('flag_name, enabled, config')
        .eq('flag_name', flagName)
        .single();

      if (error) {
        console.error('Error fetching feature flag:', error);
        return null;
      }

      return data as FeatureFlag;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useQuickBooksFeatureFlag() {
  return useFeatureFlag('quickbooks_integration');
}
