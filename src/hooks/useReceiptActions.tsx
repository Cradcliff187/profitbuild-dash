import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

interface UseReceiptActionsProps {
  loadReceipts: () => void;
  setRejectDialogOpen?: (open: boolean) => void;
  setReceiptToReject?: (id: string | null) => void;
}

/**
 * Hook for managing single receipt actions (approve, reject, delete)
 * 
 * @param props - Configuration object for the hook
 * @param props.loadReceipts - Function to refresh the receipts list
 * @param props.setRejectDialogOpen - Optional function to control reject dialog visibility
 * @param props.setReceiptToReject - Optional function to set receipt ID for rejection
 * @returns Object containing action handlers
 * @returns {Function} handleApproveReceipt - Handler to approve a single receipt
 * @returns {Function} handleRejectReceipt - Handler to reject a single receipt with reason
 * @returns {Function} handleDeleteReceipt - Handler to delete a single receipt
 * @returns {ReactNode} confirmDialog - MUST be rendered by the consumer (Gotcha #73);
 *   the delete confirmation never resolves if this node isn't mounted.
 *
 * @example
 * ```tsx
 * const actions = useReceiptActions({ loadReceipts });
 * <Button onClick={() => actions.handleApproveReceipt(receiptId)}>Approve</Button>
 * {actions.confirmDialog}
 * ```
 */
export const useReceiptActions = ({
  loadReceipts,
  setRejectDialogOpen,
  setReceiptToReject,
}: UseReceiptActionsProps) => {
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  // Gotcha #63: user comes from context — no supabase.auth.getUser() on the
  // approve path (network round-trip + auth-lock serialization).
  const { user } = useAuth();
  const handleApproveReceipt = useCallback(async (receiptId: string) => {
    if (!receiptId) {
      toast.error('Invalid receipt ID');
      return;
    }

    try {
      if (!user) {
        console.error('No authenticated user for receipt approval:', { receiptId });
        throw new Error('Authentication failed');
      }

      const { error } = await supabase
        .from('receipts')
        .update({
          approval_status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', receiptId);

      if (error) {
        console.error('Failed to approve receipt:', {
          receiptId,
          userId: user?.id,
          error: error.message,
          errorDetails: error
        });
        throw error;
      }
      
      toast.success('Receipt approved');
      loadReceipts();
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to approve receipt';
      console.error('Receipt approval error:', {
        receiptId,
        error: errorMessage,
        stack: error?.stack
      });
      toast.error(`Failed to approve receipt: ${errorMessage}`);
    }
  }, [loadReceipts, user]);

  const handleRejectReceipt = useCallback(async (receiptId: string, reason: string) => {
    if (!receiptId) {
      toast.error('Invalid receipt ID');
      return;
    }
    if (!reason || reason.trim().length === 0) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('receipts')
        .update({
          approval_status: 'rejected',
          rejection_reason: reason,
          approved_by: null,
          approved_at: null
        })
        .eq('id', receiptId);

      if (error) {
        console.error('Failed to reject receipt:', {
          receiptId,
          reason,
          error: error.message,
          errorDetails: error
        });
        throw error;
      }
      
      toast.success('Receipt rejected');
      if (setRejectDialogOpen) {
        setRejectDialogOpen(false);
      }
      if (setReceiptToReject) {
        setReceiptToReject(null);
      }
      loadReceipts();
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to reject receipt';
      console.error('Receipt rejection error:', {
        receiptId,
        reason,
        error: errorMessage,
        stack: error?.stack
      });
      toast.error(`Failed to reject receipt: ${errorMessage}`);
    }
  }, [loadReceipts, setRejectDialogOpen, setReceiptToReject]);

  const handleDeleteReceipt = useCallback(async (receiptId: string, receiptType: 'time_entry' | 'standalone') => {
    if (!receiptId) {
      toast.error('Invalid receipt ID');
      return;
    }

    // Only allow deletion of standalone receipts
    if (receiptType !== 'standalone') {
      toast.error('Cannot delete time entry receipts');
      return;
    }

    const proceed = await confirm({
      title: 'Delete this receipt?',
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!proceed) return;

    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId);

      if (error) {
        console.error('Failed to delete receipt:', {
          receiptId,
          receiptType,
          error: error.message,
          errorDetails: error
        });
        throw error;
      }

      toast.success('Receipt deleted');
      loadReceipts();
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to delete receipt';
      console.error('Receipt deletion error:', {
        receiptId,
        receiptType,
        error: errorMessage,
        stack: error?.stack
      });
      toast.error(`Failed to delete receipt: ${errorMessage}`);
    }
  }, [loadReceipts, confirm]);

  return {
    handleApproveReceipt,
    handleRejectReceipt,
    handleDeleteReceipt,
    confirmDialog,
  };
};

