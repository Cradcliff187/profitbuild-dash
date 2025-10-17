import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, Plus, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ManualEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const ManualEntryModal = ({ open, onOpenChange, onSaved }: ManualEntryModalProps) => {
  const isMobile = useIsMobile();
  const [workers, setWorkers] = useState<Array<{ id: string; name: string; rate: number }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; number: string; address?: string }>>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [workerId, setWorkerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [hours, setHours] = useState('8');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      loadDropdownData();
      resetForm();
    }
  }, [open]);

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

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setStartTime('08:00');
    setEndTime('17:00');
    setHours('8');
    setNote('');
  };

  const applyTemplate = (template: 'full' | 'half' | 'overtime') => {
    switch (template) {
      case 'full':
        setStartTime('08:00');
        setEndTime('17:00');
        setHours('8');
        break;
      case 'half':
        setStartTime('08:00');
        setEndTime('12:00');
        setHours('4');
        break;
      case 'overtime':
        setStartTime('07:00');
        setEndTime('18:00');
        setHours('10');
        break;
    }
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

  const handleSave = async () => {
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
        .insert({
          payee_id: workerId,
          project_id: projectId,
          expense_date: date,
          amount,
          description,
          category: 'labor_internal',
          transaction_type: 'expense',
          user_id: user?.id,
          updated_by: user?.id,
          start_time: startDateTime?.toISOString() || null,
          end_time: endDateTime?.toISOString() || null,
        });

      if (error) throw error;

      toast.success('Time entry created successfully');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating time entry:', error);
      toast.error('Failed to create time entry');
    } finally {
      setLoading(false);
    }
  };

  const ModalContent = () => (
    <div className={cn("space-y-4", isMobile && "space-y-6")}>
      {/* Quick Templates - Stack on mobile */}
      <div className={cn(
        "flex gap-2",
        isMobile && "flex-col"
      )}>
        <Button
          type="button"
          size={isMobile ? "default" : "sm"}
          variant="outline"
          onClick={() => applyTemplate('full')}
          className={cn("flex-1", isMobile && "h-12 text-base")}
        >
          Full Day (8h)
        </Button>
        <Button
          type="button"
          size={isMobile ? "default" : "sm"}
          variant="outline"
          onClick={() => applyTemplate('half')}
          className={cn("flex-1", isMobile && "h-12 text-base")}
        >
          Half Day (4h)
        </Button>
        <Button
          type="button"
          size={isMobile ? "default" : "sm"}
          variant="outline"
          onClick={() => applyTemplate('overtime')}
          className={cn("flex-1", isMobile && "h-12 text-base")}
        >
          OT (10h)
        </Button>
      </div>

      {/* Team Member - Native select on mobile */}
      <div>
        <Label htmlFor="worker" className="text-sm font-medium">Team Member *</Label>
        {isMobile ? (
          <select
            id="worker"
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select team member</option>
            {workers.map(worker => (
              <option key={worker.id} value={worker.id}>{worker.name}</option>
            ))}
          </select>
        ) : (
          <Select value={workerId} onValueChange={setWorkerId}>
            <SelectTrigger id="worker">
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              {workers.map(worker => (
                <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Project - Native select on mobile */}
      <div>
        <Label htmlFor="project" className="text-sm font-medium">Project *</Label>
        {isMobile ? (
          <select
            id="project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select project</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.number} - {project.name}
              </option>
            ))}
          </select>
        ) : (
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
        )}
      </div>

      {/* Date */}
      <div>
        <Label htmlFor="date" className="text-sm font-medium">Date *</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
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
            className={cn(isMobile && "h-12 text-base")}
          />
        </div>
      </div>

      {/* Hours */}
      <div>
        <Label htmlFor="hours" className="text-sm font-medium">Hours *</Label>
        <Input
          id="hours"
          type="number"
          step="0.25"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="8.0"
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
          className={cn(isMobile && "text-base")}
        />
      </div>
    </div>
  );

  const ActionButtons = () => (
    <div className={cn(
      "flex gap-2",
      isMobile && "flex-col"
    )}>
      <Button 
        variant="outline" 
        onClick={() => onOpenChange(false)} 
        disabled={loading}
        className={cn("flex-1", isMobile && "h-12 text-base")}
      >
        Cancel
      </Button>
      <Button 
        onClick={handleSave} 
        disabled={loading}
        className={cn("flex-1", isMobile && "h-12 text-base")}
      >
        <FileText className="w-4 h-4 mr-1" />
        Create Entry
      </Button>
    </div>
  );

  return isMobile ? (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Plus className="w-5 h-5" />
            Add Time Entry
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
            <Plus className="w-4 h-4" />
            Add Time Entry
          </DialogTitle>
        </DialogHeader>
        <ModalContent />
        <DialogFooter>
          <ActionButtons />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
