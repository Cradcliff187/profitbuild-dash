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
      // Fetch pending time entries (any expense row with start_time set, regardless of category).
      // Discriminator widened so subcontractor labor providers' time entries are counted too.
      const { count: timeCount } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .not('start_time', 'is', null)
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

    // P0 FIX (May 2026): realtime subscriptions on this hook are temporarily
    // disabled. They mount inside AppSidebar (admin-only) immediately after
    // login, and the postgres_changes channel's setAuth → token-refresh chain
    // was triggering refresh-token rate-limit cascades that bounced admins
    // back to the login page in a loop. Counts now refresh on:
    //   * Hook mount (AppSidebar mount, route changes)
    //   * Next navigation that remounts the sidebar
    // Real-time refresh of the pending badge is not critical — counts are
    // checked when admins navigate, which is frequent enough.
    return () => {
      // No-op cleanup; left as a placeholder for when we re-enable realtime
      // with a different mechanism (e.g., periodic poll, focus event, or
      // dedicated low-volume notification channel).
    };
  }, [isAdmin, isManager]);

  return {
    pendingTimeEntries,
    pendingReceipts,
    total: pendingTimeEntries + pendingReceipts,
    isLoading
  };
}
