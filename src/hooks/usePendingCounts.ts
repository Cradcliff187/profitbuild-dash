import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRoles } from '@/contexts/RoleContext';

interface PendingCounts {
  pendingTimeEntries: number;
  pendingReceipts: number;
  total: number;
  isLoading: boolean;
}

export function usePendingCounts(): PendingCounts {
  const [pendingTimeEntries, setPendingTimeEntries] = useState(0);
  const [pendingReceipts, setPendingReceipts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin, isManager } = useRoles();

  const fetchCounts = async () => {
    // Only fetch for admins/managers who can see the Time Approvals page
    if (!isAdmin && !isManager) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch pending time entries (labor_internal with pending or null status)
      const { count: timeCount } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('category', 'labor_internal')
        .or('approval_status.is.null,approval_status.eq.pending');

      // Fetch pending receipts
      const { count: receiptCount } = await supabase
        .from('receipts')
        .select('*', { count: 'exact', head: true })
        .or('approval_status.is.null,approval_status.eq.pending');

      setPendingTimeEntries(timeCount || 0);
      setPendingReceipts(receiptCount || 0);
    } catch (error) {
      console.error('Error fetching pending counts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();

    // Set up real-time subscriptions
    const expensesChannel = supabase
      .channel('pending-time-entries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: 'category=eq.labor_internal'
        },
        () => fetchCounts()
      )
      .subscribe();

    const receiptsChannel = supabase
      .channel('pending-receipts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'receipts'
        },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(receiptsChannel);
    };
  }, [isAdmin, isManager]);

  return {
    pendingTimeEntries,
    pendingReceipts,
    total: pendingTimeEntries + pendingReceipts,
    isLoading
  };
}
