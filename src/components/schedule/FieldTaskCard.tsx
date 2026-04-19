import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, CheckCircle2, StickyNote, AlertCircle } from 'lucide-react';
import { ScheduleTask, SchedulePhase } from '@/types/schedule';
import { cn } from '@/lib/utils';
import { NoteComposer } from '@/components/notes/NoteComposer';

interface FieldTaskCardProps {
  task: ScheduleTask;
  projectId: string;
  onToggleComplete: (task: ScheduleTask) => void;
  onTogglePhase: (task: ScheduleTask, phaseNumber: number) => void;
}

// --- Helpers ---

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function isDateInRange(start: string, end: string): boolean {
  const today = new Date();
  return today >= new Date(start) && today <= new Date(end);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function calculateDuration(start: string, end: string): number {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function extractScheduleNotes(scheduleNotes?: string): string | undefined {
  if (!scheduleNotes) return undefined;
  try {
    return JSON.parse(scheduleNotes).notes || undefined;
  } catch {
    return scheduleNotes;
  }
}

function isTaskComplete(task: ScheduleTask): boolean {
  if (task.has_multiple_phases && task.phases) {
    return task.phases.every((p) => p.completed);
  }
  return task.completed || false;
}

// --- Status indicator color ---

function getStatusColor(task: ScheduleTask): string {
  if (isTaskComplete(task)) return 'bg-green-500';
  if (isDateInRange(task.start, task.end)) return 'bg-primary';
  if (isToday(task.start)) return 'bg-blue-500 animate-pulse';
  return 'bg-muted-foreground/30';
}

function getStatusLabel(task: ScheduleTask): string {
  if (isTaskComplete(task)) return 'Complete';
  if (isToday(task.start)) return 'Starts today';
  if (isDateInRange(task.start, task.end)) return 'Active';
  return '';
}

// --- Expanded action area ---

function TaskActions({
  taskName,
  projectId,
  onMarkComplete,
  isComplete,
}: {
  taskName: string;
  projectId: string;
  onMarkComplete: () => void;
  isComplete: boolean;
}) {
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);

  return (
    <div className="space-y-2 pt-3 border-t border-border/50">
      {/* Add Note — opens NoteComposer sheet with task context.
         Photo / Video / File capture live inside the composer's Attach menu
         so PMs get a full-screen composer rather than a cramped inline form. */}
      <Button
        variant="outline"
        onClick={() => setNoteSheetOpen(true)}
        className="w-full h-11 rounded-lg gap-2"
      >
        <StickyNote className="h-4 w-4" />
        Add Note
      </Button>

      {!isComplete && (
        <Button
          variant="outline"
          onClick={onMarkComplete}
          className="w-full h-11 rounded-lg border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 active:bg-green-100"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Mark Complete
        </Button>
      )}

      <NoteComposer
        projectId={projectId}
        taskName={taskName}
        presentation="sheet"
        open={noteSheetOpen}
        onOpenChange={setNoteSheetOpen}
      />
    </div>
  );
}

// --- Single-phase task card ---

export function FieldTaskCard({ task, projectId, onToggleComplete, onTogglePhase }: FieldTaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const complete = isTaskComplete(task);
  const duration = calculateDuration(task.start, task.end);
  const statusColor = getStatusColor(task);
  const statusLabel = getStatusLabel(task);
  const taskNotes = extractScheduleNotes(task.schedule_notes);

  // Multi-phase task
  if (task.has_multiple_phases && task.phases) {
    const completedPhases = task.phases.filter((p) => p.completed).length;
    const totalPhases = task.phases.length;
    const allDone = completedPhases === totalPhases;

    return (
      <div className="space-y-1.5">
        {/* Multi-phase header */}
        <div className="flex items-center gap-2.5 px-1 py-1">
          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', allDone ? 'bg-green-500' : 'bg-primary')} />
          <span className="text-sm font-semibold flex-1">{task.name}</span>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {completedPhases}/{totalPhases}
          </Badge>
          {task.isChangeOrder && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-pink-50 text-pink-700 border-pink-200">
              CO
            </Badge>
          )}
        </div>

        {/* Phase cards */}
        {[...task.phases]
          .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return a.phase_number - b.phase_number;
          })
          .map((phase) => (
            <PhaseTaskCard
              key={phase.phase_number}
              phase={phase}
              task={task}
              projectId={projectId}
              onTogglePhase={() => onTogglePhase(task, phase.phase_number)}
            />
          ))}
      </div>
    );
  }

  // Single-phase task
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full text-left rounded-xl border transition-all',
          'active:scale-[0.99]',
          complete ? 'bg-muted/30 border-border/50' : 'bg-card border-border hover:border-primary/30',
          isExpanded && !complete && 'border-primary/40 shadow-sm'
        )}
      >
        <div className="flex items-center gap-3 p-3">
          {/* Status dot */}
          <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', statusColor)} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={cn(
                'text-sm font-medium truncate',
                complete && 'line-through text-muted-foreground'
              )}>
                {task.name}
              </h3>
              {task.isChangeOrder && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 bg-pink-50 text-pink-700 border-pink-200 flex-shrink-0">
                  CO
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span>{formatDate(task.start)} - {formatDate(task.end)}</span>
              <span>•</span>
              <span>{duration}d</span>
              {statusLabel && !complete && (
                <>
                  <span>•</span>
                  <span className="text-primary font-medium">{statusLabel}</span>
                </>
              )}
            </div>
          </div>

          {/* Expand indicator */}
          {complete ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <ChevronDown className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180'
            )} />
          )}
        </div>
      </button>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="px-3 pb-3 pt-1">
          {/* Schedule notes from admin */}
          {taskNotes && (
            <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 dark:text-amber-100 font-medium leading-relaxed">
                  {taskNotes}
                </p>
              </div>
            </div>
          )}

          {/* Actions: note input, photo, mark complete */}
          <TaskActions
            taskName={task.name}
            projectId={projectId}
            onMarkComplete={() => onToggleComplete(task)}
            isComplete={complete}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// --- Phase card (used inside multi-phase tasks) ---

function PhaseTaskCard({
  phase,
  task,
  projectId,
  onTogglePhase,
}: {
  phase: SchedulePhase;
  task: ScheduleTask;
  projectId: string;
  onTogglePhase: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const phaseIsActive = isDateInRange(phase.start_date, phase.end_date);
  const phaseStartsToday = isToday(phase.start_date);

  const statusColor = phase.completed
    ? 'bg-green-500'
    : phaseIsActive
    ? 'bg-primary'
    : phaseStartsToday
    ? 'bg-blue-500 animate-pulse'
    : 'bg-muted-foreground/30';

  const phaseName = phase.description
    ? `Phase ${phase.phase_number}: ${phase.description}`
    : `Phase ${phase.phase_number}`;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full text-left rounded-xl border transition-all ml-4',
          'active:scale-[0.99]',
          phase.completed ? 'bg-muted/30 border-border/50' : 'bg-card border-border hover:border-primary/30',
          isExpanded && !phase.completed && 'border-primary/40 shadow-sm'
        )}
        style={{ width: 'calc(100% - 16px)' }}
      >
        <div className="flex items-center gap-3 p-3">
          <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', statusColor)} />
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              'text-sm font-medium truncate',
              phase.completed && 'line-through text-muted-foreground'
            )}>
              {phaseName}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span>{formatDate(phase.start_date)} - {formatDate(phase.end_date)}</span>
              <span>•</span>
              <span>{phase.duration_days}d</span>
            </div>
          </div>
          {phase.completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <ChevronDown className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180'
            )} />
          )}
        </div>
      </button>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="px-3 pb-3 pt-1 ml-4" style={{ width: 'calc(100% - 16px)' }}>
          {phase.notes && (
            <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 dark:text-amber-100 font-medium leading-relaxed">
                  {phase.notes}
                </p>
              </div>
            </div>
          )}
          <TaskActions
            taskName={`${task.name} — ${phaseName}`}
            projectId={projectId}
            onMarkComplete={onTogglePhase}
            isComplete={phase.completed || false}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
