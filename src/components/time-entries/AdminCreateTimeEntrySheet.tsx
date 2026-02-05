import { useState } from 'react';
import { format } from 'date-fns';
import { ManualTimeEntrySheet } from '@/components/time-entry-form';
import type { TimeEntryFormData } from '@/components/time-entry-form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { checkTimeOverlap, validateTimeEntryHoursV2 } from '@/utils/timeEntryValidation';
import { calculateTimeEntryAmount } from '@/utils/timeEntryCalculations';

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
  const [loading, setLoading] = useState(false);

  const handleSave = async (formData: TimeEntryFormData) => {
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
      if (!formData.isPTO && formData.startTime && formData.endTime) {
        const hoursValidation = validateTimeEntryHoursV2(
          formData.startTime,
          formData.endTime
        );
        if (!hoursValidation.valid) {
          toast.error(hoursValidation.message);
          setLoading(false);
          return;
        }

        if (formData.hours <= 0) {
          toast.error('Lunch duration cannot exceed shift duration');
          setLoading(false);
          return;
        }

        const overlapCheck = await checkTimeOverlap(
          formData.workerId,
          formData.date,
          formData.startTime,
          formData.endTime
        );

        if (overlapCheck.hasOverlap) {
          const proceed = window.confirm(
            `⚠️ ${overlapCheck.message}\n\nOverlapping entries may cause payment issues. Continue anyway?`
          );
          if (!proceed) {
            setLoading(false);
            return;
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

      const description =
        formData.startTime && formData.endTime
          ? `${format(formData.startTime, 'h:mm a')} - ${format(formData.endTime, 'h:mm a')}`
          : '';

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('expenses').insert({
        payee_id: formData.workerId,
        project_id: formData.projectId,
        expense_date: formData.date,
        start_time: formData.startTime
          ? formData.startTime.toISOString()
          : null,
        end_time: formData.endTime ? formData.endTime.toISOString() : null,
        amount,
        description,
        category: 'labor_internal',
        transaction_type: 'expense',
        user_id: user?.id,
        updated_by: user?.id,
        lunch_taken: formData.lunchTaken,
        lunch_duration_minutes: formData.lunchTaken
          ? formData.lunchDurationMinutes
          : null,
      });

      if (error) throw error;

      toast.success('Time entry created successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error creating time entry:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create time entry'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
};
