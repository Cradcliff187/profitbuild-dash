import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, Trash2, Save, Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useRoles } from '@/contexts/RoleContext';

interface TimeEntry {
  id: string;
  payee_id?: string | null;
  project_id?: string | null;
  expense_date: string;
  amount: number;
  description: string;
  approval_status?: string | null;
  is_locked?: boolean;
  attachment_url?: string;
  user_id?: string;
  start_time?: string | null;
  end_time?: string | null;
  teamMember?: {
    id: string;
    payee_name: string;
  };
  project?: {
    id: string;
    project_name: string;
    project_number: string;
  };
}

interface EditTimeEntryModalProps {
  entry: TimeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const EditTimeEntryModal = ({ entry, open, onOpenChange, onSaved }: EditTimeEntryModalProps) => {
  const isMobile = useIsMobile();
  const { isAdmin, isManager } = useRoles();
  const [workers, setWorkers] = useState<Array<{ id: string; name: string; rate: number }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; number: string; address?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

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
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    getCurrentUser();
  }, []);

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
    // Set IDs with proper null coalescing
    setWorkerId(entry.payee_id || entry.teamMember?.id || '');
    setProjectId(entry.project_id || entry.project?.id || '');
    setDate(entry.expense_date);
    setReceiptUrl(entry.attachment_url);

    // Parse hours from description as fallback
    const hoursMatch = entry.description.match(/(\d+\.?\d*)\s*h(?:ou)?rs?/i);
    if (hoursMatch) {
      setHours(hoursMatch[1]);
    }

    // FIXED: Properly check for non-null database timestamps
    if (entry.start_time !== null && entry.start_time !== undefined && 
        entry.end_time !== null && entry.end_time !== undefined) {
      try {
        const startDate = new Date(entry.start_time);
        const endDate = new Date(entry.end_time);
        
        // Validate the dates are actually valid
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          setStartTime(format(startDate, 'HH:mm'));
          setEndTime(format(endDate, 'HH:mm'));
        } else {
          console.warn('Invalid date timestamps in entry:', entry.start_time, entry.end_time);
          // Fall through to description parsing
          parseTimesFromDescription(entry.description);
        }
      } catch (error) {
        console.error('Error parsing timestamps:', error);
        // Fall through to description parsing
        parseTimesFromDescription(entry.description);
      }
    } else {
      // Fallback: Parse from description (old entries or entries without timestamps)
      parseTimesFromDescription(entry.description);
    }

    // Extract note (everything after "hours" and optional time info)
    const noteMatch = entry.description.match(/hours?\s*(?:\([^)]+\))?\s*(?:-\s*)?(.+)$/i);
    if (noteMatch && noteMatch[1]) {
      setNote(noteMatch[1].trim());
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

  const parseTimesFromDescription = (description: string) => {
    if (!description) return;
    
    // Try multiple common time formats
    const patterns = [
      /(\d{1,2}:\d{2}\s*[AP]M)\s*[-–—]\s*(\d{1,2}:\d{2}\s*[AP]M)/i,  // 12-hour with AM/PM
      /(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/,                     // 24-hour format
      /Start:\s*(\d{1,2}:\d{2}\s*[AP]M).*?End:\s*(\d{1,2}:\d{2}\s*[AP]M)/i,  // "Start: XX End: XX"
      /from\s+(\d{1,2}:\d{2}\s*[AP]M)\s+to\s+(\d{1,2}:\d{2}\s*[AP]M)/i,      // "from XX to XX"
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        const startStr = match[1];
        const endStr = match[2];
        
        // Convert to 24-hour if needed
        const start = startStr.match(/[AP]M/i) ? convertTo24Hour(startStr) : startStr;
        const end = endStr.match(/[AP]M/i) ? convertTo24Hour(endStr) : endStr;
        
        setStartTime(start);
        setEndTime(end);
        return;
      }
    }
    
    console.log('No time pattern matched in description:', description);
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
    
    // Check ownership FIRST (unless admin/manager)
    const { data: { user } } = await supabase.auth.getUser();
    if (entry.user_id && entry.user_id !== user?.id && !isAdmin && !isManager) {
      toast.error("You can only edit your own time entries");
      return;
    }
    
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

      // Build timestamps from date + time inputs
      let startDateTime: Date | null = null;
      let endDateTime: Date | null = null;
      
      if (startTime && endTime) {
        startDateTime = new Date(`${date}T${startTime}`);
        endDateTime = new Date(`${date}T${endTime}`);
      }

      // Build description without times (times now in database columns)
      let description = `${hoursNum} hours`;
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
          start_time: startDateTime?.toISOString() || null,
          end_time: endDateTime?.toISOString() || null,
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

    // Check if user owns this entry (unless admin/manager)
    const { data: { user } } = await supabase.auth.getUser();
    if (entry.user_id && entry.user_id !== user?.id && !isAdmin && !isManager) {
      toast.error("You can only delete your own entries");
      return;
    }

    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', entry.id)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("You don't have permission to delete this entry");
        return;
      }

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

  const ModalContent = () => (
    <>
      {/* Approval Status Warnings */}
      {entry?.approval_status === 'approved' && (
        <Alert className="border-green-200 bg-green-50 mb-4">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 text-sm">Entry Approved</AlertTitle>
          <AlertDescription className="text-green-700 text-xs">
            This time entry has been approved. Only admins can make changes.
          </AlertDescription>
        </Alert>
      )}

      {entry?.approval_status === 'rejected' && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="text-sm">Entry Rejected</AlertTitle>
          <AlertDescription className="text-xs">
            {entry.description?.includes('Rejection:') 
              ? entry.description.split('Rejection:')[1]?.trim() 
              : 'No reason provided'}
          </AlertDescription>
        </Alert>
      )}

      {entry?.approval_status === 'pending' && (
        <Alert className="border-blue-200 bg-blue-50 mb-4">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 text-sm">Pending Approval</AlertTitle>
          <AlertDescription className="text-blue-700 text-xs">
            You can still edit this entry until a manager approves it.
          </AlertDescription>
        </Alert>
      )}

      <div className={cn("space-y-3", isMobile && "space-y-6")}>
        {/* Disable all editing if not owner (for field workers) */}
        {entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm">View Only</AlertTitle>
            <AlertDescription className="text-xs">
              You can only edit your own time entries.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Team Member - Native select on mobile */}
        <div>
          <Label htmlFor="worker" className="text-sm font-medium">Team Member</Label>
          {isMobile ? (
            <select
              id="worker"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              disabled={entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager || entry?.approval_status === 'approved'}
              className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select team member</option>
              {workers.map(worker => (
                <option key={worker.id} value={worker.id}>{worker.name}</option>
              ))}
            </select>
          ) : (
            <Select value={workerId} onValueChange={setWorkerId} disabled={entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager || entry?.approval_status === 'approved'}>
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
          )}
        </div>

        {/* Project - Native select on mobile */}
        <div>
          <Label htmlFor="project" className="text-sm font-medium">Project</Label>
          {isMobile ? (
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager || entry?.approval_status === 'approved'}
              className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.number} - {project.name}
                </option>
              ))}
            </select>
          ) : (
            <Select value={projectId} onValueChange={setProjectId} disabled={entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager || entry?.approval_status === 'approved'}>
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
          )}
        </div>

        {/* Date */}
        <div>
          <Label htmlFor="date" className="text-sm font-medium">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager || entry?.approval_status === 'approved'}
            className={cn(isMobile && "h-12 text-base")}
          />
        </div>

        {/* Times - Stack on mobile */}
        <div className={cn(
          "grid gap-2",
          isMobile ? "grid-cols-1" : "grid-cols-2"
        )}>
          <div>
            <Label htmlFor="startTime" className="text-sm font-medium">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager || entry?.approval_status === 'approved'}
              className={cn(isMobile && "h-12 text-base")}
            />
          </div>
          <div>
            <Label htmlFor="endTime" className="text-sm font-medium">End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager || entry?.approval_status === 'approved'}
              className={cn(isMobile && "h-12 text-base")}
            />
          </div>
        </div>

        {/* Hours */}
        <div>
          <Label htmlFor="hours" className="text-sm font-medium">Hours</Label>
          <Input
            id="hours"
            type="number"
            step="0.25"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="8.0"
            disabled={entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager || entry?.approval_status === 'approved'}
            className={cn(isMobile && "h-12 text-base")}
          />
        </div>

        {/* Note */}
        <div>
          <Label htmlFor="note" className="text-sm font-medium">Note</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional notes..."
            rows={2}
            disabled={entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager || entry?.approval_status === 'approved'}
            className={cn(isMobile && "text-base")}
          />
        </div>

        {/* Receipt */}
        <div>
          <Label className="text-sm font-medium">Receipt</Label>
          {receiptUrl ? (
            <div className="space-y-2">
              <div className="border rounded-lg overflow-hidden">
                <img 
                  src={receiptUrl} 
                  alt="Receipt" 
                  className={cn(
                    "w-full object-contain bg-slate-50 cursor-pointer",
                    isMobile ? "h-60" : "h-48"
                  )}
                  onClick={() => window.open(receiptUrl, '_blank')}
                />
              </div>
              <div className={cn(
                "flex gap-2",
                isMobile && "flex-col"
              )}>
                <Button 
                  type="button"
                  variant="outline" 
                  size={isMobile ? "default" : "sm"}
                  onClick={captureReceipt}
                  disabled={uploadingReceipt || loading || (entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager) || entry?.approval_status === 'approved'}
                  className={cn("flex-1", isMobile && "h-12 text-base")}
                >
                  <Camera className="w-4 h-4 mr-1" />
                  Replace Receipt
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  size={isMobile ? "default" : "sm"}
                  onClick={removeReceipt}
                  disabled={loading || (entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager) || entry?.approval_status === 'approved'}
                  className={cn("flex-1", isMobile && "h-12 text-base")}
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
              disabled={uploadingReceipt || loading || (entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager) || entry?.approval_status === 'approved'}
              className={cn("w-full", isMobile && "h-12 text-base")}
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
    </>
  );

  const ActionButtons = () => {
    // Admins and managers can edit any entry
    const isNotOwner = entry?.user_id && entry.user_id !== currentUserId && !isAdmin && !isManager;
    
    return (
      <div className={cn(
        "flex gap-2",
        isMobile ? "flex-col" : "flex-row"
      )}>
        <Button 
          variant="outline" 
          onClick={() => onOpenChange(false)} 
          disabled={loading}
          className={cn(isMobile && "h-12 text-base order-last")}
        >
          Cancel
        </Button>
        <Button 
          variant="destructive" 
          onClick={handleDelete} 
          disabled={loading || entry?.is_locked || entry?.approval_status === 'approved' || isNotOwner}
          className={cn(isMobile && "h-12 text-base")}
          title={isNotOwner ? "You can only delete your own entries" : undefined}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={loading || entry?.is_locked || entry?.approval_status === 'approved' || isNotOwner}
          className={cn(isMobile && "h-12 text-base")}
          title={isNotOwner ? "You can only edit your own entries" : undefined}
        >
          <Save className="w-4 h-4 mr-1" />
          Save
        </Button>
      </div>
    );
  };

  return isMobile ? (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5" />
            Edit Time Entry
          </SheetTitle>
        </SheetHeader>
        <ModalContent />
        <SheetFooter className="mt-6">
          <ActionButtons />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Edit Time Entry
          </DialogTitle>
        </DialogHeader>
        <ModalContent />
        <DialogFooter className="flex gap-2">
          <ActionButtons />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
