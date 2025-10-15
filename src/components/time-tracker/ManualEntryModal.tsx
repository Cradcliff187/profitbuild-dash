import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, Plus, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ManualEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const ManualEntryModal = ({ open, onOpenChange, onSaved }: ManualEntryModalProps) => {
  const [workers, setWorkers] = useState<Array<{ id: string; name: string; rate: number }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; number: string }>>([]);
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
        .select('id, project_name, project_number')
        .in('status', ['estimating', 'approved', 'in_progress'])
        .order('project_number', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData.map(p => ({ id: p.id, name: p.project_name, number: p.project_number })));
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
        .insert({
          payee_id: workerId,
          project_id: projectId,
          expense_date: date,
          amount,
          description,
          category: 'labor_internal',
          transaction_type: 'expense',
          approval_status: 'draft',
          updated_by: user?.id,
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

  const selectedWorker = workers.find(w => w.id === workerId);
  const calculatedAmount = selectedWorker && hours ? (parseFloat(hours) * selectedWorker.rate).toFixed(2) : '0.00';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Time Entry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Quick Templates */}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyTemplate('full')}
              className="flex-1"
            >
              Full Day (8h)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyTemplate('half')}
              className="flex-1"
            >
              Half Day (4h)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyTemplate('overtime')}
              className="flex-1"
            >
              OT (10h)
            </Button>
          </div>

          <div>
            <Label htmlFor="worker">Worker *</Label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger id="worker">
                <SelectValue placeholder="Select worker" />
              </SelectTrigger>
              <SelectContent>
                {workers.map(worker => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name} (${worker.rate}/hr)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="project">Project *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.number} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Date *</Label>
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
            <Label htmlFor="hours">Hours *</Label>
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

          <div className="p-2 bg-muted rounded text-sm">
            <div className="flex justify-between">
              <span>Hours:</span>
              <span className="font-medium">{hours || '0'}</span>
            </div>
            <div className="flex justify-between">
              <span>Rate:</span>
              <span className="font-medium">${selectedWorker?.rate || 0}/hr</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Amount:</span>
              <span>${calculatedAmount}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <FileText className="w-4 h-4 mr-1" />
            Create Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
