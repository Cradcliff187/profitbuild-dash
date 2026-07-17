import { useState } from 'react';
import { ManualTimeEntrySheet } from '@/components/time-entry-form';
import type { TimeEntryFormData } from '@/components/time-entry-form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { checkTimeOverlap, validateTimeEntryHoursV2 } from '@/utils/timeEntryValidation';
import { calculateTimeEntryAmount } from '@/utils/timeEntryCalculations';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { overlapConfirmOptions } from '@/components/time-entry-form/overlapConfirm';

interface AdminCreateTimeEntrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AdminCreateTimeEntrySheet = ({
  open,
  onOpenChange,
  onSuccess,
}: AdminCreateTimeEntrySheetProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  // Returns true only when the insert persisted — ManualTimeEntrySheet owns
  // the close and stays open on false, preserving the user's form state.
  const handleSave = async (formData: TimeEntryFormData): Promise<boolean> => {
    if (!formData.workerId || !formData.projectId || !formData.date) {
      toast.error('Please fill in all required fields');
      return false;
    }

    if (formData.hours < 0.25 || formData.hours > 24) {
      toast.error('Hours must be between 0.25 and 24');
      return false;
    }

    setLoading(true);
    try {
      if (!formData.isPTO && formData.startTime && formData.endTime) {
        const hoursValidation = validateTimeEntryHoursV2(
          formData.startTime,
          formData.endTime
        );
        if (!hoursValidation.valid) {
          toast.error(hoursValidation.message);
          return false;
        }

        if (formData.hours <= 0) {
          toast.error('Lunch duration cannot exceed shift duration');
          return false;
        }

        const overlapCheck = await checkTimeOverlap(
          formData.workerId,
          formData.date,
          formData.startTime,
          formData.endTime
        );

        if (overlapCheck.hasOverlap) {
          const proceed = await confirm(
            overlapConfirmOptions(
              overlapCheck,
              'Overlapping entries may cause payment issues. Continue anyway?'
            )
          );
          if (!proceed) {
            return false;
          }
        }
      }

      const { data: workerData } = await supabase
        .from('payees')
        .select('hourly_rate')
        .eq('id', formData.workerId)
        .single();

      const rate = workerData?.hourly_rate || 75;
      const amount = calculateTimeEntryAmount(formData.hours, rate);

      const { error } = await supabase.from('expenses').insert({
        payee_id: formData.workerId,
        project_id: formData.projectId,
        expense_date: formData.date,
        start_time: formData.startTime
          ? formData.startTime.toISOString()
          : null,
        end_time: formData.endTime ? formData.endTime.toISOString() : null,
        amount,
        description: formData.notes || '',
        category: 'labor_internal',
        transaction_type: 'expense',
        user_id: user?.id,
        updated_by: user?.id,
        // Send hours / gross_hours always. The DB trigger calculate_gross_hours
        // overrides these from start_time/end_time when both are set; for PTO
        // entries (both NULL) the trigger preserves what we send. See May 8
        // 2026 fix — without this, PTO entries land with hours=NULL.
        hours: formData.hours,
        gross_hours: formData.grossHours,
        lunch_taken: formData.lunchTaken,
        lunch_duration_minutes: formData.lunchTaken
          ? formData.lunchDurationMinutes
          : null,
      });

      if (error) throw error;

      toast.success('Time entry created successfully');
      onSuccess();
      return true;
    } catch (error: unknown) {
      console.error('Error creating time entry:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create time entry'
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ManualTimeEntrySheet
        open={open}
        onOpenChange={onOpenChange}
        mode="create"
        title="Create Time Entry"
        description="Add a new time entry for internal labor"
        onSave={handleSave}
        onCancel={() => onOpenChange(false)}
        disabled={loading}
        showReceipt={false}
        showRates={false}
        restrictToCurrentUser={false}
      />
      {confirmDialog}
    </>
  );
};
