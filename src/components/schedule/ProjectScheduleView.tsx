import React, { useState, useEffect } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Calendar, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TaskEditPanel from './TaskEditPanel';
import ScheduleWarningBanner from './ScheduleWarningBanner';
import ScheduleStats from './ScheduleStats';
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
  const [isLoading, setIsLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [projectName, setProjectName] = useState<string>('Project');
  const { toast } = useToast();
  const { getTaskProgress, isLoading: progressLoading } = useProgressTracking(projectId);

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

      const startDate = item.scheduled_start_date 
        ? new Date(item.scheduled_start_date)
        : projectStartDate 
        ? new Date(projectStartDate)
        : new Date();

      const endDate = item.scheduled_end_date
        ? new Date(item.scheduled_end_date)
        : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

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
        notes: item.schedule_notes,
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

    return scheduleTasks.map((task, index) => {
      const start = new Date(task.start);
      const end = new Date(task.end);

      // Add date range to task name for display
      const taskNameWithDates = `${task.name} (${formatShortDate(task.start)} - ${formatShortDate(task.end)})`;

      return {
        start,
        end,
        name: taskNameWithDates,  // Shows: "Flooring (Nov 8 - Nov 16)"
        id: task.id,
        type: 'task',
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

    // FIX 4: Find the updated task with latest dates
    const scheduleTask = scheduleTasks.find(t => t.id === task.id);
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

  if (isLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading project schedule...</p>
        </div>
      </div>
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
          <strong>📊 Interactive Schedule:</strong> Drag tasks to adjust dates. 
          Double-click tasks to edit details and dependencies.
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
          <div className="flex gap-2">
            <Button
              variant={viewMode === ViewMode.Day ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(ViewMode.Day)}
            >
              Day
            </Button>
            <Button
              variant={viewMode === ViewMode.Week ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(ViewMode.Week)}
            >
              Week
            </Button>
            <Button
              variant={viewMode === ViewMode.Month ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(ViewMode.Month)}
            >
              Month
            </Button>
          </div>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Schedule
          </Button>
        </div>
      </Card>

      {/* Gantt Chart */}
      <Card className="p-6 overflow-x-auto">
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

      {/* Task Edit Panel */}
      {selectedTask && (
        <TaskEditPanel
          task={selectedTask}
          allTasks={scheduleTasks}
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
                  dependencies: updatedTask.dependencies,
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
        tasks={scheduleTasks}
        projectName={projectName}
      />
    </div>
  );
}
