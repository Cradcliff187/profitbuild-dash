import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { ScheduleTask, SchedulePhase } from '@/types/schedule';
import { cn } from '@/lib/utils';

interface FieldScheduleTableProps {
  tasks: ScheduleTask[];
  onTaskUpdate: (task: ScheduleTask) => void;
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

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

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return taskRows;
    const query = searchQuery.toLowerCase();
    return taskRows.filter(row =>
      row.taskName.toLowerCase().includes(query) ||
      row.category.toLowerCase().includes(query)
    );
  }, [taskRows, searchQuery]);

  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleToggleComplete = (row: TaskRow) => {
    const updatedTask = { ...row.originalTask };
    
    if (row.hasPhases && row.phases) {
      // Toggle all phases
      const allComplete = row.phases.every(p => p.completed);
      updatedTask.phases = row.phases.map(p => ({
        ...p,
        completed: !allComplete,
      }));
    } else {
      // Toggle single task
      updatedTask.completed = !row.isComplete;
    }
    
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

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      labor_internal: 'bg-blue-100 text-blue-800 border-blue-200',
      subcontractors: 'bg-purple-100 text-purple-800 border-purple-200',
      materials: 'bg-green-100 text-green-800 border-green-200',
      equipment: 'bg-amber-100 text-amber-800 border-amber-200',
      permits: 'bg-red-100 text-red-800 border-red-200',
      management: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    return colors[category] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        {filteredTasks.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </p>
        )}
      </Card>

      {/* Task Cards */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No tasks match your search' : 'No tasks scheduled'}
            </p>
          </Card>
        ) : (
          filteredTasks.map((row) => {
            const isExpanded = expandedTasks.has(row.id);
            const isActive = isDateInRange(row.start, row.end);
            const startsToday = isToday(row.start);
            
            return (
              <Card
                key={row.id}
                className={cn(
                  'overflow-hidden transition-all',
                  isActive && 'ring-2 ring-primary/20',
                  startsToday && 'ring-2 ring-blue-500/40'
                )}
              >
                {/* Main Task Row */}
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Completion Checkbox */}
                    <div className="pt-0.5">
                      <Checkbox
                        checked={row.isComplete}
                        onCheckedChange={() => handleToggleComplete(row)}
                        className="h-5 w-5"
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
                        {row.hasPhases && row.phases && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(row.id)}
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs px-2 py-0 h-5', getCategoryColor(row.category))}
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

                {/* Expanded Phases */}
                {isExpanded && row.phases && (
                  <div className="border-t border-border bg-muted/30">
                    <div className="p-3 space-y-2">
                      {row.phases.map((phase) => (
                        <div
                          key={phase.phase_number}
                          className="flex items-start gap-3 p-2 rounded-lg bg-background"
                        >
                          <Checkbox
                            checked={phase.completed || false}
                            onCheckedChange={() => handleTogglePhase(row, phase.phase_number)}
                            className="h-4 w-4 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm font-medium',
                              phase.completed && 'line-through text-muted-foreground'
                            )}>
                              Phase {phase.phase_number}
                              {phase.description && `: ${phase.description}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(phase.start_date)} - {formatDate(phase.end_date)} ({phase.duration_days} days)
                            </p>
                            {phase.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                {phase.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
