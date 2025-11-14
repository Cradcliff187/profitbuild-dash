import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { ScheduleTask, SchedulePhase } from '@/types/schedule';
import { cn } from '@/lib/utils';
import { getCategoryBadgeClasses } from '@/utils/categoryColors';
import { ProjectNotesTimeline } from '@/components/ProjectNotesTimeline';
import { NotesSheetTrigger } from './NotesSheetTrigger';
import { useIsMobile } from '@/hooks/use-mobile';

interface FieldScheduleTableProps {
  tasks: ScheduleTask[];
  onTaskUpdate: (task: ScheduleTask) => void;
  projectId: string;
}

interface TaskRow {
  id: string;
  taskId: string;
  taskName: string;
  category: string;
  start: string;
  end: string;
  duration: number;
  isComplete: boolean;
  isChangeOrder: boolean;
  hasPhases: boolean;
  phases?: SchedulePhase[];
  originalTask: ScheduleTask;
}

export const FieldScheduleTable: React.FC<FieldScheduleTableProps> = ({
  tasks,
  onTaskUpdate,
  projectId,
}) => {
  const isMobile = useIsMobile();

  const calculateDuration = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const isToday = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isDateInRange = (start: string, end: string): boolean => {
    const today = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    return today >= startDate && today <= endDate;
  };

  const taskRows = useMemo((): TaskRow[] => {
    return tasks.map(task => ({
      id: task.id,
      taskId: task.id,
      taskName: task.name,
      category: task.category,
      start: task.start,
      end: task.end,
      duration: calculateDuration(task.start, task.end),
      isComplete: task.has_multiple_phases 
        ? (task.phases?.every(p => p.completed) || false)
        : (task.completed || false),
      isChangeOrder: task.isChangeOrder,
      hasPhases: task.has_multiple_phases,
      phases: task.phases,
      originalTask: task,
    }));
  }, [tasks]);

  const sortedTasks = useMemo(() => {
    return [...taskRows].sort((a, b) => {
      // First, sort by completion status (incomplete first)
      if (a.isComplete !== b.isComplete) {
        return a.isComplete ? 1 : -1;
      }
      
      // Within each group, sort by start date (earliest first)
      const dateA = new Date(a.start).getTime();
      const dateB = new Date(b.start).getTime();
      return dateA - dateB;
    });
  }, [taskRows]);

  const handleToggleSingleTask = (row: TaskRow) => {
    const updatedTask = { ...row.originalTask };
    updatedTask.completed = !row.isComplete;
    onTaskUpdate(updatedTask);
  };

  const handleTogglePhase = (row: TaskRow, phaseNumber: number) => {
    if (!row.phases) return;
    
    const updatedTask = { ...row.originalTask };
    updatedTask.phases = row.phases.map(p =>
      p.phase_number === phaseNumber
        ? { ...p, completed: !p.completed }
        : p
    );
    
    onTaskUpdate(updatedTask);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const extractNotesFromScheduleNotes = (scheduleNotes?: string): string | undefined => {
    if (!scheduleNotes) return undefined;
    
    try {
      const parsed = JSON.parse(scheduleNotes);
      return parsed.notes || undefined;
    } catch {
      return scheduleNotes;
    }
  };

  return (
    <div className="space-y-3">
      {/* Project Notes */}
      {isMobile ? (
        <NotesSheetTrigger projectId={projectId} />
      ) : (
        <Card className="p-3">
          <h3 className="text-sm font-semibold mb-3">Project Notes</h3>
          <ProjectNotesTimeline projectId={projectId} />
        </Card>
      )}

      {/* Task Cards */}
      <div className="space-y-2">
        {sortedTasks.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No tasks scheduled</p>
          </Card>
        ) : (
          sortedTasks.map((row) => {
            // For multi-phase tasks, render as header + phase list
            if (row.hasPhases && row.phases) {
              const completedPhases = row.phases.filter(p => p.completed).length;
              const totalPhases = row.phases.length;
              
              return (
                <div key={row.id} className="space-y-2">
                  {/* Task Header (no checkbox) */}
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-start gap-2 mb-1">
                      <h3 className="text-sm font-medium flex-1">
                        {row.taskName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className={cn('text-xs px-2 py-0 h-5', getCategoryBadgeClasses(row.category))}
                      >
                        {row.category.replace('_', ' ')}
                      </Badge>
                      {row.isChangeOrder && (
                        <Badge 
                          variant="outline"
                          className="text-xs px-2 py-0 h-5 bg-pink-50 text-pink-700 border-pink-200"
                        >
                          Change Order
                        </Badge>
                      )}
                      <Badge 
                        variant="outline"
                        className="text-xs px-2 py-0 h-5 bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {completedPhases} of {totalPhases} complete
                      </Badge>
                    </div>
                  </div>

                  {/* Phase Cards (always visible) */}
                  <div className="space-y-2">
                    {row.phases
                      .sort((a, b) => {
                        // Incomplete phases first, completed phases at bottom
                        if (a.completed !== b.completed) {
                          return a.completed ? 1 : -1;
                        }
                        // Then by phase number
                        return a.phase_number - b.phase_number;
                      })
                      .map((phase) => {
                      const phaseIsActive = isDateInRange(phase.start_date, phase.end_date);
                      const phaseStartsToday = isToday(phase.start_date);
                      
                      return (
                        <Card
                          key={phase.phase_number}
                          className={cn(
                            'overflow-hidden transition-all',
                            phaseIsActive && 'ring-2 ring-primary/20',
                            phaseStartsToday && 'ring-2 ring-blue-500/40',
                            phase.completed && 'opacity-60 bg-green-50/50'
                          )}
                        >
                          <div className="p-3">
                            <div className="flex items-start gap-3">
                              {/* Completion Checkbox */}
                              <div className="pt-0.5">
                                <Checkbox
                                  checked={phase.completed || false}
                                  onCheckedChange={() => handleTogglePhase(row, phase.phase_number)}
                                  className="h-6 w-6"
                                />
                              </div>

                              {/* Phase Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className={cn(
                                  'text-sm font-medium mb-1',
                                  phase.completed && 'line-through text-muted-foreground'
                                )}>
                                  Phase {phase.phase_number}
                                  {phase.description && `: ${phase.description}`}
                                </h4>

                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{formatDate(phase.start_date)} - {formatDate(phase.end_date)}</span>
                                  <span>•</span>
                                  <span>{phase.duration_days} days</span>
                                </div>

                                {phase.notes && (
                                  <div className="mt-2 p-2.5 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50">
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                                      <p className="text-xs text-amber-900 dark:text-amber-100 font-medium leading-relaxed">
                                        {phase.notes}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {phaseStartsToday && (
                                  <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                                    <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                                    Starts today
                                  </div>
                                )}
                              </div>

                              {/* Status Icon */}
                              {phase.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                              ) : (
                                <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Single-phase task - render as normal card with checkbox
            const isActive = isDateInRange(row.start, row.end);
            const startsToday = isToday(row.start);
            
            return (
              <Card
                key={row.id}
                className={cn(
                  'overflow-hidden transition-all',
                  isActive && 'ring-2 ring-primary/20',
                  startsToday && 'ring-2 ring-blue-500/40',
                  row.isComplete && 'opacity-60 bg-green-50/50'
                )}
              >
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Completion Checkbox */}
                    <div className="pt-0.5">
                      <Checkbox
                        checked={row.isComplete}
                        onCheckedChange={() => handleToggleSingleTask(row)}
                        className="h-6 w-6"
                      />
                    </div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <h3 className={cn(
                          'text-sm font-medium flex-1',
                          row.isComplete && 'line-through text-muted-foreground'
                        )}>
                          {row.taskName}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs px-2 py-0 h-5', getCategoryBadgeClasses(row.category))}
                        >
                          {row.category.replace('_', ' ')}
                        </Badge>
                        {row.isChangeOrder && (
                          <Badge 
                            variant="outline"
                            className="text-xs px-2 py-0 h-5 bg-pink-50 text-pink-700 border-pink-200"
                          >
                            Change Order
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDate(row.start)} - {formatDate(row.end)}</span>
                        <span>•</span>
                        <span>{row.duration} days</span>
                      </div>

                      {extractNotesFromScheduleNotes(row.originalTask.schedule_notes) && (
                        <div className="mt-2 p-2.5 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-900 dark:text-amber-100 font-medium leading-relaxed">
                              {extractNotesFromScheduleNotes(row.originalTask.schedule_notes)}
                            </p>
                          </div>
                        </div>
                      )}

                      {startsToday && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                          <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                          Starts today
                        </div>
                      )}
                    </div>

                    {/* Status Icon */}
                    {row.isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
