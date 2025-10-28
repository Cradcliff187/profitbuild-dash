import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Worker {
  id: string;
  name: string;
  rate: number;
  email?: string;
}

interface Project {
  id: string;
  name: string;
  number: string;
}

interface TimeEntryFormProps {
  workerId: string;
  setWorkerId: (id: string) => void;
  projectId: string;
  setProjectId: (id: string) => void;
  date: string;
  setDate: (date: string) => void;
  startTime: string;
  setStartTime: (time: string) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  hours: string;
  setHours: (hours: string) => void;
  receiptUrl?: string;
  onCaptureReceipt?: () => void;
  onRemoveReceipt?: () => void;
  disabled?: boolean;
  showReceipt?: boolean;
  isMobile?: boolean;
  showRates?: boolean;
}

export const TimeEntryForm = ({
  workerId,
  setWorkerId,
  projectId,
  setProjectId,
  date,
  setDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  hours,
  setHours,
  receiptUrl,
  onCaptureReceipt,
  onRemoveReceipt,
  disabled = false,
  showReceipt = false,
  isMobile = false,
  showRates = true,
}: TimeEntryFormProps) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [signedReceiptUrl, setSignedReceiptUrl] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (receiptUrl) {
      loadSignedUrl();
    } else {
      setSignedReceiptUrl('');
    }
  }, [receiptUrl]);

  const loadSignedUrl = async () => {
    if (!receiptUrl) return;
    
    // If it's already a full URL (old data), use it directly
    if (receiptUrl.startsWith('http')) {
      setSignedReceiptUrl(receiptUrl);
      return;
    }

    // Otherwise, generate a signed URL for the private bucket
    try {
      const { data, error } = await supabase.storage
        .from('time-tracker-documents')
        .createSignedUrl(receiptUrl, 3600); // 1 hour expiry

      if (error) throw error;
      if (data?.signedUrl) {
        setSignedReceiptUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Error loading receipt:', error);
    }
  };

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
    const [workersRes, projectsRes, userRes] = await Promise.all([
      supabase
        .from('payees')
        .select('id, payee_name, hourly_rate, email')
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
        .order('project_number', { ascending: false }),
      supabase.auth.getUser(),
    ]);
    
    if (workersRes.data) {
      const mappedWorkers = workersRes.data.map(w => ({ 
        id: w.id, 
        name: w.payee_name, 
        rate: w.hourly_rate || 75,
        email: w.email,
      }));
      setWorkers(mappedWorkers);

      // Auto-select current user if they're a worker
      if (userRes.data?.user?.email && !workerId) {
        const matchedWorker = mappedWorkers.find(w => w.email === userRes.data.user.email);
        if (matchedWorker) {
          setWorkerId(matchedWorker.id);
        }
      }
    }
    
    if (projectsRes.data) {
      setProjects(projectsRes.data.map(p => ({ 
        id: p.id, 
        name: p.project_name, 
        number: p.project_number 
      })));
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => { 
            setStartTime('08:00'); 
            setEndTime('17:00'); 
            setHours('8'); 
          }}
          disabled={disabled}
          className="flex-1 text-xs"
        >
          8h
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
          disabled={disabled}
          className="flex-1 text-xs"
        >
          4h
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
          disabled={disabled}
          className="flex-1 text-xs"
        >
          10h
        </Button>
      </div>

      <div>
        <Label htmlFor="worker" className="text-xs">Team Member *</Label>
        <NativeSelect
          id="worker"
          value={workerId || ""}
          onValueChange={setWorkerId}
          disabled={disabled}
          className={cn("h-8", isMobile && "h-10 text-base")}
        >
          <option value="" disabled>Select team member</option>
          {workers.map(w => (
            <option key={w.id} value={w.id}>
              {showRates ? `${w.name} - $${w.rate}/hr` : w.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div>
        <Label htmlFor="project" className="text-xs">Project *</Label>
        <NativeSelect
          id="project"
          value={projectId || ""}
          onValueChange={setProjectId}
          disabled={disabled}
          className={cn("h-8", isMobile && "h-10 text-base")}
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
        <Label htmlFor="date" className="text-xs">Date *</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={disabled}
          className={cn(isMobile && "h-10")}
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="startTime" className="text-xs">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={disabled}
            className={cn(isMobile && "h-10")}
            style={{ fontSize: isMobile ? '16px' : undefined }}
          />
        </div>
        <div>
          <Label htmlFor="endTime" className="text-xs">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={disabled}
            className={cn(isMobile && "h-10")}
            style={{ fontSize: isMobile ? '16px' : undefined }}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="hours" className="text-xs">Hours *</Label>
        <Input
          id="hours"
          type="number"
          step="0.25"
          min="0.25"
          max="24"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          disabled={disabled}
          className={cn(isMobile && "h-10")}
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
      </div>

      {showReceipt && (
        <div>
          <Label className="text-xs">Receipt</Label>
          {receiptUrl ? (
            <div className="flex items-center gap-2 mt-1">
              {signedReceiptUrl && (
                <img src={signedReceiptUrl} alt="Receipt" className="h-20 w-20 object-cover rounded border" />
              )}
              {onRemoveReceipt && (
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={onRemoveReceipt}
                  disabled={disabled}
                >
                  Remove
                </Button>
              )}
            </div>
          ) : onCaptureReceipt ? (
            <Button 
              type="button"
              variant="outline" 
              onClick={onCaptureReceipt}
              disabled={disabled}
              className="mt-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Capture Receipt
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};
