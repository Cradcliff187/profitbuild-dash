import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ManualTimeEntrySheet } from '@/components/time-entry-form';
import type { TimeEntryFormData } from '@/components/time-entry-form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRoles } from '@/contexts/RoleContext';
import { checkTimeOverlap, validateTimeEntryHoursV2 } from '@/utils/timeEntryValidation';
import {
  calculateTimeEntryHours,
  calculateTimeEntryAmount,
  DEFAULT_LUNCH_DURATION,
} from '@/utils/timeEntryCalculations';

interface TimeEntry {
  id: string;
  payee_id: string;
  project_id: string;
  expense_date: string;
  amount: number;
  description: string;
  user_id?: string;
  start_time?: string;
  end_time?: string;
  attachment_url?: string;
  approval_status?: string;
  is_locked?: boolean;
  rejection_reason?: string;
  lunch_taken?: boolean;
  lunch_duration_minutes?: number | null;
}

interface EditTimeEntryDialogProps {
  entry: TimeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const EditTimeEntryDialog = ({
  entry,
  open,
  onOpenChange,
  onSaved,
}: EditTimeEntryDialogProps) => {
  const { isAdmin, isManager } = useRoles();
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [projectNumber, setProjectNumber] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!entry?.project_id) {
      setProjectNumber(null);
      return;
    }
    supabase
      .from('projects')
      .select('project_number')
      .eq('id', entry.project_id)
      .single()
      .then(({ data }) => setProjectNumber(data?.project_number ?? null));
  }, [entry?.project_id]);

  const isOwner = entry?.user_id === currentUserId;
  const canEdit =
    !entry?.is_locked &&
    ((isAdmin || isManager) ||
      (isOwner && entry?.approval_status !== 'approved'));
  const canDelete =
    !entry?.is_locked &&
    ((isAdmin || isManager) ||
      (isOwner && entry?.approval_status !== 'approved'));

  const initialValues = useMemo(() => {
    if (!entry) return undefined;

    let startTime = '08:00';
    let endTime = '17:00';
    let hours = 8;

    if (entry.start_time && entry.end_time) {
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      startTime = format(start, 'HH:mm');
      endTime = format(end, 'HH:mm');
      const taken = entry.lunch_taken || false;
      const duration =
        entry.lunch_duration_minutes ?? DEFAULT_LUNCH_DURATION;
      const { netHours } = calculateTimeEntryHours(start, end, taken, duration);
      hours = netHours;
    }

    return {
      workerId: entry.payee_id || '',
      projectId: entry.project_id || '',
      projectNumber: projectNumber ?? undefined,
      date: entry.expense_date,
      startTime,
      endTime,
      hours,
      lunchTaken: entry.lunch_taken || false,
      lunchDurationMinutes:
        entry.lunch_duration_minutes ?? DEFAULT_LUNCH_DURATION,
      receiptUrl: entry.attachment_url,
    };
  }, [entry, projectNumber]);

  const handleSave = async (formData: TimeEntryFormData) => {
    if (!entry || !canEdit) return;

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
      }

      if (
        !formData.isPTO &&
        formData.startTime &&
        formData.endTime &&
        formData.hours <= 0
      ) {
        toast.error('Lunch duration cannot exceed shift duration');
        setLoading(false);
        return;
      }

      const { data: workerData } = await supabase
        .from('payees')
        .select('hourly_rate')
        .eq('id', formData.workerId)
        .single();

      const rate = workerData?.hourly_rate || 75;
      const amount = calculateTimeEntryAmount(formData.hours, rate);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('expenses')
        .update({
          payee_id: formData.workerId,
          project_id: formData.projectId,
          expense_date: formData.date,
          amount,
          description: '',
          updated_by: user?.id,
          start_time: formData.startTime
            ? formData.startTime.toISOString()
            : null,
          end_time: formData.endTime
            ? formData.endTime.toISOString()
            : null,
          attachment_url: entry.attachment_url,
          lunch_taken: formData.lunchTaken,
          lunch_duration_minutes: formData.lunchTaken
            ? formData.lunchDurationMinutes
            : null,
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast.success('Time entry updated');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating time entry:', error);
      toast.error('Failed to update time entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!entry || !canDelete) return;

    if (!confirm('Are you sure you want to delete this time entry?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', entry.id);

      if (error) throw error;

      toast.success('Time entry deleted');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting time entry:', error);
      toast.error('Failed to delete time entry');
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
      showReceipt={true}
      showRates={false}
      restrictToCurrentUser={false}
    />
  );
};
