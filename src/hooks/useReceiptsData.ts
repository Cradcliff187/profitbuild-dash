import { useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedReceipt {
  id: string;
  type: 'time_entry' | 'standalone';
  image_url: string;
  payee_id: string;
  payee_name: string;
  project_id: string;
  project_number: string;
  project_name: string;
  date: string;
  amount: number;
  description?: string;
  hours?: number;
  approval_status?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  submitted_for_approval_at?: string;
  user_id?: string;
  captured_at?: string;
  submitted_by_name?: string;
}

export const receiptQueryKeys = {
  all: ['receipts'] as const,
  list: () => [...receiptQueryKeys.all, 'list'] as const,
  payees: () => ['receipt-payees'] as const,
  projects: () => ['receipt-projects'] as const,
};

/**
 * Hook for fetching and managing receipt data
 *
 * Fetches standalone receipts from the database, handles real-time updates,
 * and provides statistics. Also fetches payees and projects for filtering.
 *
 * @returns Object containing receipt data, loading state, and utilities
 * @returns {UnifiedReceipt[]} allReceipts - Array of all receipts
 * @returns {boolean} loading - Loading state indicator
 * @returns {Array} payees - Array of payees for filtering
 * @returns {Array} projects - Array of projects for filtering
 * @returns {Function} loadReceipts - Function to manually refresh receipts
 * @returns {Object} statistics - Receipt statistics (pendingCount, approvedTodayCount, etc.)
 */
export const useReceiptsData = () => {
  const queryClient = useQueryClient();

  const {
    data: allReceipts = [],
    isLoading: receiptsLoading,
  } = useQuery({
    queryKey: receiptQueryKeys.list(),
    staleTime: 1000 * 60 * 2, // 2 minutes — realtime subscription still invalidates on actual changes
    queryFn: async (): Promise<UnifiedReceipt[]> => {
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('receipts')
        .select(`
          id,
          image_url,
          amount,
          description,
          captured_at,
          approval_status,
          approved_by,
          approved_at,
          submitted_for_approval_at,
          rejection_reason,
          payee_id,
          project_id,
          user_id,
          payees(payee_name),
          projects(project_number, project_name)
        `)
        .order('captured_at', { ascending: false });

      if (receiptsError) throw receiptsError;

      const userIds = [...new Set((receiptsData || [])
        .filter((r: any) => r.user_id)
        .map((r: any) => r.user_id))];

      let profilesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap.set(p.id, p.full_name || 'Unknown');
          });
        }
      }

      return (receiptsData || [])
        .map((receipt: any) => ({
          id: receipt.id,
          type: 'standalone' as const,
          image_url: receipt.image_url,
          payee_id: receipt.payee_id || '',
          payee_name: receipt.payees?.payee_name || 'Unknown',
          project_id: receipt.project_id || '',
          project_number: receipt.projects?.project_number || 'SYS-000',
          project_name: receipt.projects?.project_name || 'Unassigned',
          date: receipt.captured_at,
          amount: receipt.amount,
          description: receipt.description || '',
          approval_status: receipt.approval_status,
          approved_by: receipt.approved_by,
          approved_at: receipt.approved_at,
          rejection_reason: receipt.rejection_reason,
          submitted_for_approval_at: receipt.submitted_for_approval_at,
          user_id: receipt.user_id,
          captured_at: receipt.captured_at,
          submitted_by_name: receipt.user_id
            ? profilesMap.get(receipt.user_id)
            : undefined,
        }));
    },
  });

  const { data: payeesRaw = [] } = useQuery({
    queryKey: receiptQueryKeys.payees(),
    queryFn: async () => {
      const { data } = await supabase
        .from('payees')
        .select('id, payee_name')
        .eq('is_active', true)
        .order('payee_name');
      return (data || []).map((p: any) => ({ id: p.id, name: p.payee_name }));
    },
    staleTime: 1000 * 60 * 30,
  });

  const { data: projectsRaw = [] } = useQuery({
    queryKey: receiptQueryKeys.projects(),
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, project_number, project_name, category')
        .eq('category', 'construction')
        .order('project_number');
      return (data || []).map((p: any) => ({
        id: p.id,
        number: p.project_number,
        name: p.project_name,
      }));
    },
    staleTime: 1000 * 60 * 30,
  });

  const realtimeDebounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const channel = supabase
      .channel('receipts-realtime-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'receipts',
      }, () => {
        // Debounce to batch rapid changes (e.g. bulk approve of N receipts → 1 refetch)
        clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: receiptQueryKeys.all });
        }, 500);
      })
      .subscribe();

    return () => {
      clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const statistics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return {
      pendingCount: allReceipts.filter(
        (r) => !r.approval_status || r.approval_status === 'pending'
      ).length,
      approvedTodayCount: allReceipts.filter(
        (r) =>
          r.approval_status === 'approved' &&
          r.approved_at &&
          new Date(r.approved_at) >= todayStart
      ).length,
      rejectedCount: allReceipts.filter(
        (r) => r.approval_status === 'rejected'
      ).length,
      totalThisWeekCount: allReceipts.filter(
        (r) => new Date(r.date) >= weekStart
      ).length,
    };
  }, [allReceipts]);

  const loadReceipts = () => {
    queryClient.invalidateQueries({ queryKey: receiptQueryKeys.all });
  };

  return {
    allReceipts,
    loading: receiptsLoading,
    payees: payeesRaw,
    projects: projectsRaw,
    loadReceipts,
    statistics,
  };
};
