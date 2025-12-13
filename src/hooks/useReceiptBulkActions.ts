import { useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { downloadReceiptsAsZip } from '@/utils/receiptDownloadUtils';
import { UnifiedReceipt } from './useReceiptsData';

/**
 * Props for useReceiptBulkActions hook
 */
interface UseReceiptBulkActionsProps {
  selectedIds: string[];
  allReceipts: UnifiedReceipt[];
  loadReceipts: () => void;
  setSelectedIds: (ids: string[]) => void;
  setBulkRejectDialogOpen?: (open: boolean) => void;
  setDeleteDialogOpen?: (open: boolean) => void;
}

/**
 * Hook for managing bulk receipt actions (approve, reject, download, delete)
 * 
 * @param props - Configuration object for the hook
 * @param props.selectedIds - Array of selected receipt IDs
 * @param props.allReceipts - Array of all receipts (for download mapping)
 * @param props.loadReceipts - Function to refresh the receipts list
 * @param props.setSelectedIds - Function to update selected IDs
 * @param props.setBulkRejectDialogOpen - Optional function to control bulk reject dialog
 * @param props.setDeleteDialogOpen - Optional function to control delete dialog visibility
 * @returns Object containing bulk action handlers
 * @returns {Function} handleBulkApprove - Handler to approve selected receipts
 * @returns {Function} handleBulkReject - Handler to reject selected receipts with reason
 * @returns {Function} handleBulkDownloadSelected - Handler to download selected receipts as ZIP
 * @returns {Function} handleBulkDelete - Handler to delete selected receipts
 * 
 * @example
 * ```tsx
 * const bulkActions = useReceiptBulkActions({
 *   selectedIds,
 *   allReceipts,
 *   loadReceipts,
 *   setSelectedIds
 * });
 * <Button onClick={bulkActions.handleBulkApprove}>Approve Selected</Button>
 * ```
 */
export const useReceiptBulkActions = ({
  selectedIds,
  allReceipts,
  loadReceipts,
  setSelectedIds,
  setBulkRejectDialogOpen,
  setDeleteDialogOpen,
}: UseReceiptBulkActionsProps) => {
  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Failed to get user for bulk receipt approval:', {
          selectedIds,
          error: authError.message
        });
        throw new Error('Authentication failed');
      }
      
      const { error } = await supabase
        .from('receipts')
        .update({
          approval_status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .in('id', selectedIds);

      if (error) {
        console.error('Failed to bulk approve receipts:', {
          selectedIds,
          userId: user?.id,
          count: selectedIds.length,
          error: error.message,
          errorDetails: error
        });
        throw error;
      }
      
      toast.success(`${selectedIds.length} ${selectedIds.length === 1 ? 'receipt' : 'receipts'} approved`);
      setSelectedIds([]);
      loadReceipts();
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to approve receipts';
      console.error('Bulk receipt approval error:', {
        selectedIds,
        count: selectedIds.length,
        error: errorMessage,
        stack: error?.stack
      });
      toast.error(`Failed to approve ${selectedIds.length} ${selectedIds.length === 1 ? 'receipt' : 'receipts'}: ${errorMessage}`);
    }
  }, [selectedIds, loadReceipts, setSelectedIds]);

  const handleBulkReject = useCallback(async (reason: string) => {
    if (selectedIds.length === 0) return;
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
        .in('id', selectedIds);

      if (error) {
        console.error('Failed to bulk reject receipts:', {
          selectedIds,
          reason,
          count: selectedIds.length,
          error: error.message,
          errorDetails: error
        });
        throw error;
      }
      
      toast.success(`${selectedIds.length} ${selectedIds.length === 1 ? 'receipt' : 'receipts'} rejected`);
      if (setBulkRejectDialogOpen) {
        setBulkRejectDialogOpen(false);
      }
      setSelectedIds([]);
      loadReceipts();
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to reject receipts';
      console.error('Bulk receipt rejection error:', {
        selectedIds,
        reason,
        count: selectedIds.length,
        error: errorMessage,
        stack: error?.stack
      });
      toast.error(`Failed to reject ${selectedIds.length} ${selectedIds.length === 1 ? 'receipt' : 'receipts'}: ${errorMessage}`);
    }
  }, [selectedIds, loadReceipts, setSelectedIds, setBulkRejectDialogOpen]);

  const handleBulkDownloadSelected = useCallback(async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const receiptsToDownload = allReceipts
        .filter(r => selectedIds.includes(r.id))
        .map(r => ({
          id: r.id,
          attachment_url: r.image_url,
          worker_name: r.payee_name,
          project_number: r.project_number,
          expense_date: r.date,
          hours: r.hours || 0,
        }));
      
      if (receiptsToDownload.length === 0) {
        toast.error('No receipts found to download');
        return;
      }
      
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const filename = `selected_receipts_${dateStr}.zip`;
      
      toast.success(`Downloading ${selectedIds.length} ${selectedIds.length === 1 ? 'receipt' : 'receipts'}...`);
      await downloadReceiptsAsZip(receiptsToDownload, filename);
      toast.success('Download complete');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to download receipts';
      console.error('Bulk receipt download error:', {
        selectedIds,
        count: selectedIds.length,
        error: errorMessage,
        stack: error?.stack
      });
      toast.error(`Failed to download receipts: ${errorMessage}`);
    }
  }, [selectedIds, allReceipts]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    
    try {
      // Only standalone receipts can be deleted (time entry receipts are part of expenses)
      const { error } = await supabase
        .from('receipts')
        .delete()
        .in('id', selectedIds);

      if (error) {
        console.error('Failed to bulk delete receipts:', {
          selectedIds,
          count: selectedIds.length,
          error: error.message,
          errorDetails: error
        });
        throw error;
      }
      
      toast.success(`${selectedIds.length} ${selectedIds.length === 1 ? 'receipt' : 'receipts'} deleted`);
      if (setDeleteDialogOpen) {
        setDeleteDialogOpen(false);
      }
      setSelectedIds([]);
      loadReceipts();
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to delete receipts';
      console.error('Bulk receipt deletion error:', {
        selectedIds,
        count: selectedIds.length,
        error: errorMessage,
        stack: error?.stack
      });
      toast.error(`Failed to delete ${selectedIds.length} ${selectedIds.length === 1 ? 'receipt' : 'receipts'}: ${errorMessage}`);
    }
  }, [selectedIds, loadReceipts, setSelectedIds, setDeleteDialogOpen]);

  return {
    handleBulkApprove,
    handleBulkReject,
    handleBulkDownloadSelected,
    handleBulkDelete,
  };
};
