import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Camera, Check, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  const [showWorkerSelect, setShowWorkerSelect] = useState(false);
  const [showProjectSelect, setShowProjectSelect] = useState(false);

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
        .select('id, project_name, project_number, category')
        .in('status', ['approved', 'in_progress'])
        .eq('category', 'construction')
        .order('project_number', { ascending: true }),
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
    <div className={cn("space-y-3", isMobile && "space-y-4")}>
      {/* Quick Hour Buttons - Larger on Mobile */}
      <div className="flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => { 
            setStartTime('08:00'); 
            setEndTime('17:00'); 
            setHours('8'); 
          }}
          disabled={disabled}
          className={cn("flex-1", isMobile ? "h-12 text-base font-medium" : "h-9 text-sm")}
        >
          8h
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => { 
            setStartTime('08:00'); 
            setEndTime('12:00'); 
            setHours('4'); 
          }}
          disabled={disabled}
          className={cn("flex-1", isMobile ? "h-12 text-base font-medium" : "h-9 text-sm")}
        >
          4h
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => { 
            setStartTime('07:00'); 
            setEndTime('17:00'); 
            setHours('10'); 
          }}
          disabled={disabled}
          className={cn("flex-1", isMobile ? "h-12 text-base font-medium" : "h-9 text-sm")}
        >
          10h
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="worker" className={isMobile ? "text-sm font-medium" : "text-sm"}>
          <User className="w-4 h-4 inline mr-1" />
          Team Member *
        </Label>
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowProjectSelect(false);
              setShowWorkerSelect(!showWorkerSelect);
            }}
            disabled={disabled}
            className={cn(
              "w-full p-4 text-left rounded-lg border-2 border-border hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]",
              isMobile ? "text-base" : "text-sm"
            )}
          >
            {workerId ? (
              <div className="font-semibold text-foreground">
                {showRates 
                  ? `${workers.find(w => w.id === workerId)?.name || ''} - $${workers.find(w => w.id === workerId)?.rate || 0}/hr`
                  : workers.find(w => w.id === workerId)?.name || 'Select team member...'
                }
              </div>
            ) : (
              <div className="text-muted-foreground">Select team member...</div>
            )}
          </button>
          
          {showWorkerSelect && !disabled && (
            <div className="mt-2 border rounded-lg bg-card shadow-md relative z-50 max-h-64 overflow-y-auto">
              {workers.map(worker => (
                <button
                  key={worker.id}
                  type="button"
                  onClick={() => {
                    setWorkerId(worker.id);
                    setShowWorkerSelect(false);
                  }}
                  className={cn(
                    "w-full p-4 text-left border-b last:border-b-0 transition-all min-h-[44px]",
                    workerId === worker.id
                      ? "bg-primary/5 border-l-4 border-l-primary hover:bg-primary/10"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      {showRates ? `${worker.name} - $${worker.rate}/hr` : worker.name}
                    </div>
                    {workerId === worker.id && (
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="project" className={isMobile ? "text-sm font-medium" : "text-sm"}>
          <MapPin className="w-4 h-4 inline mr-1" />
          Project *
        </Label>
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowWorkerSelect(false);
              setShowProjectSelect(!showProjectSelect);
            }}
            disabled={disabled}
            className={cn(
              "w-full p-4 text-left rounded-lg border-2 border-border hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]",
              isMobile ? "text-base" : "text-sm"
            )}
          >
            {projectId ? (
              <div className="font-semibold text-foreground">
                {projects.find(p => p.id === projectId)?.number} - {projects.find(p => p.id === projectId)?.name}
              </div>
            ) : (
              <div className="text-muted-foreground">Select project...</div>
            )}
          </button>
          
          {showProjectSelect && !disabled && (
            <div className="mt-2 border rounded-lg bg-card shadow-md relative z-50 max-h-64 overflow-y-auto">
              {projects.map(project => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setProjectId(project.id);
                    setShowProjectSelect(false);
                  }}
                  className={cn(
                    "w-full p-4 text-left border-b last:border-b-0 transition-all min-h-[44px]",
                    projectId === project.id
                      ? "bg-primary/5 border-l-4 border-l-primary hover:bg-primary/10"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">
                        {project.number} - {project.name}
                      </div>
                    </div>
                    {projectId === project.id && (
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date" className={isMobile ? "text-sm font-medium" : "text-sm"}>
          Date *
        </Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={disabled}
          className={cn(isMobile ? "h-12" : "h-10")}
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
      </div>

      <div className={cn("grid grid-cols-2", isMobile ? "gap-3" : "gap-2")}>
        <div className="space-y-2">
          <Label htmlFor="startTime" className={isMobile ? "text-sm font-medium" : "text-sm"}>
            Start Time
          </Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={disabled}
            className={cn(isMobile ? "h-12" : "h-10")}
            style={{ fontSize: isMobile ? '16px' : undefined }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime" className={isMobile ? "text-sm font-medium" : "text-sm"}>
            End Time
          </Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={disabled}
            className={cn(isMobile ? "h-12" : "h-10")}
            style={{ fontSize: isMobile ? '16px' : undefined }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hours" className={isMobile ? "text-sm font-medium" : "text-sm"}>
          Hours *
        </Label>
        <Input
          id="hours"
          type="number"
          step="0.25"
          min="0.25"
          max="24"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          disabled={disabled}
          className={cn(isMobile ? "h-12" : "h-10")}
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
