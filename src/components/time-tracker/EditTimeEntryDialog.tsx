import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { TimeEntryDialog } from './TimeEntryDialog';
import { TimeEntryForm } from './TimeEntryForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRoles } from '@/contexts/RoleContext';
import { checkTimeOverlap, validateTimeEntryHours } from '@/utils/timeEntryValidation';

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
}

interface EditTimeEntryDialogProps {
  entry: TimeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const EditTimeEntryDialog = ({ entry, open, onOpenChange, onSaved }: EditTimeEntryDialogProps) => {
  const isMobile = useIsMobile();
  const { isAdmin, isManager } = useRoles();
  const [workerId, setWorkerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [hours, setHours] = useState('8');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const isOwner = entry?.user_id === currentUserId;
  const canEdit = !entry?.is_locked && (
    (isAdmin || isManager) || 
    (isOwner && entry?.approval_status !== 'approved')
  );
  const canDelete = !entry?.is_locked && (
    (isAdmin || isManager) || 
    (isOwner && entry?.approval_status !== 'approved')
  );

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (open && entry) {
      populateForm();
    }
  }, [open, entry]);

  const populateForm = () => {
    if (!entry) return;

    setWorkerId(entry.payee_id || '');
    setProjectId(entry.project_id || '');
    setDate(entry.expense_date);
    setReceiptUrl(entry.attachment_url);
    
    if (entry.start_time && entry.end_time) {
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      setStartTime(format(start, 'HH:mm'));
      setEndTime(format(end, 'HH:mm'));
    } else {
      setStartTime('08:00');
      setEndTime('17:00');
    }
    
    // Hours are calculated from start_time/end_time or amount/hourly_rate
    setHours('8'); // Default fallback
  };

  const handleSave = async () => {
    if (!entry || !canEdit) return;

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
      }

      const { data: workerData } = await supabase
        .from('payees')
        .select('hourly_rate')
        .eq('id', workerId)
        .single();

      const rate = workerData?.hourly_rate || 75;
      const amount = hoursNum * rate;
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);
      const description = '';
      
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('expenses').update({
        payee_id: workerId,
        project_id: projectId,
        expense_date: date,
        amount,
        description,
        updated_by: user?.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        attachment_url: receiptUrl,
      }).eq('id', entry.id);

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
      const { error } = await supabase.from('expenses').delete().eq('id', entry.id);
      
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

  const captureReceipt = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      
      const file = await new Promise<File | null>((resolve) => {
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          resolve(file || null);
        };
        input.oncancel = () => resolve(null);
        input.click();
      });

      if (!file) return;

      // Resize and compress image
      const img = new Image();
      const imgUrl = URL.createObjectURL(file);
      
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = imgUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      const maxSize = 1600;
      let width = img.width;
      let height = img.height;
      
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      URL.revokeObjectURL(imgUrl);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
      });

      const fileName = `receipt_${entry?.id}_${Date.now()}.jpg`;
      const { data: { user } } = await supabase.auth.getUser();
      const filePath = `${user?.id}/receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('time-tracker-documents')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      // For private bucket, store the path instead of public URL
      setReceiptUrl(filePath);
      toast.success('Receipt captured');
    } catch (error) {
      console.error('Error capturing receipt:', error);
      toast.error('Failed to capture receipt');
    }
  };

  const removeReceipt = async () => {
    if (!entry || !receiptUrl) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .update({ attachment_url: null })
        .eq('id', entry.id);

      if (error) throw error;

      setReceiptUrl(undefined);
      toast.success('Receipt removed');
    } catch (error) {
      console.error('Error removing receipt:', error);
      toast.error('Failed to remove receipt');
    }
  };

  return (
    <TimeEntryDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Time Entry"
      description="Update time entry details"
    >
      <div className="space-y-2">
        {entry?.approval_status === 'approved' && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-2">
            <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-200">Entry Approved</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              This time entry has been approved. Only admins can make changes.
            </AlertDescription>
          </Alert>
        )}
        
        {entry?.approval_status === 'rejected' && (
          <Alert variant="destructive" className="p-2">
            <XCircle className="h-3.5 w-3.5" />
            <AlertTitle>Entry Rejected</AlertTitle>
            <AlertDescription>
              {entry.rejection_reason || 'This entry was rejected. You can edit and resubmit.'}
            </AlertDescription>
          </Alert>
        )}

        {entry?.approval_status === 'pending' && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-2">
            <AlertCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">Pending Approval</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              You can still edit this entry until it's approved.
            </AlertDescription>
          </Alert>
        )}

        {entry?.is_locked && (
          <Alert className="p-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertTitle>Entry Locked</AlertTitle>
            <AlertDescription>
              This entry is locked and cannot be edited.
            </AlertDescription>
          </Alert>
        )}

        <TimeEntryForm
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
          receiptUrl={receiptUrl}
          onCaptureReceipt={canEdit ? captureReceipt : undefined}
          onRemoveReceipt={canEdit ? removeReceipt : undefined}
          disabled={!canEdit || loading}
          showReceipt={true}
          isMobile={isMobile}
          showRates={false}
        />

        <div className={isMobile ? "flex gap-3 pt-4" : "flex gap-2 pt-2"}>
          {canDelete && (
            <Button 
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className={isMobile ? "h-12 px-4 text-base" : ""}
            >
              Delete
            </Button>
          )}
          <Button 
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)} 
            disabled={loading}
            className={isMobile ? "flex-1 h-12 text-base" : "flex-1"}
          >
            Cancel
          </Button>
          {canEdit && (
            <Button 
              type="button"
              onClick={handleSave} 
              disabled={loading}
              className={isMobile ? "flex-1 h-12 text-base font-medium" : "flex-1"}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </div>
    </TimeEntryDialog>
  );
};
