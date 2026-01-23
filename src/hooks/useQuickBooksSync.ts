import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QuickBooksSyncConfig {
  sync_frequency: 'manual' | 'daily' | 'weekly';
  default_days_back: number;
}

export interface UseQuickBooksSyncReturn {
  isEnabled: boolean;
  config: QuickBooksSyncConfig | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to check QuickBooks auto sync feature flag and configuration
 */
export function useQuickBooksSync(): UseQuickBooksSyncReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [config, setConfig] = useState<QuickBooksSyncConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFeatureFlag = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('feature_flags')
        .select('enabled, config')
        .eq('flag_name', 'quickbooks_auto_sync')
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setIsEnabled(data?.enabled || false);
      setConfig((data?.config as unknown as QuickBooksSyncConfig) || {
        sync_frequency: 'manual',
        default_days_back: 30
      });
    } catch (err) {
      console.error('Error fetching QuickBooks sync feature flag:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch feature flag'));
      setIsEnabled(false);
      setConfig(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatureFlag();
  }, []);

  return {
    isEnabled,
    config,
    isLoading,
    error,
    refetch: fetchFeatureFlag
  };
}
