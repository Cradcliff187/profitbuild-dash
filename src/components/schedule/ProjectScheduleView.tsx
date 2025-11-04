import React, { useState, useEffect, useMemo } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Download, ArrowUpDown, BarChart3, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import TaskEditPanel from './TaskEditPanel';
import ScheduleWarningBanner from './ScheduleWarningBanner';
import ScheduleStats from './ScheduleStats';
import TaskReorderPanel from './TaskReorderPanel';
import { ScheduleTableView } from './ScheduleTableView';
import { useProgressTracking } from './hooks/useProgressTracking';
import { ScheduleTask, ScheduleWarning } from '@/types/schedule';
import { ScheduleExportModal } from './ScheduleExportModal';

interface ProjectScheduleViewProps {
  projectId: string;
  projectStartDate?: Date;
  projectEndDate?: Date;
}

export default function ProjectScheduleView({ 
  projectId, 
  projectStartDate, 
  projectEndDate 
}: ProjectScheduleViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduleTasks, setScheduleTasks] = useState<ScheduleTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null);
  const [warnings, setWarnings] = useState<ScheduleWarning[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [displayMode, setDisplayMode] = useState<'gantt' | 'table'>(() => {
    const saved = localStorage.getItem(`schedule_view_mode_${projectId}`);
    return (saved === 'table' || saved === 'gantt') ? saved : 'gantt';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showReorderPanel, setShowReorderPanel] = useState(false);
  const [projectName, setProjectName] = useState<string>('Project');
  const [taskOrder, setTaskOrder] = useState<string[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { getTaskProgress, isLoading: progressLoading } = useProgressTracking(projectId);

  // Save display mode preference
  useEffect(() => {
    localStorage.setItem(`schedule_view_mode_${projectId}`, displayMode);
  }, [displayMode, projectId]);

  // Helper functions for task name date formatting
  const formatShortDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getBaseTaskName = (taskName: string): string => {
    return taskName.replace(/\s*\([^)]+\)\s*$/, '').trim();
  };

  // FIX 1: Track if we're currently dragging to prevent click events
  const isDraggingRef = React.useRef(false);
  const dragTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadScheduleTasks();
    loadProjectName();
  }, [projectId]);

  // FIX 1: Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  const loadProjectName = async () => {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('project_name')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      if (project) {
        setProjectName(project.project_name);
      }
    } catch (error) {
      console.error('Error loading project name:', error);
      // Keep default 'Project' name if load fails
    }
  };

  const loadScheduleTasks = async () => {
    try {
      setIsLoading(true);

      // Load approved estimate with line items
      const { data: estimate, error: estError } = await supabase
        .from('estimates')
        .select(`
          id,
          estimate_line_items (
            id,
            category,
            description,
            quantity,
            cost_per_unit,
            total_cost,
            scheduled_start_date,
            scheduled_end_date,
            duration_days,
            dependencies,
            is_milestone,
            schedule_notes
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .order('date_created', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (estError) throw estError;

      // Load approved change orders with line items
      const { data: changeOrders, error: coError } = await supabase
        .from('change_orders')
        .select(`
          id,
          change_order_number,
          change_order_line_items (
            id,
            category,
            description,
            quantity,
            cost_per_unit,
            total_cost,
            scheduled_start_date,
            scheduled_end_date,
            duration_days,
            dependencies,
            is_milestone,
            schedule_notes
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'approved');

      if (coError) throw coError;

      // Convert to ScheduleTask format
      const estimateTasks = convertLineItemsToScheduleTasks(
        estimate?.estimate_line_items || [],
        false
      );

      const changeOrderTasks = (changeOrders || []).flatMap((co: any) =>
        convertLineItemsToScheduleTasks(
          co.change_order_line_items || [],
          true,
          co.change_order_number
        )
      );

      const allScheduleTasks = [...estimateTasks, ...changeOrderTasks];
      setScheduleTasks(allScheduleTasks);
      
      // Initialize task order with task IDs
      setTaskOrder(allScheduleTasks.map(t => t.id));

      // Convert to Gantt Task format
      const ganttTasks = convertToGanttTasks(allScheduleTasks);
      setTasks(ganttTasks);

      checkScheduleWarnings(allScheduleTasks);
    } catch (error) {
      console.error('Error loading schedule:', error);
      // FIX 2: Add duration to toast
      toast({
        title: 'Error',
        description: 'Failed to load project schedule',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const convertLineItemsToScheduleTasks = (
    lineItems: any[],
    isChangeOrder: boolean,
    coNumber?: string
  ): ScheduleTask[] => {
    return lineItems.map((item) => {
      const taskName = isChangeOrder 
        ? `CO-${coNumber}: ${item.description}`
        : item.description;

      // Parse schedule phases from schedule_notes
      let phases: any[] | undefined;
      let hasMultiplePhases = false;
      
      try {
        if (item.schedule_notes) {
          const parsed = JSON.parse(item.schedule_notes);
          if (parsed.phases && Array.isArray(parsed.phases)) {
            phases = parsed.phases;
            hasMultiplePhases = phases.length > 1;
          }
        }
      } catch (e) {
        // Not JSON or no phases
      }

      // Calculate overall start/end from phases OR use scheduled dates
      let startDate: Date;
      let endDate: Date;
      
      if (phases && phases.length > 0) {
        startDate = new Date(phases[0].start_date);
        endDate = new Date(phases[phases.length - 1].end_date);
      } else {
        startDate = item.scheduled_start_date 
          ? new Date(item.scheduled_start_date)
          : projectStartDate 
          ? new Date(projectStartDate)
          : new Date();

        endDate = item.scheduled_end_date
          ? new Date(item.scheduled_end_date)
          : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      return {
        id: item.id,
        name: taskName,
        category: item.category,
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        progress: getTaskProgress(item.id),
        dependencies: item.dependencies || [],
        custom_class: isChangeOrder ? 'change-order' : item.category,
        isChangeOrder,
        schedule_notes: item.schedule_notes,
        phases: phases,
        has_multiple_phases: hasMultiplePhases,
        estimated_cost: item.total_cost || 0,
        actual_cost: 0,
      };
    });
  };

  const convertToGanttTasks = (scheduleTasks: ScheduleTask[]): Task[] => {
    const formatShortDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    };

    // Flatten multi-phase tasks into multiple Gantt bars
    return scheduleTasks.flatMap((task, index) => {
      if (task.has_multiple_phases && task.phases) {
        // Create sub-tasks for each phase
        return task.phases.map((phase: any, phaseIdx: number) => {
          const start = new Date(phase.start_date);
          const end = new Date(phase.end_date);
          const phaseName = `${task.name} - Phase ${phase.phase_number}${phase.description ? `: ${phase.description}` : ''}`;
          const taskNameWithDates = `${phaseName} (${formatShortDate(phase.start_date)} - ${formatShortDate(phase.end_date)})`;

          return {
            start,
            end,
            name: taskNameWithDates,
            id: `${task.id}_phase_${phase.phase_number}`,
            type: 'task' as const,
            progress: task.progress,
            isDisabled: false,
            styles: {
              backgroundColor: getCategoryColor(task.category),
              backgroundSelectedColor: getCategoryColor(task.category),
              progressColor: '#4ade80',
              progressSelectedColor: '#22c55e'
            }
          };
        });
      } else {
        // Single phase - render normally
        const start = new Date(task.start);
        const end = new Date(task.end);
        const taskNameWithDates = `${task.name} (${formatShortDate(task.start)} - ${formatShortDate(task.end)})`;

        return [{
          start,
          end,
          name: taskNameWithDates,
          id: task.id,
          type: 'task' as const,
          progress: task.progress,
          isDisabled: false,
          styles: {
            backgroundColor: getCategoryColor(task.category),
            backgroundSelectedColor: getCategoryColor(task.category),
            progressColor: '#4ade80',
            progressSelectedColor: '#22c55e'
          }
        }];
      }
    });
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'labor_internal': '#3b82f6',
      'subcontractors': '#8b5cf6',
      'materials': '#10b981',
      'equipment': '#f59e0b',
      'permits': '#ef4444',
      'management': '#6366f1',
      'change-order': '#ec4899'
    };
    return colors[category] || '#64748b';
  };

  const handleTaskChange = async (task: Task) => {
    // FIX 1: Set dragging flag
    isDraggingRef.current = true;
    
    // Clear any existing timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }

    try {
      const scheduleTask = scheduleTasks.find(t => t.id === task.id);
      if (!scheduleTask) return;

      const table = scheduleTask.isChangeOrder 
        ? 'change_order_line_items' 
        : 'estimate_line_items';

      const duration = Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // OPTIMISTIC UPDATE: Update UI IMMEDIATELY (before database save)
      setScheduleTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { 
              ...t, 
              start: task.start.toISOString().split('T')[0],
              end: task.end.toISOString().split('T')[0]
            }
          : t
      ));

      // REALTIME FIX: Update tasks state for immediate Gantt re-render
      setTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          const baseName = getBaseTaskName(t.name);
          const newName = `${baseName} (${formatShortDate(task.start)} - ${formatShortDate(task.end)})`;
          return { ...t, start: task.start, end: task.end, name: newName };
        }
        return t;
      }));

      // NOW save to database (in background)
      const { error } = await supabase
        .from(table)
        .update({
          scheduled_start_date: task.start.toISOString().split('T')[0],
          scheduled_end_date: task.end.toISOString().split('T')[0],
          duration_days: duration
        })
        .eq('id', task.id);

      if (error) {
        // If save fails, reload to revert the optimistic update
        await loadScheduleTasks();
        throw error;
      }

      // FIX 2: Show success toast with auto-dismiss
      toast({
        title: '✓ Schedule Updated',
        description: `${scheduleTask.name} moved to ${task.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        duration: 3000, // Auto-dismiss after 3 seconds
      });

    } catch (error) {
      console.error('Error updating task:', error);
      // FIX 2: Error toast with duration
      toast({
        title: '✗ Update Failed',
        description: 'Could not save schedule changes. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      // FIX 1: Reset dragging flag after 300ms to allow click events
      dragTimeoutRef.current = setTimeout(() => {
        isDraggingRef.current = false;
      }, 300);
    }
  };

  const handleTaskClick = (task: Task) => {
    // FIX 1: Don't open edit panel if we're dragging
    if (isDraggingRef.current) {
      return;
    }

    // Handle multi-phase tasks (strip phase suffix from ID)
    const taskId = task.id.includes('_phase_') 
      ? task.id.split('_phase_')[0] 
      : task.id;

    const scheduleTask = scheduleTasks.find(t => t.id === taskId);
    if (scheduleTask) {
      setSelectedTask(scheduleTask);
    }
  };

  const checkScheduleWarnings = (tasks: ScheduleTask[]) => {
    // Simple warning example
    const newWarnings: ScheduleWarning[] = [];
    
    tasks.forEach(task => {
      if (task.name.toLowerCase().includes('paint')) {
        const drywallTask = tasks.find(t => 
          t.name.toLowerCase().includes('drywall') && !t.isChangeOrder
        );
        
        if (drywallTask) {
          const taskStart = new Date(task.start);
          const drywallEnd = new Date(drywallTask.end);
          
          if (taskStart < drywallEnd) {
            newWarnings.push({
              id: `warning-${task.id}`,
              severity: 'warning',
              message: `"${task.name}" starts before drywall is complete`,
              task_id: task.id,
              task_name: task.name,
              canDismiss: true
            });
          }
        }
      }
    });

    setWarnings(newWarnings);
  };

  // Sort tasks based on taskOrder
  const orderedTasks = useMemo(() => {
    if (taskOrder.length === 0) return scheduleTasks;
    return [...scheduleTasks].sort((a, b) => 
      taskOrder.indexOf(a.id) - taskOrder.indexOf(b.id)
    );
  }, [scheduleTasks, taskOrder]);

  // Move task up or down in the order
  const moveTask = (taskId: string, direction: 'up' | 'down') => {
    const currentIndex = taskOrder.indexOf(taskId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= taskOrder.length) return;
    
    const newOrder = [...taskOrder];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
    setTaskOrder(newOrder);
    
    // Update Gantt tasks immediately
    const reorderedScheduleTasks = [...scheduleTasks].sort((a, b) => 
      newOrder.indexOf(a.id) - newOrder.indexOf(b.id)
    );
    const ganttTasks = convertToGanttTasks(reorderedScheduleTasks);
    setTasks(ganttTasks);
  };

  if (isLoading || progressLoading) {
    return (
      <LoadingSpinner 
        variant="page" 
        size="lg" 
        message="Loading project schedule..." 
      />
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Schedule Available</h3>
        <p className="text-muted-foreground mb-4">
          This project needs an approved estimate before you can create a schedule.
        </p>
        <Button onClick={() => window.location.href = `/estimates?project=${projectId}`}>
          Create Estimate
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>📊 Interactive Schedule:</strong> 
          {isMobile ? (
            ' Swipe horizontally to scroll. Touch and drag tasks to adjust dates.'
          ) : (
            ' Drag tasks to adjust dates. Double-click tasks to edit details and dependencies.'
          )}
        </p>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <ScheduleWarningBanner
          warnings={warnings}
          onDismiss={(warningId) => setWarnings(prev => prev.filter(w => w.id !== warningId))}
          onAdjust={(taskId) => {
            const task = scheduleTasks.find(t => t.id === taskId);
            if (task) setSelectedTask(task);
          }}
        />
      )}

      {/* Stats */}
      <ScheduleStats tasks={scheduleTasks} />

      {/* Controls */}
      <Card className="p-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-2 flex-wrap">
            {/* Display Mode Toggle */}
            <div className="flex gap-1 border rounded-md p-0.5">
              <Button
                variant={displayMode === 'gantt' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayMode('gantt')}
                className="h-7 px-2"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Gantt
              </Button>
              <Button
                variant={displayMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayMode('table')}
                className="h-7 px-2"
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Table
              </Button>
            </div>

            {/* Gantt View Mode Controls (only show in Gantt mode) */}
            {displayMode === 'gantt' && (
              <div className="flex gap-1 border rounded-md p-0.5">
                <Button
                  variant={viewMode === ViewMode.Day ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode(ViewMode.Day)}
                  className="h-7 px-2"
                >
                  Day
                </Button>
                <Button
                  variant={viewMode === ViewMode.Week ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode(ViewMode.Week)}
                  className="h-7 px-2"
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === ViewMode.Month ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode(ViewMode.Month)}
                  className="h-7 px-2"
                >
                  Month
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {/* Reorder Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReorderPanel(!showReorderPanel)}
              className="flex items-center gap-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              Reorder
            </Button>
            
            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Reorder Panel */}
      <TaskReorderPanel
        tasks={orderedTasks}
        onMoveUp={(taskId) => moveTask(taskId, 'up')}
        onMoveDown={(taskId) => moveTask(taskId, 'down')}
        isOpen={showReorderPanel}
        onToggle={() => setShowReorderPanel(!showReorderPanel)}
      />

      {/* Conditional Rendering: Gantt or Table */}
      {displayMode === 'gantt' ? (
        <Card className="p-6 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <Gantt
            tasks={tasks}
            viewMode={viewMode}
            onDateChange={handleTaskChange}
            onDoubleClick={handleTaskClick}
            listCellWidth=""
            columnWidth={
              viewMode === ViewMode.Day ? 80 : 
              viewMode === ViewMode.Week ? 65 : 
              viewMode === ViewMode.Month ? 300 : 65
            }
            headerHeight={60}
            rowHeight={45}
            barCornerRadius={4}
            handleWidth={8}
            todayColor="rgba(59, 130, 246, 0.1)"
            locale="en-US"
          />
        </Card>
      ) : (
        <ScheduleTableView
          tasks={orderedTasks}
          projectId={projectId}
          onTaskClick={(task) => setSelectedTask(task)}
        />
      )}

      {/* Task Edit Panel */}
      {selectedTask && (
        <TaskEditPanel
          task={selectedTask}
          allTasks={orderedTasks}
          onClose={() => setSelectedTask(null)}
          onSave={async (updatedTask) => {
            try {
              const table = updatedTask.isChangeOrder 
                ? 'change_order_line_items' 
                : 'estimate_line_items';

              // OPTIMISTIC UPDATE: Update UI immediately
              setScheduleTasks(prev => prev.map(t => 
                t.id === updatedTask.id ? updatedTask : t
              ));

              // Update tasks for Gantt re-render
              setTasks(prev => prev.map(t => {
                if (t.id === updatedTask.id) {
                  const baseName = getBaseTaskName(updatedTask.name);
                  const newName = `${baseName} (${formatShortDate(updatedTask.start)} - ${formatShortDate(updatedTask.end)})`;
                  return {
                    ...t,
                    start: new Date(updatedTask.start),
                    end: new Date(updatedTask.end),
                    name: newName,
                    progress: updatedTask.progress
                  };
                }
                return t;
              }));

              // NOW save to database in background
              const { error } = await supabase
                .from(table)
                .update({
                  scheduled_start_date: updatedTask.start,
                  scheduled_end_date: updatedTask.end,
                  duration_days: Math.ceil((new Date(updatedTask.end).getTime() - new Date(updatedTask.start).getTime()) / (1000 * 60 * 60 * 24)) + 1,
                  dependencies: updatedTask.dependencies as any,
                  schedule_notes: updatedTask.schedule_notes
                })
                .eq('id', updatedTask.id);

              if (error) {
                // If save fails, reload to revert
                await loadScheduleTasks();
                throw error;
              }

              toast({
                title: '✓ Task Updated',
                description: 'Schedule changes saved successfully',
                duration: 3000,
              });

              setSelectedTask(null);

            } catch (error) {
              console.error('Error saving task:', error);
              toast({
                title: '✗ Save Failed',
                description: 'Could not save task changes. Please try again.',
                variant: 'destructive',
                duration: 5000,
              });
            }
          }}
        />
      )}

      {/* Export Modal */}
      <ScheduleExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        tasks={orderedTasks}
        projectName={projectName}
      />
    </div>
  );
}
