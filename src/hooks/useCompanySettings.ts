import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InternalLaborRates } from '@/types/companySettings';

/**
 * Hook to fetch internal labor rates from company settings
 * @returns React Query hook with labor rates data
 */
export function useInternalLaborRates() {
  return useQuery({
    queryKey: ['company-settings', 'internal_labor_rates'],
    queryFn: async (): Promise<InternalLaborRates> => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', 'internal_labor_rates')
        .single();
      
      if (error) throw error;
      
      return data.setting_value as InternalLaborRates;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes - rarely changes
  });
}

/**
 * Hook to update internal labor rates (admin only)
 * @returns React Query mutation hook
 */
export function useUpdateInternalLaborRates() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rates: InternalLaborRates) => {
      const { data, error } = await supabase
        .from('company_settings')
        .update({ 
          setting_value: rates,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'internal_labor_rates')
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings', 'internal_labor_rates'] });
    },
  });
}
