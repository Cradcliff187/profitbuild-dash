import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { AdminTimeEntryForm } from './AdminTimeEntryForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { checkTimeOverlap, validateTimeEntryHours } from '@/utils/timeEntryValidation';
import { calculateTimeEntryHours, calculateTimeEntryAmount, DEFAULT_LUNCH_DURATION } from '@/utils/timeEntryCalculations';
import { TimeEntryListItem } from '@/types/timeEntry';

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
  const isMobile = useIsMobile();
  const [workerId, setWorkerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [hours, setHours] = useState('8');
  const [loading, setLoading] = useState(false);
  const [lunchTaken, setLunchTaken] = useState(false);
  const [lunchDuration, setLunchDuration] = useState(DEFAULT_LUNCH_DURATION);

  useEffect(() => {
    if (open && entry) {
      populateForm();
    }
  }, [open, entry]);

  const populateForm = () => {
    if (!entry) return;

    setWorkerId(entry.payee_id || '');
    setProjectId(entry.project_id || '');
    setDate(entry.expense_date || format(new Date(), 'yyyy-MM-dd'));

    if (entry.start_time && entry.end_time) {
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      setStartTime(format(start, 'HH:mm'));
      setEndTime(format(end, 'HH:mm'));
    } else {
      setStartTime('08:00');
      setEndTime('17:00');
    }

    setHours(entry.hours?.toFixed(2) || '8');
    setLunchTaken(entry.lunch_taken || false);
    setLunchDuration(entry.lunch_duration_minutes || DEFAULT_LUNCH_DURATION);
  };

  const handleSave = async () => {
    if (!entry) return;

    if (!workerId || !projectId || !date || !hours) {
      toast.error('Please fill in all required fields');
      return;
    }

    const hoursNum = parseFloat(hours);
    if (hoursNum < 0.25 || hoursNum > 24) {
      toast.error('Hours must be between 0.25 and 24');
      return;
    }

    setLoading(true);
    try {
      if (startTime && endTime) {
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);

        // Validate reasonable hours
        const hoursValidation = validateTimeEntryHours(startDateTime, endDateTime);
        if (!hoursValidation.valid) {
          toast.error(hoursValidation.message);
          setLoading(false);
          return;
        }

        // Check for overlaps (exclude current entry)
        const overlapCheck = await checkTimeOverlap(
          workerId,
          date,
          startDateTime,
          endDateTime,
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

        // Calculate hours with lunch adjustment
        const { netHours } = calculateTimeEntryHours(
          startDateTime,
          endDateTime,
          lunchTaken,
          lunchDuration
        );

        if (netHours <= 0) {
          toast.error('Lunch duration cannot exceed shift duration');
          setLoading(false);
          return;
        }

        const { data: workerData } = await supabase
          .from('payees')
          .select('hourly_rate')
          .eq('id', workerId)
          .single();

        const rate = workerData?.hourly_rate || 75;
        const amount = calculateTimeEntryAmount(netHours, rate);

        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
          .from('expenses')
          .update({
            payee_id: workerId,
            project_id: projectId,
            expense_date: date,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            amount: amount,
            description: `${format(startDateTime, 'h:mm a')} - ${format(endDateTime, 'h:mm a')}`,
            lunch_taken: lunchTaken,
            lunch_duration_minutes: lunchTaken ? lunchDuration : null,
            updated_by: user?.id,
          })
          .eq('id', entry.id);

        if (error) throw error;

        toast.success('Time entry updated successfully');
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error('Start time and end time are required');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error updating time entry:', error);
      toast.error(error.message || 'Failed to update time entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;

    if (!confirm('Are you sure you want to delete this time entry?')) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', entry.id);

      if (error) throw error;

      toast.success('Time entry deleted');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting time entry:', error);
      toast.error(error.message || 'Failed to delete time entry');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!entry) return null;

    const status = entry.approval_status;
    if (!status || status === 'pending') {
      return (
        <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertTitle className="text-yellow-900 dark:text-yellow-100">Pending Approval</AlertTitle>
        </Alert>
      );
    }
    if (status === 'approved') {
      return (
        <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
          <AlertTitle className="text-green-900 dark:text-green-100">Approved</AlertTitle>
        </Alert>
      );
    }
    if (status === 'rejected') {
      return (
        <Alert className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
          <AlertTitle className="text-red-900 dark:text-red-100">Rejected</AlertTitle>
          {entry.rejection_reason && (
            <AlertDescription className="text-red-800 dark:text-red-200">
              {entry.rejection_reason}
            </AlertDescription>
          )}
        </Alert>
      );
    }
    return null;
  };

  const canEdit = !entry?.is_locked;
  const canDelete = !entry?.is_locked;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          "flex flex-col p-0",
          isMobile
            ? "w-[92%] max-h-[92vh] rounded-t-2xl left-1/2 -translate-x-1/2 right-auto"
            : "w-full sm:max-w-[600px]"
        )}
        side={isMobile ? "bottom" : "right"}
      >
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>Edit Time Entry</SheetTitle>
          <SheetDescription>Update time entry details</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 overscroll-contain touch-pan-y space-y-4">
          {getStatusBadge()}
          
          {entry?.is_locked && (
            <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-500" />
              <AlertTitle className="text-orange-900 dark:text-orange-100">Entry is Locked</AlertTitle>
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                This entry cannot be edited or deleted as it has been locked.
              </AlertDescription>
            </Alert>
          )}

          <AdminTimeEntryForm
            workerId={workerId}
            setWorkerId={setWorkerId}
            projectId={projectId}
            setProjectId={setProjectId}
            date={date}
            setDate={setDate}
            startTime={startTime}
            setStartTime={setStartTime}
            endTime={endTime}
            setEndTime={setEndTime}
            hours={hours}
            setHours={setHours}
            lunchTaken={lunchTaken}
            setLunchTaken={setLunchTaken}
            lunchDuration={lunchDuration}
            setLunchDuration={setLunchDuration}
            disabled={loading || !canEdit}
          />
        </div>
        <SheetFooter className="px-6 pb-6 pt-4 border-t shrink-0 gap-2">
          {canDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !canEdit}
            className="flex-1"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
