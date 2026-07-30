import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ManualTimeEntrySheet } from '@/components/time-entry-form';
import type { TimeEntryFormData } from '@/components/time-entry-form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { checkTimeOverlap, validateTimeEntryHoursV2 } from '@/utils/timeEntryValidation';
import { calculateTimeEntryAmount } from '@/utils/timeEntryCalculations';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { overlapConfirmOptions } from '@/components/time-entry-form/overlapConfirm';
import { TimeEntryListItem } from '@/types/timeEntry';
import { DEFAULT_LUNCH_DURATION } from '@/utils/timeEntryCalculations';

interface AdminEditTimeEntrySheetProps {
  entry: TimeEntryListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AdminEditTimeEntrySheet = ({
  entry,
  open,
  onOpenChange,
  onSuccess,
}: AdminEditTimeEntrySheetProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const initialValues = useMemo(() => {
    if (!entry) return undefined;

    let startTime = '08:00';
    let endTime = '17:00';

    if (entry.start_time && entry.end_time) {
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      startTime = format(start, 'HH:mm');
      endTime = format(end, 'HH:mm');
    }

    const hours = entry.hours ?? 8;

    // Strip auto-generated time range descriptions from old entries
    // so they don't appear as user-written notes
    const TIME_RANGE_PATTERN = /^\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M$/i;
    const rawDescription = entry.description || '';
    const notes = TIME_RANGE_PATTERN.test(rawDescription.trim()) ? '' : rawDescription;

    return {
      workerId: entry.payee_id || '',
      projectId: entry.project_id || '',
      projectNumber: entry.project_number ?? undefined,
      date: entry.expense_date || format(new Date(), 'yyyy-MM-dd'),
      startTime,
      endTime,
      hours,
      lunchTaken: entry.lunch_taken || false,
      lunchDurationMinutes:
        entry.lunch_duration_minutes ?? DEFAULT_LUNCH_DURATION,
      notes,
    };
  }, [entry]);

  const canEdit = !entry?.is_locked;
  const canDelete = !entry?.is_locked;

  // Returns true only when the update persisted — ManualTimeEntrySheet owns
  // the close and stays open on false, preserving the user's form state.
  const handleSave = async (formData: TimeEntryFormData): Promise<boolean> => {
    if (!entry) return false;

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
      if (
        !formData.isPTO &&
        formData.startTime &&
        formData.endTime
      ) {
        const hoursValidation = validateTimeEntryHoursV2(
          formData.startTime,
          formData.endTime
        );
        if (!hoursValidation.valid) {
          toast.error(hoursValidation.message);
          return false;
        }

        const overlapCheck = await checkTimeOverlap(
          formData.workerId,
          formData.date,
          formData.startTime,
          formData.endTime,
          entry.id
        );

        if (overlapCheck.hasOverlap) {
          const proceed = await confirm(
            overlapConfirmOptions(overlapCheck, 'Continue saving?')
          );
          if (!proceed) {
            return false;
          }
        }

        if (formData.hours <= 0) {
          toast.error('Lunch duration cannot exceed shift duration');
          return false;
        }
      }

      const { data: workerData } = await supabase
        .from('payees')
        .select('hourly_rate')
        .eq('id', formData.workerId)
        .single();

      const rate = workerData?.hourly_rate || 75;
      const amount = calculateTimeEntryAmount(formData.hours, rate);

      const { error } = await supabase
        .from('expenses')
        .update({
          payee_id: formData.workerId,
          project_id: formData.projectId,
          expense_date: formData.date,
          start_time: formData.startTime
            ? formData.startTime.toISOString()
            : null,
          end_time: formData.endTime
            ? formData.endTime.toISOString()
            : null,
          amount,
          description: formData.notes || '',
          // Send hours / gross_hours always. The DB trigger calculate_gross_hours
          // overrides from start_time/end_time when both are set; for PTO entries
          // (both NULL) the trigger preserves what we send. May 8 2026 fix.
          hours: formData.hours,
          gross_hours: formData.grossHours,
          lunch_taken: formData.lunchTaken,
          lunch_duration_minutes: formData.lunchTaken
            ? formData.lunchDurationMinutes
            : null,
          updated_by: user?.id,
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast.success('Time entry updated successfully');
      onSuccess();
      return true;
    } catch (error: unknown) {
      console.error('Error updating time entry:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update time entry'
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (): Promise<boolean> => {
    if (!entry) return false;

    const proceed = await confirm({
      title: 'Delete this time entry?',
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!proceed) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', entry.id);

      if (error) throw error;

      toast.success('Time entry deleted');
      onSuccess();
      return true;
    } catch (error: unknown) {
      console.error('Error deleting time entry:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete time entry'
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
        mode="edit"
        title="Edit Time Entry"
        description="Update time entry details"
        initialValues={initialValues}
        onSave={handleSave}
        onCancel={() => onOpenChange(false)}
        onDelete={handleDelete}
        disabled={loading}
        canEdit={canEdit}
        canDelete={canDelete}
        isLocked={entry?.is_locked ?? false}
        showReceipt={false}
        showRates={false}
        restrictToCurrentUser={false}
      />
      {confirmDialog}
    </>
  );
};
