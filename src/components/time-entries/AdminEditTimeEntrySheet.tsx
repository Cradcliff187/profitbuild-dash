import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ManualTimeEntrySheet } from '@/components/time-entry-form';
import type { TimeEntryFormData } from '@/components/time-entry-form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { checkTimeOverlap, validateTimeEntryHoursV2 } from '@/utils/timeEntryValidation';
import { calculateTimeEntryAmount } from '@/utils/timeEntryCalculations';
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
  const [loading, setLoading] = useState(false);

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
    };
  }, [entry]);

  const canEdit = !entry?.is_locked;
  const canDelete = !entry?.is_locked;

  const handleSave = async (formData: TimeEntryFormData) => {
    if (!entry) return;

    if (!formData.workerId || !formData.projectId || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.hours < 0.25 || formData.hours > 24) {
      toast.error('Hours must be between 0.25 and 24');
      return;
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
          setLoading(false);
          return;
        }

        const overlapCheck = await checkTimeOverlap(
          formData.workerId,
          formData.date,
          formData.startTime,
          formData.endTime,
          entry.id
        );

        if (overlapCheck.hasOverlap) {
          const proceed = window.confirm(
            `⚠️ ${overlapCheck.message}\n\nContinue saving?`
          );
          if (!proceed) {
            setLoading(false);
            return;
          }
        }

        if (formData.hours <= 0) {
          toast.error('Lunch duration cannot exceed shift duration');
          setLoading(false);
          return;
        }
      }

      const { data: workerData } = await supabase
        .from('payees')
        .select('hourly_rate')
        .eq('id', formData.workerId)
        .single();

      const rate = workerData?.hourly_rate || 75;
      const amount = calculateTimeEntryAmount(formData.hours, rate);

      const description =
        formData.startTime && formData.endTime
          ? `${format(formData.startTime, 'h:mm a')} - ${format(formData.endTime, 'h:mm a')}`
          : '';

      const { data: { user } } = await supabase.auth.getUser();

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
          description,
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
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error updating time entry:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update time entry'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;

    if (!confirm('Are you sure you want to delete this time entry?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', entry.id);

      if (error) throw error;

      toast.success('Time entry deleted');
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error deleting time entry:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete time entry'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
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
      showReceipt={false}
      showRates={false}
      restrictToCurrentUser={false}
    />
  );
};
