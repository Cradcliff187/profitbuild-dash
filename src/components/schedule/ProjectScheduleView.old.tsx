import React, { useState, useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';
import '@/styles/frappe-gantt.css';
import { supabase } from '@/integrations/supabase/client';
import { ScheduleTask, ScheduleSettings, ScheduleWarning } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TaskEditPanel from './TaskEditPanel';
import ScheduleWarningBanner from './ScheduleWarningBanner';
import ScheduleStats from './ScheduleStats';

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
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null);
  const [warnings, setWarnings] = useState<ScheduleWarning[]>([]);
  const [settings, setSettings] = useState<ScheduleSettings>({
    showDependencies: true,
    warnings: {
      unusualSequence: true,
      dateOverlap: true,
      changeOrderTiming: true,
      resourceConflicts: false
    }
  });
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [isLoading, setIsLoading] = useState(true);
  const ganttRef = useRef<Gantt | null>(null);
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadScheduleTasks();
  }, [projectId]);

  useEffect(() => {
    if (tasks.length > 0 && ganttContainerRef.current) {
      // Clear previous instance
      if (ganttRef.current) {
        ganttContainerRef.current.innerHTML = '';
        ganttRef.current = null;
      }
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        initializeGantt();
      }, 50);
    }
  }, [tasks, viewMode]);

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
      const estimateTasks = convertLineItemsToTasks(
        estimate?.estimate_line_items || [],
        false
      );

      const changeOrderTasks = (changeOrders || []).flatMap((co: any) =>
        convertLineItemsToTasks(
          co.change_order_line_items || [],
          true,
          co.change_order_number
        )
      );

      const allTasks = [...estimateTasks, ...changeOrderTasks];
      setTasks(allTasks);

      // Check for warnings
      checkScheduleWarnings(allTasks);
    } catch (error) {
      console.error('Error loading schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project schedule',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const convertLineItemsToTasks = (
    lineItems: any[],
    isChangeOrder: boolean,
    coNumber?: string
  ): ScheduleTask[] => {
    return lineItems.map((item) => {
      const taskName = isChangeOrder 
        ? `CO-${coNumber}: ${item.description}`
        : item.description;

      // Use scheduled dates if available, otherwise use project dates as defaults
      const startDate = item.scheduled_start_date 
        ? new Date(item.scheduled_start_date)
        : projectStartDate 
        ? new Date(projectStartDate)
        : new Date();

      const endDate = item.scheduled_end_date
        ? new Date(item.scheduled_end_date)
        : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

      // Parse dependencies from JSONB
      let dependencies: any[] = [];
      if (item.dependencies) {
        try {
          dependencies = typeof item.dependencies === 'string' 
            ? JSON.parse(item.dependencies) 
            : item.dependencies;
        } catch (e) {
          console.warn('Failed to parse dependencies:', e);
          dependencies = [];
        }
      }

      return {
        id: item.id,
        name: taskName,
        category: item.category,
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        progress: 0, // TODO: Calculate from expenses
        dependencies: dependencies || [],
        custom_class: isChangeOrder ? 'change-order' : item.category,
        isChangeOrder,
        notes: item.schedule_notes,
        estimated_cost: item.total_cost || 0,
        actual_cost: 0, // TODO: Calculate from expenses
        change_order_number: coNumber
      };
    });
  };

  const initializeGantt = () => {
    if (!ganttContainerRef.current || tasks.length === 0) return;

    // Clear container completely to ensure clean state
    ganttContainerRef.current.innerHTML = '';

    // Convert dependencies to string format for Frappe Gantt
    const ganttTasks = tasks.map(task => ({
      ...task,
      dependencies: task.dependencies
        .map(dep => dep.task_id)
        .join(',')
    }));

    ganttRef.current = new Gantt(ganttContainerRef.current, ganttTasks, {
      view_mode: viewMode,
      date_format: 'YYYY-MM-DD',
      custom_popup_html: (task: any) => {
        const scheduleTask = tasks.find(t => t.id === task.id);
        if (!scheduleTask) return '';

        return `
          <div class="gantt-popup">
            <h5>${scheduleTask.isChangeOrder ? '🔄' : '📋'} ${task.name}</h5>
            <p><strong>Category:</strong> ${scheduleTask.category}</p>
            <p><strong>Duration:</strong> ${task.start} to ${task.end}</p>
            <p><strong>Progress:</strong> ${task.progress}%</p>
            ${task.dependencies ? `<p><strong>Dependencies:</strong> ${task.dependencies}</p>` : ''}
            <p style="font-size: 11px; color: #64748b; margin-top: 8px;">Click to edit</p>
          </div>
        `;
      },
      on_click: (task: any) => {
        const scheduleTask = tasks.find(t => t.id === task.id);
        if (scheduleTask) {
          // Close any open Gantt popups before opening edit panel
          const popups = document.querySelectorAll('.gantt-container .popup-wrapper');
          popups.forEach(popup => (popup as HTMLElement).style.display = 'none');
          setSelectedTask(scheduleTask);
        }
      },
      on_date_change: async (task: any, start: Date, end: Date) => {
        // Ensure dates are valid
        if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.error('Invalid dates in on_date_change:', { start, end });
          return;
        }
        await handleDateChange(task.id, start, end);
      },
      on_progress_change: async (task: any, progress: number) => {
        // Optional: Handle progress updates
        console.log('Progress changed:', task.id, progress);
      }
    });

    // Apply custom styling
    applyCustomStyling();
  };

  const applyCustomStyling = () => {
    setTimeout(() => {
      const bars = ganttContainerRef.current?.querySelectorAll('.bar');
      bars?.forEach(bar => {
        const taskId = bar.getAttribute('data-id');
        const task = tasks.find(t => t.id === taskId);
        if (task?.isChangeOrder) {
          bar.classList.add('change-order-bar');
        }
        if (task?.category) {
          bar.setAttribute('data-category', task.category);
        }
      });
    }, 100);
  };

  const handleDateChange = async (taskId: string, start: Date, end: Date) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // Determine which table to update
      const table = task.isChangeOrder 
        ? 'change_order_line_items' 
        : 'estimate_line_items';

      // Calculate duration
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Update database
      const { error } = await supabase
        .from(table)
        .update({
          scheduled_start_date: start.toISOString().split('T')[0],
          scheduled_end_date: end.toISOString().split('T')[0],
          duration_days: duration
        })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
          : t
      ));

      // Check for warnings
      checkScheduleWarnings(tasks);

      toast({
        title: 'Schedule Updated',
        description: `${task.name} rescheduled successfully`
      });
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task schedule',
        variant: 'destructive'
      });
    }
  };

  const checkScheduleWarnings = (tasksToCheck: ScheduleTask[]) => {
    const newWarnings: ScheduleWarning[] = [];

    tasksToCheck.forEach(task => {
      // Check for unusual sequences (e.g., painting before drywall)
      if (settings.warnings.unusualSequence) {
        const sequenceWarning = checkUnusualSequence(task, tasksToCheck);
        if (sequenceWarning) newWarnings.push(sequenceWarning);
      }

      // Check for date overlaps with dependencies
      if (settings.warnings.dateOverlap) {
        const overlapWarning = checkDependencyOverlap(task, tasksToCheck);
        if (overlapWarning) newWarnings.push(overlapWarning);
      }

      // Check change order timing
      if (settings.warnings.changeOrderTiming && task.isChangeOrder) {
        const coWarning = checkChangeOrderTiming(task, tasksToCheck);
        if (coWarning) newWarnings.push(coWarning);
      }
    });

    setWarnings(newWarnings);
  };

  const checkUnusualSequence = (task: ScheduleTask, allTasks: ScheduleTask[]): ScheduleWarning | null => {
    // Example: Check if painting before drywall
    const taskDescription = task.name.toLowerCase();
    
    if (taskDescription.includes('paint')) {
      const drywallTask = allTasks.find(t => 
        t.name.toLowerCase().includes('drywall') && !t.isChangeOrder
      );
      
      if (drywallTask) {
        const hasDrywallDependency = task.dependencies.some(d => d.task_id === drywallTask.id);
        const taskStart = new Date(task.start);
        const drywallEnd = new Date(drywallTask.end);
        
        if (!hasDrywallDependency && taskStart < drywallEnd) {
          return {
            id: `warning-${task.id}-sequence`,
            severity: 'warning',
            message: `"${task.name}" is scheduled before drywall is complete. This is unusual but allowed.`,
            task_id: task.id,
            task_name: task.name,
            suggestion: 'Consider adding drywall as a dependency',
            canDismiss: true
          };
        }
      }
    }

    return null;
  };

  const checkDependencyOverlap = (task: ScheduleTask, allTasks: ScheduleTask[]): ScheduleWarning | null => {
    if (task.dependencies.length === 0) return null;

    const taskStart = new Date(task.start);
    
    for (const dep of task.dependencies) {
      const depTask = allTasks.find(t => t.id === dep.task_id);
      if (!depTask) continue;

      const depEnd = new Date(depTask.end);
      
      if (taskStart < depEnd) {
        return {
          id: `warning-${task.id}-overlap`,
          severity: 'warning',
          message: `"${task.name}" starts before dependency "${dep.task_name}" finishes.`,
          task_id: task.id,
          task_name: task.name,
          suggestion: 'Adjust start date or remove dependency',
          canDismiss: true
        };
      }
    }

    return null;
  };

  const checkChangeOrderTiming = (task: ScheduleTask, allTasks: ScheduleTask[]): ScheduleWarning | null => {
    // Check if CO is scheduled very early compared to related base work
    const taskStart = new Date(task.start);
    const relatedBaseTasks = allTasks.filter(t => 
      !t.isChangeOrder && 
      t.category === task.category
    );

    if (relatedBaseTasks.length > 0) {
      const earliestBaseTask = relatedBaseTasks.reduce((earliest, current) => 
        new Date(current.start) < new Date(earliest.start) ? current : earliest
      );

      const baseStart = new Date(earliestBaseTask.start);
      
      if (taskStart < baseStart) {
        return {
          id: `warning-${task.id}-co-timing`,
          severity: 'info',
          message: `Change order "${task.name}" is scheduled before related base work. Verify this is correct.`,
          task_id: task.id,
          task_name: task.name,
          canDismiss: true
        };
      }
    }

    return null;
  };

  const handleTaskUpdate = async (updatedTask: ScheduleTask) => {
    try {
      const table = updatedTask.isChangeOrder 
        ? 'change_order_line_items' 
        : 'estimate_line_items';

      // Calculate duration
      const startDate = new Date(updatedTask.start);
      const endDate = new Date(updatedTask.end);
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const { error } = await supabase
        .from(table)
        .update({
          scheduled_start_date: updatedTask.start,
          scheduled_end_date: updatedTask.end,
          duration_days: duration,
          dependencies: updatedTask.dependencies,
          schedule_notes: updatedTask.notes
        })
        .eq('id', updatedTask.id);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

      // Refresh Gantt
      if (ganttRef.current) {
        loadScheduleTasks();
      }

      setSelectedTask(null);

      toast({
        title: 'Task Updated',
        description: 'Schedule changes saved successfully'
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to save task changes',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
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
          <strong>📊 Interactive Schedule:</strong> Click tasks to edit, drag to adjust dates, 
          resize to change duration. All changes save automatically.
        </p>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <ScheduleWarningBanner
          warnings={warnings}
          onDismiss={(warningId) => setWarnings(prev => prev.filter(w => w.id !== warningId))}
          onAdjust={(taskId) => {
            const task = tasks.find(t => t.id === taskId);
            if (task) setSelectedTask(task);
          }}
        />
      )}

      {/* Stats */}
      <ScheduleStats tasks={tasks} />

      {/* Controls */}
      <Card className="p-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-2 items-center flex-wrap">
            {/* Category Legend */}
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>Labor</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span>Subs</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Materials</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" 
                     style={{ background: 'repeating-linear-gradient(45deg, #ec4899, #ec4899 2px, transparent 2px, transparent 4px)' }} />
                <span>Change Order</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'Day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode('Day');
                // Force re-initialization for Day view to ensure proper rendering
                if (ganttContainerRef.current) {
                  setTimeout(() => {
                    if (ganttRef.current) {
                      ganttRef.current.change_view_mode('Day');
                    }
                  }, 100);
                }
              }}
            >
              Day
            </Button>
            <Button
              variant={viewMode === 'Week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode('Week');
                if (ganttRef.current) {
                  ganttRef.current.change_view_mode('Week');
                }
              }}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'Month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode('Month');
                if (ganttRef.current) {
                  ganttRef.current.change_view_mode('Month');
                }
              }}
            >
              Month
            </Button>
          </div>
        </div>
      </Card>

      {/* Gantt Chart */}
      <Card className="p-6">
        <div 
          ref={ganttContainerRef} 
          className="gantt-container"
          style={{ minHeight: '500px' }}
        />
      </Card>

      {/* Task Edit Panel - Higher z-index than Gantt popups */}
      {selectedTask && (
        <div className="relative z-[60]">
          <TaskEditPanel
            task={selectedTask}
            allTasks={tasks}
            onClose={() => setSelectedTask(null)}
            onSave={handleTaskUpdate}
          />
        </div>
      )}

      {/* SVG Pattern Definition for change order stripes */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <pattern id="diagonal-stripe" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <rect width="4" height="8" fill="#ec4899" opacity="0.6"/>
          </pattern>
        </defs>
      </svg>
    </div>
  );
}

