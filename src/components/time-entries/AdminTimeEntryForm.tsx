import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Check, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { LunchToggle } from '@/components/time-tracker/LunchToggle';
import { calculateTimeEntryHours, DEFAULT_LUNCH_DURATION } from '@/utils/timeEntryCalculations';
import { useIsMobile } from '@/hooks/use-mobile';

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

const PTO_PROJECT_NUMBERS = ['006-SICK', '007-VAC', '008-HOL'];

const getProjectDisplayName = (project: Project): string => {
  if (PTO_PROJECT_NUMBERS.includes(project.number)) {
    return project.name;
  }
  return `${project.number} - ${project.name}`;
};

interface AdminTimeEntryFormProps {
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
  lunchTaken?: boolean;
  setLunchTaken?: (value: boolean) => void;
  lunchDuration?: number;
  setLunchDuration?: (value: number) => void;
  disabled?: boolean;
}

export const AdminTimeEntryForm = ({
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
  lunchTaken = false,
  setLunchTaken,
  lunchDuration = DEFAULT_LUNCH_DURATION,
  setLunchDuration,
  disabled = false,
}: AdminTimeEntryFormProps) => {
  const isMobile = useIsMobile();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showWorkerSelect, setShowWorkerSelect] = useState(false);
  const [showProjectSelect, setShowProjectSelect] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      if (end > start) {
        const { netHours } = calculateTimeEntryHours(
          start,
          end,
          lunchTaken,
          lunchDuration
        );
        setHours(netHours.toFixed(2));
      }
    }
  }, [startTime, endTime, lunchTaken, lunchDuration, setHours]);

  const loadData = async () => {
    // Load all internal workers (no auto-selection for admin)
    const workersRes = await supabase
      .from('payees')
      .select('id, payee_name, hourly_rate, email')
      .eq('is_internal', true)
      .eq('provides_labor', true)
      .eq('is_active', true)
      .order('payee_name');

    // Load all construction projects + PTO projects (no status filter for admin)
    const projectsRes = await supabase
      .from('projects')
      .select('id, project_name, project_number, category')
      .or('category.eq.construction,project_number.in.(006-SICK,007-VAC,008-HOL)')
      .order('project_number', { ascending: true });

    if (workersRes.data) {
      const mappedWorkers = workersRes.data.map(w => ({
        id: w.id,
        name: w.payee_name,
        rate: w.hourly_rate || 75,
        email: w.email,
      }));
      setWorkers(mappedWorkers);
      // NO auto-selection - admin must choose worker
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
            setEndTime('16:00');
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
                {`${workers.find(w => w.id === workerId)?.name || ''} - $${workers.find(w => w.id === workerId)?.rate || 0}/hr`}
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
                      {`${worker.name} - $${worker.rate}/hr`}
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
                {projects.find(p => p.id === projectId) && getProjectDisplayName(projects.find(p => p.id === projectId)!)}
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
                        {getProjectDisplayName(project)}
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
          className={cn(
            "border-2 border-border rounded-lg",
            isMobile ? "h-12 p-4" : "h-10 p-3"
          )}
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
            className={cn(
              "border-2 border-border rounded-lg",
              isMobile ? "h-12 p-4" : "h-10 p-3"
            )}
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
            className={cn(
              "border-2 border-border rounded-lg",
              isMobile ? "h-12 p-4" : "h-10 p-3"
            )}
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
          className={cn(
            "border-2 border-border rounded-lg",
            isMobile ? "h-12 p-4" : "h-10 p-3"
          )}
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
        {lunchTaken && startTime && endTime && date && (
          <p className="text-xs text-muted-foreground mt-1">
            {(() => {
              try {
                const startDateTime = new Date(`${date}T${startTime}`);
                const endDateTime = new Date(`${date}T${endTime}`);
                const { grossHours, netHours } = calculateTimeEntryHours(
                  startDateTime,
                  endDateTime,
                  lunchTaken,
                  lunchDuration
                );
                return `Shift: ${grossHours.toFixed(1)}h - Lunch: ${(lunchDuration / 60).toFixed(1)}h = ${netHours.toFixed(1)}h worked`;
              } catch {
                return '';
              }
            })()}
          </p>
        )}
      </div>

      {setLunchTaken && setLunchDuration && (
        <LunchToggle
          lunchTaken={lunchTaken}
          onLunchTakenChange={setLunchTaken}
          lunchDuration={lunchDuration}
          onLunchDurationChange={setLunchDuration}
          disabled={disabled}
          isMobile={isMobile}
        />
      )}
    </div>
  );
};
