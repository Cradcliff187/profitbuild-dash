import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

/**
 * Props for useTimeEntryActions hook
 */
interface UseTimeEntryActionsProps {
  user: User | null;
  refreshTimeEntries: () => void;
  setSelectedIds: (ids: string[]) => void;
  setRejectDialogOpen?: (open: boolean) => void;
  setDeleteDialogOpen?: (open: boolean) => void;
}

/**
 * Hook for managing time entry actions (approve, reject, delete)
 * 
 * @param props - Configuration object for the hook
 * @param props.user - Current authenticated user
 * @param props.refreshTimeEntries - Function to refresh the time entries list
 * @param props.setSelectedIds - Function to update selected IDs
 * @param props.setRejectDialogOpen - Optional function to control reject dialog visibility
 * @param props.setDeleteDialogOpen - Optional function to control delete dialog visibility
 * @returns Object containing action handlers
 * @returns {Function} handleApprove - Handler to approve one or more time entries
 * @returns {Function} handleReject - Handler to reject one or more time entries with reason
 * @returns {Function} handleDelete - Handler to delete one or more time entries
 * 
 * @example
 * ```tsx
 * const actions = useTimeEntryActions({
 *   user,
 *   refreshTimeEntries,
 *   setSelectedIds: selection.setSelectedIds
 * });
 * <Button onClick={() => actions.handleApprove([entryId])}>Approve</Button>
 * ```
 */
export const useTimeEntryActions = ({
  user,
  refreshTimeEntries,
  setSelectedIds,
  setRejectDialogOpen,
  setDeleteDialogOpen,
}: UseTimeEntryActionsProps) => {
  const handleApprove = useCallback(async (entryIds: string[]) => {
    if (entryIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          approval_status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .in("id", entryIds);

      if (error) {
        console.error('Failed to approve time entries:', {
          entryIds,
          userId: user?.id,
          error: error.message,
          errorDetails: error
        });
        throw error;
      }

      toast({
        title: "Success",
        description: `${entryIds.length} ${entryIds.length === 1 ? "entry" : "entries"} approved`,
      });
      setSelectedIds([]);
      refreshTimeEntries();
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to approve entries";
      console.error('Time entry approval error:', {
        entryIds,
        userId: user?.id,
        error: errorMessage,
        stack: error?.stack
      });
      toast({
        title: "Error",
        description: `Failed to approve ${entryIds.length} ${entryIds.length === 1 ? "entry" : "entries"}: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [user?.id, refreshTimeEntries, setSelectedIds]);

  const handleReject = useCallback(async (entryIds: string[], reason: string) => {
    if (entryIds.length === 0) return;
    if (!reason || reason.trim().length === 0) {
      toast({
        title: "Error",
        description: "Rejection reason is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          approval_status: "rejected",
          rejection_reason: reason,
          approved_by: null,
          approved_at: null,
        })
        .in("id", entryIds);

      if (error) {
        console.error('Failed to reject time entries:', {
          entryIds,
          reason,
          error: error.message,
          errorDetails: error
        });
        throw error;
      }

      toast({
        title: "Success",
        description: `${entryIds.length} ${entryIds.length === 1 ? "entry" : "entries"} rejected`,
      });
      setSelectedIds([]);
      if (setRejectDialogOpen) {
        setRejectDialogOpen(false);
      }
      refreshTimeEntries();
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to reject entries";
      console.error('Time entry rejection error:', {
        entryIds,
        reason,
        error: errorMessage,
        stack: error?.stack
      });
      toast({
        title: "Error",
        description: `Failed to reject ${entryIds.length} ${entryIds.length === 1 ? "entry" : "entries"}: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [refreshTimeEntries, setSelectedIds, setRejectDialogOpen]);

  const handleDelete = useCallback(async (entryIds: string[]) => {
    if (entryIds.length === 0) return;

    try {
      const { error } = await supabase.from("expenses").delete().in("id", entryIds);

      if (error) {
        console.error('Failed to delete time entries:', {
          entryIds,
          error: error.message,
          errorDetails: error
        });
        throw error;
      }

      toast({
        title: "Success",
        description: `${entryIds.length} ${entryIds.length === 1 ? "entry" : "entries"} deleted`,
      });
      setSelectedIds([]);
      if (setDeleteDialogOpen) {
        setDeleteDialogOpen(false);
      }
      refreshTimeEntries();
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete entries";
      console.error('Time entry deletion error:', {
        entryIds,
        error: errorMessage,
        stack: error?.stack
      });
      toast({
        title: "Error",
        description: `Failed to delete ${entryIds.length} ${entryIds.length === 1 ? "entry" : "entries"}: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [refreshTimeEntries, setSelectedIds, setDeleteDialogOpen]);

  return {
    handleApprove,
    handleReject,
    handleDelete,
  };
};

