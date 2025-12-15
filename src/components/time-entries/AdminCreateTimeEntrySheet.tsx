import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { AdminTimeEntryForm } from './AdminTimeEntryForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { checkTimeOverlap, validateTimeEntryHours } from '@/utils/timeEntryValidation';
import { calculateTimeEntryHours, calculateTimeEntryAmount, DEFAULT_LUNCH_DURATION } from '@/utils/timeEntryCalculations';

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
  const isMobile = useIsMobile();
  const [workerId, setWorkerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [hours, setHours] = useState('8');
  const [loading, setLoading] = useState(false);
  const [lunchTaken, setLunchTaken] = useState(false);
  const [lunchDuration, setLunchDuration] = useState(DEFAULT_LUNCH_DURATION);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setWorkerId('');
    setProjectId('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setStartTime('08:00');
    setEndTime('17:00');
    setHours('8');
    setLunchTaken(false);
    setLunchDuration(DEFAULT_LUNCH_DURATION);
  };

  const handleSave = async () => {
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
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      // Validate reasonable hours
      const hoursValidation = validateTimeEntryHours(startDateTime, endDateTime);
      if (!hoursValidation.valid) {
        toast.error(hoursValidation.message);
        setLoading(false);
        return;
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

      // Check for overlaps (with warning, not blocking for admin)
      const overlapCheck = await checkTimeOverlap(
        workerId,
        date,
        startDateTime,
        endDateTime
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

      const { data: workerData } = await supabase
        .from('payees')
        .select('hourly_rate')
        .eq('id', workerId)
        .single();

      const rate = workerData?.hourly_rate || 75;
      const amount = calculateTimeEntryAmount(netHours, rate);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('expenses').insert({
        payee_id: workerId,
        project_id: projectId,
        expense_date: date,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        amount: amount,
        description: `${format(startDateTime, 'h:mm a')} - ${format(endDateTime, 'h:mm a')}`,
        category: 'labor_internal',
        transaction_type: 'expense',
        user_id: user?.id,
        updated_by: user?.id,
        lunch_taken: lunchTaken,
        lunch_duration_minutes: lunchTaken ? lunchDuration : null,
      });

      if (error) throw error;

      toast.success('Time entry created successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating time entry:', error);
      toast.error(error.message || 'Failed to create time entry');
    } finally {
      setLoading(false);
    }
  };

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
          <SheetTitle>Create Time Entry</SheetTitle>
          <SheetDescription>Add a new time entry for internal labor</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 overscroll-contain touch-pan-y">
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
            disabled={loading}
          />
        </div>
        <SheetFooter className="px-6 pb-6 pt-4 border-t shrink-0 gap-2">
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
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Creating...' : 'Create Entry'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
