/**
 * Hook for syncing receipts to QuickBooks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncResult {
  success: boolean;
  quickbooks_transaction_id?: string;
  transactionId?: string;
  purchase?: any;
  error?: string;
  projectNumber?: string;
}

interface QuickBooksAccount {
  id: string;
  name: string;
  type: string;
  subAccount: boolean;
}

interface DryRunResult {
  dryRun: true;
  payload: any;
  availableAccounts: QuickBooksAccount[];
  selectedAccount: {
    value: string;
    name: string;
  };
  projectNumber: string | null;
}

export function useQuickBooksSync() {
  const queryClient = useQueryClient();

  // Dry run - preview what would be sent
  const previewMutation = useMutation({
    mutationFn: async ({ receiptId, accountId, paymentType }: { receiptId: string; accountId?: string; paymentType?: string }): Promise<DryRunResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Use raw fetch to get actual error response body (Supabase client doesn't expose it for 400s)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const httpResponse = await fetch(`${supabaseUrl}/functions/v1/quickbooks-sync-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiptId, dryRun: true, accountId, paymentType }),
      });

      const data = await httpResponse.json();

      if (!httpResponse.ok) {
        const errorMsg = data.details || data.error || `HTTP ${httpResponse.status}`;
        console.error('🔴 Preview failed:', errorMsg, data);
        throw new Error(errorMsg);
      }

      return data;
    },
  });

  // Actual sync
  const syncMutation = useMutation({
    mutationFn: async ({ receiptId, accountId, paymentType }: { receiptId: string; accountId?: string; paymentType?: string }): Promise<SyncResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Use raw fetch to get actual error response body (Supabase client doesn't expose it for 400s)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const httpResponse = await fetch(`${supabaseUrl}/functions/v1/quickbooks-sync-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiptId, dryRun: false, accountId, paymentType }),
      });

      const data = await httpResponse.json();

      if (!httpResponse.ok) {
        const errorMsg = data.details || data.error || `HTTP ${httpResponse.status}`;
        console.error('🔴 Sync failed:', errorMsg, data);
        throw new Error(errorMsg);
      }

      if (!data.success) {
        const errorMsg = data.message || 'Sync operation failed';
        console.error('🔴 Sync unsuccessful:', errorMsg, data);
        throw new Error(errorMsg);
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Receipt synced to QuickBooks');
        queryClient.invalidateQueries({ queryKey: ['receipts'] });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to sync to QuickBooks');
    },
  });

  return {
    preview: previewMutation.mutateAsync,
    isPreviewing: previewMutation.isPending,
    previewData: previewMutation.data,
    
    sync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    syncResult: syncMutation.data,
    syncError: syncMutation.error,
  };
}
