import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, Trash2, Save, Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TimeEntry {
  id: string;
  payee_id: string;
  project_id: string;
  expense_date: string;
  amount: number;
  description: string;
  approval_status?: string;
  is_locked?: boolean;
  attachment_url?: string;
}

interface EditTimeEntryModalProps {
  entry: TimeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const EditTimeEntryModal = ({ entry, open, onOpenChange, onSaved }: EditTimeEntryModalProps) => {
  const [workers, setWorkers] = useState<Array<{ id: string; name: string; rate: number }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; number: string; address?: string }>>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [workerId, setWorkerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>();
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  useEffect(() => {
    if (open) {
      loadDropdownData();
      if (entry) {
        populateForm(entry);
      }
    }
  }, [open, entry]);

  const loadDropdownData = async () => {
    try {
      // Load workers
      const { data: workersData, error: workersError } = await supabase
        .from('payees')
        .select('id, payee_name, hourly_rate')
        .eq('is_internal', true)
        .eq('provides_labor', true)
        .eq('is_active', true);

      if (workersError) throw workersError;
      setWorkers(workersData.map(w => ({ id: w.id, name: w.payee_name, rate: w.hourly_rate || 75 })));

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, project_name, project_number, address')
        .in('status', ['approved', 'in_progress'])
        .neq('project_number', '000-UNASSIGNED')
        .neq('project_number', 'SYS-000')
        .order('project_number', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData.map(p => ({ 
        id: p.id, 
        name: p.project_name, 
        number: p.project_number,
        address: p.address 
      })));
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  };

  const populateForm = (entry: TimeEntry) => {
    setWorkerId(entry.payee_id);
    setProjectId(entry.project_id);
    setDate(entry.expense_date);
    setReceiptUrl(entry.attachment_url);

    // Parse description to extract hours and times
    const hoursMatch = entry.description.match(/(\d+\.?\d*)\s*hours?/i);
    if (hoursMatch) {
      setHours(hoursMatch[1]);
    }

    const timeMatch = entry.description.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
    if (timeMatch) {
      setStartTime(convertTo24Hour(timeMatch[1]));
      setEndTime(convertTo24Hour(timeMatch[2]));
    }

    const noteMatch = entry.description.match(/(?:hours?)\s*-\s*(.+)$/i);
    if (noteMatch) {
      setNote(noteMatch[1]);
    }
  };

  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(/\s+/);
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = '00';
    }
    
    if (modifier?.toUpperCase() === 'PM') {
      hours = String(parseInt(hours, 10) + 12);
    }
    
    return `${hours.padStart(2, '0')}:${minutes}`;
  };

  const calculateHours = () => {
    if (!startTime || !endTime) return;

    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    if (end <= start) {
      toast.error('End time must be after start time');
      return;
    }

    const diffMs = end.getTime() - start.getTime();
    const calculatedHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
    setHours(calculatedHours);
  };

  useEffect(() => {
    if (startTime && endTime) {
      calculateHours();
    }
  }, [startTime, endTime]);

  const captureReceipt = async () => {
    if (!entry) return;
    
    try {
      setUploadingReceipt(true);
      
      const photo = await CapacitorCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (!photo.dataUrl) return;

      const response = await fetch(photo.dataUrl);
      const blob = await response.blob();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const timestamp = Date.now();
      const filename = `${timestamp}_receipt.jpg`;
      const storagePath = `${user.id}/receipts/${entry.project_id}/${filename}`;

      const { data, error } = await supabase.storage
        .from('time-tracker-documents')
        .upload(storagePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = await supabase.storage
        .from('time-tracker-documents')
        .createSignedUrl(data.path, 31536000);

      setReceiptUrl(urlData?.signedUrl);
      toast.success('Receipt captured');
    } catch (error) {
      console.error('Receipt capture failed:', error);
      toast.error('Failed to capture receipt');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const removeReceipt = async () => {
    if (!confirm('Remove this receipt?')) return;
    
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ attachment_url: null })
        .eq('id', entry!.id);

      if (error) throw error;

      setReceiptUrl(undefined);
      toast.success('Receipt removed');
    } catch (error) {
      console.error('Error removing receipt:', error);
      toast.error('Failed to remove receipt');
    }
  };

  const handleSave = async () => {
    if (!entry) return;
    
    if (entry.is_locked || entry.approval_status === 'approved') {
      toast.error('Cannot edit approved entries. Contact your manager.');
      return;
    }

    if (!workerId || !projectId || !date || !hours) {
      toast.error('Please fill in all required fields');
      return;
    }

    const hoursNum = parseFloat(hours);
    if (hoursNum <= 0 || hoursNum > 24) {
      toast.error('Hours must be between 0 and 24');
      return;
    }

    try {
      setLoading(true);

      const worker = workers.find(w => w.id === workerId);
      const amount = hoursNum * (worker?.rate || 75);

      let description = `${hoursNum} hours`;
      if (startTime && endTime) {
        description += ` (${format(new Date(`2000-01-01T${startTime}`), 'h:mm a')} - ${format(new Date(`2000-01-01T${endTime}`), 'h:mm a')})`;
      }
      if (note) {
        description += ` - ${note}`;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('expenses')
        .update({
          payee_id: workerId,
          project_id: projectId,
          expense_date: date,
          amount,
          description,
          attachment_url: receiptUrl,
          updated_by: user?.id,
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast.success('Time entry updated successfully');
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
    if (!entry) return;
    
    if (entry.is_locked || entry.approval_status === 'approved') {
      toast.error('Cannot delete approved entries. Contact your manager.');
      return;
    }

    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }

    try {
      setLoading(true);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Edit Time Entry
          </DialogTitle>
        </DialogHeader>

        {/* Approval Status Warnings */}
        {entry?.approval_status === 'approved' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Entry Approved</AlertTitle>
            <AlertDescription className="text-green-700 text-xs">
              This time entry has been approved by management. Only admins can make changes.
            </AlertDescription>
          </Alert>
        )}

        {entry?.approval_status === 'rejected' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Entry Rejected</AlertTitle>
            <AlertDescription className="text-xs">
              {entry.description?.includes('Rejection:') 
                ? entry.description.split('Rejection:')[1]?.trim() 
                : 'No reason provided'}
            </AlertDescription>
          </Alert>
        )}

        {entry?.approval_status === 'pending' && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Pending Approval</AlertTitle>
            <AlertDescription className="text-blue-700 text-xs">
              You can still edit this entry until a manager approves it.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="worker">Team Member</Label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger id="worker">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {workers.map(worker => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{project.number}</span>
                        <span className="text-xs text-muted-foreground">{project.name}</span>
                        {project.address && (
                          <span className="text-xs text-muted-foreground">{project.address}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="hours">Hours</Label>
            <Input
              id="hours"
              type="number"
              step="0.25"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="8.0"
            />
          </div>

          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          <div>
            <Label>Receipt</Label>
            {receiptUrl ? (
              <div className="space-y-2">
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={receiptUrl} 
                    alt="Receipt" 
                    className="w-full h-auto max-h-48 object-contain bg-slate-50 cursor-pointer"
                    onClick={() => window.open(receiptUrl, '_blank')}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    onClick={captureReceipt}
                    disabled={uploadingReceipt || loading}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    Replace Receipt
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    onClick={removeReceipt}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                type="button"
                variant="outline" 
                onClick={captureReceipt}
                disabled={uploadingReceipt || loading}
                className="w-full"
              >
                {uploadingReceipt ? (
                  <>Loading...</>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-1" />
                    Add Receipt
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={loading || entry?.is_locked || entry?.approval_status === 'approved'}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || entry?.is_locked || entry?.approval_status === 'approved'}
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
