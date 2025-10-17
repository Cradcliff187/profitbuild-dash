import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ManualEntryModalProps {
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

export const ManualEntryModal = ({ open, onOpenChange, onSaved }: ManualEntryModalProps) => {
  const isMobile = useIsMobile();
  
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workerId, setWorkerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [hours, setHours] = useState('8');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
      resetForm();
    }
  }, [open]);

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

  const resetForm = () => {
    setWorkerId('');
    setProjectId('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setStartTime('08:00');
    setEndTime('17:00');
    setHours('8');
    setNote('');
  };

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

    setLoading(true);
    try {
      const worker = workers.find(w => w.id === workerId);
      const amount = hoursNum * (worker?.rate || 75);
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);
      const description = `${hoursNum} hours${note ? ` - ${note}` : ''}`;
      
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('expenses').insert({
        payee_id: workerId,
        project_id: projectId,
        expense_date: date,
        amount,
        description,
        category: 'labor_internal',
        transaction_type: 'expense',
        user_id: user?.id,
        updated_by: user?.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
      });

      if (error) throw error;
      
      toast.success('Time entry created');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating time entry:', error);
      toast.error('Failed to create time entry');
    } finally {
      setLoading(false);
    }
  };

  const FormContent = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => { 
            setStartTime('08:00'); 
            setEndTime('17:00'); 
            setHours('8'); 
          }}
        >
          Full Day (8h)
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => { 
            setStartTime('08:00'); 
            setEndTime('12:00'); 
            setHours('4'); 
          }}
        >
          Half Day (4h)
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => { 
            setStartTime('07:00'); 
            setEndTime('17:00'); 
            setHours('10'); 
          }}
        >
          Overtime (10h)
        </Button>
      </div>

      <div>
        <Label htmlFor="worker">Team Member *</Label>
        <NativeSelect
          id="worker"
          value={workerId || ""}
          onValueChange={setWorkerId}
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
          placeholder="Optional notes about this time entry"
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button 
          type="button"
          variant="outline" 
          onClick={() => onOpenChange(false)} 
          disabled={loading} 
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          type="button"
          onClick={handleSave} 
          disabled={loading} 
          className="flex-1"
        >
          {loading ? 'Creating...' : 'Create Entry'}
        </Button>
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
          <SheetTitle>Add Time Entry</SheetTitle>
        </SheetHeader>
        <FormContent />
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Time Entry</DialogTitle>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
};
