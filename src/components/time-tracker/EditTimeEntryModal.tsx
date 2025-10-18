import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRoles } from '@/contexts/RoleContext';
import { cn } from '@/lib/utils';

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

interface EditTimeEntryModalProps {
  entry: TimeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface Worker {
  id: string;
  name: string;
  rate: number;
}

interface Project {
  id: string;
  name: string;
  number: string;
}

export const EditTimeEntryModal = ({ entry, open, onOpenChange, onSaved }: EditTimeEntryModalProps) => {
  const isMobile = useIsMobile();
  const { isAdmin, isManager } = useRoles();
  
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workerId, setWorkerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [hours, setHours] = useState('8');
  const [note, setNote] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const isOwner = entry?.user_id === currentUserId;
  const canEdit = !entry?.is_locked && entry?.approval_status !== 'approved' && (isOwner || isAdmin || isManager);
  const canDelete = !entry?.is_locked && entry?.approval_status !== 'approved' && (isOwner || isAdmin || isManager);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (open && entry) {
      populateForm();
    }
  }, [open, entry, workers]);

  useEffect(() => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      if (end > start) {
        const calculatedHours = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2);
        setHours(calculatedHours);
      }
    }
  }, [startTime, endTime]);

  const loadData = async () => {
    const [workersRes, projectsRes] = await Promise.all([
      supabase
        .from('payees')
        .select('id, payee_name, hourly_rate')
        .eq('is_internal', true)
        .eq('provides_labor', true)
        .eq('is_active', true)
        .order('payee_name'),
      supabase
        .from('projects')
        .select('id, project_name, project_number')
        .in('status', ['approved', 'in_progress'])
        .neq('project_number', '000-UNASSIGNED')
        .neq('project_number', 'SYS-000')
        .order('project_number', { ascending: false })
    ]);
    
    if (workersRes.data) {
      setWorkers(workersRes.data.map(w => ({ 
        id: w.id, 
        name: w.payee_name, 
        rate: w.hourly_rate || 75 
      })));
    }
    
    if (projectsRes.data) {
      setProjects(projectsRes.data.map(p => ({ 
        id: p.id, 
        name: p.project_name, 
        number: p.project_number 
      })));
    }
  };

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
    
    const hoursMatch = entry.description.match(/(\d+\.?\d*)\s*h(?:ou)?rs?/i);
    setHours(hoursMatch ? hoursMatch[1] : '8');
    
    const noteMatch = entry.description.match(/hours?\s*-\s*(.+)$/i);
    setNote(noteMatch ? noteMatch[1].trim() : '');
  };

  const handleSave = async () => {
    if (!entry || !canEdit) return;

    if (!workerId || !projectId || !date || !hours) {
      toast.error('Please fill in all required fields');
      return;
    }

    const hoursNum = parseFloat(hours);
    if (hoursNum <= 0 || hoursNum > 24) {
      toast.error('Hours must be between 0 and 24');
      return;
    }

    setLoading(true);
    try {
      const worker = workers.find(w => w.id === workerId);
      const amount = hoursNum * (worker?.rate || 75);
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);
      const description = `${hoursNum} hours${note ? ` - ${note}` : ''}`;
      
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
      const dataUrl = await new Promise<string | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        
        input.oncancel = () => resolve(null);
        input.click();
      });

      if (!dataUrl) return;

      const base64Data = dataUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const fileName = `receipt_${entry?.id}_${Date.now()}.jpg`;
      const { data: { user } } = await supabase.auth.getUser();
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('receipts')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      setReceiptUrl(publicUrl);
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

  const FormContent = () => (
    <div className="space-y-4">
      {entry?.approval_status === 'approved' && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-200">Entry Approved</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            This time entry has been approved. Only admins can make changes.
          </AlertDescription>
        </Alert>
      )}
      
      {entry?.approval_status === 'rejected' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Entry Rejected</AlertTitle>
          <AlertDescription>
            {entry.rejection_reason || 'This entry was rejected. You can edit and resubmit.'}
          </AlertDescription>
        </Alert>
      )}

      {entry?.approval_status === 'pending' && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">Pending Approval</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            You can still edit this entry until it's approved.
          </AlertDescription>
        </Alert>
      )}

      {entry?.is_locked && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Entry Locked</AlertTitle>
          <AlertDescription>
            This entry is locked and cannot be edited.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="worker">Team Member *</Label>
        <NativeSelect
          id="worker"
          value={workerId || ""}
          onValueChange={setWorkerId}
          disabled={!canEdit}
          className={cn(isMobile && "h-12 text-base")}
        >
          <option value="" disabled>Select team member</option>
          {workers.map(w => (
            <option key={w.id} value={w.id}>
              {w.name} - ${w.rate}/hr
            </option>
          ))}
        </NativeSelect>
      </div>

      <div>
        <Label htmlFor="project">Project *</Label>
        <NativeSelect
          id="project"
          value={projectId || ""}
          onValueChange={setProjectId}
          disabled={!canEdit}
          className={cn(isMobile && "h-12 text-base")}
        >
          <option value="" disabled>Select project</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.number} - {p.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div>
        <Label htmlFor="date">Date *</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={!canEdit}
          className={cn(isMobile && "h-12")}
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={!canEdit}
            className={cn(isMobile && "h-12")}
            style={{ fontSize: isMobile ? '16px' : undefined }}
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={!canEdit}
            className={cn(isMobile && "h-12")}
            style={{ fontSize: isMobile ? '16px' : undefined }}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="hours">Hours *</Label>
        <Input
          id="hours"
          type="number"
          step="0.25"
          min="0"
          max="24"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          disabled={!canEdit}
          className={cn(isMobile && "h-12")}
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
      </div>

      <div>
        <Label htmlFor="note">Note</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          disabled={!canEdit}
          placeholder="Optional notes about this time entry"
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
      </div>

      {canEdit && (
        <div>
          <Label>Receipt</Label>
          {receiptUrl ? (
            <div className="flex items-center gap-2 mt-1">
              <img src={receiptUrl} alt="Receipt" className="h-20 w-20 object-cover rounded border" />
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={removeReceipt}
              >
                Remove
              </Button>
            </div>
          ) : (
            <Button 
              type="button"
              variant="outline" 
              onClick={captureReceipt}
              className="mt-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Capture Receipt
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {canDelete && (
          <Button 
            type="button"
            variant="destructive" 
            onClick={handleDelete}
            disabled={loading}
          >
            Delete
          </Button>
        )}
        <Button 
          type="button"
          variant="outline" 
          onClick={() => onOpenChange(false)} 
          className="flex-1"
        >
          {canEdit ? 'Cancel' : 'Close'}
        </Button>
        {canEdit && (
          <Button 
            type="button"
            onClick={handleSave} 
            disabled={loading} 
            className="flex-1"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>
    </div>
  );

  return isMobile ? (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="min-h-[80vh] max-h-[90vh] overflow-y-auto p-6"
      >
        <SheetHeader className="mb-4">
          <SheetTitle>Edit Time Entry</SheetTitle>
        </SheetHeader>
        <FormContent />
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
};
