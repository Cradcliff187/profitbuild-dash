/**
 * Project Schedule View - Gantt Chart for Construction Management
 * Refactored version with proper hooks, performance optimization, and error handling
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScheduleTask, ScheduleSettings } from '@/types/schedule';

// Components
import TaskEditPanel from './TaskEditPanel';
import ScheduleWarningBanner from './ScheduleWarningBanner';
import ScheduleStats from './ScheduleStats';
import { ScheduleSkeleton } from './ScheduleSkeleton';
import { ScheduleErrorBoundary } from './ScheduleErrorBoundary';

// Custom Hooks
import { useScheduleTasks } from './hooks/useScheduleTasks';
import { useScheduleWarnings } from './hooks/useScheduleWarnings';
import { useGanttChart } from './hooks/useGanttChart';

interface ProjectScheduleViewProps {
  projectId: string;
  projectStartDate?: Date;
  projectEndDate?: Date;
}

/**
 * Main Schedule View Component
 * Displays interactive Gantt chart with construction-specific features
 */
function ProjectScheduleViewInner({ 
  projectId, 
  projectStartDate, 
  projectEndDate 
}: ProjectScheduleViewProps) {
  // State
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null);
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [settings, setSettings] = useState<ScheduleSettings>({
    showDependencies: true,
    warnings: {
      unusualSequence: true,
      dateOverlap: true,
      changeOrderTiming: true,
      resourceConflicts: true
    }
  });
  
  const { toast } = useToast();
  
  // Custom Hooks
  const {
    tasks,
    isLoading,
    error,
    loadTasks,
    updateTask,
    updateTaskDates
  } = useScheduleTasks({
    projectId,
    projectStartDate,
    projectEndDate
  });
  
  const {
    warnings,
    dismissWarning,
    warningCounts
  } = useScheduleWarnings(tasks, settings);
  
  // Handle task click
  const handleTaskClick = useCallback((task: ScheduleTask) => {
    setSelectedTask(task);
  }, []);
  
  // Handle date change from drag & drop with toast feedback
  const handleDateChange = useCallback(async (taskId: string, start: Date, end: Date) => {
    try {
      await updateTaskDates(taskId, start, end);
      
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        toast({
          title: 'Schedule Updated',
          description: `"${task.name}" rescheduled to ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Error updating task dates:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task schedule',
        variant: 'destructive'
      });
    }
  }, [tasks, updateTaskDates, toast]);
  
  // Initialize Gantt chart
  const {
    containerRef,
    isInitializing
  } = useGanttChart({
    tasks,
    viewMode,
    onTaskClick: handleTaskClick,
    onDateChange: handleDateChange
  });
  
  // Handle task save from edit panel
  const handleTaskSave = useCallback(async (updatedTask: ScheduleTask) => {
    try {
      await updateTask(updatedTask);
      setSelectedTask(null);
      
      toast({
        title: 'Task Updated',
        description: 'Schedule changes saved successfully',
        duration: 2000
      });
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: 'Error',
        description: 'Failed to save task changes',
        variant: 'destructive'
      });
    }
  }, [updateTask, toast]);
  
  // Handle warning adjustment (open edit panel for task)
  const handleWarningAdjust = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setSelectedTask(task);
    }
  }, [tasks]);
  
  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);
  
  // Memoize category legend to prevent re-renders
  const categoryLegend = useMemo(() => (
    <div className="flex gap-3 text-xs flex-wrap">
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
        <div className="w-3 h-3 rounded bg-amber-500" />
        <span>Equipment</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded" 
             style={{ background: 'repeating-linear-gradient(45deg, #ec4899, #ec4899 2px, transparent 2px, transparent 4px)' }} />
        <span>Change Order</span>
      </div>
    </div>
  ), []);
  
  // Loading state
  if (isLoading && tasks.length === 0) {
    return <ScheduleSkeleton />;
  }
  
  // Error state
  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Schedule</h3>
        <p className="text-muted-foreground mb-4">
          {error.message || 'Failed to load project schedule'}
        </p>
        <Button onClick={loadTasks}>
          Try Again
        </Button>
      </Card>
    );
  }
  
  // Empty state
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
      <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>📊 Interactive Schedule:</strong> Click tasks to edit details, drag to adjust dates, 
            resize bars to change duration. All changes save automatically.
          </p>
          {warningCounts.total > 0 && (
            <Badge variant="outline" className="shrink-0">
              {warningCounts.error > 0 && `${warningCounts.error} errors`}
              {warningCounts.warning > 0 && `${warningCounts.warning} warnings`}
              {warningCounts.error === 0 && warningCounts.warning === 0 && `${warningCounts.info} notices`}
            </Badge>
          )}
        </div>
      </Card>
      
      {/* Warnings */}
      {warnings.length > 0 && (
        <ScheduleWarningBanner
          warnings={warnings}
          onDismiss={dismissWarning}
          onAdjust={handleWarningAdjust}
        />
      )}
      
      {/* Stats */}
      <ScheduleStats tasks={tasks} />
      
      {/* Controls */}
      <Card className="p-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-2 items-center flex-wrap">
            {/* Category Legend */}
            {categoryLegend}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'Day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('Day')}
            >
              Day
            </Button>
            <Button
              variant={viewMode === 'Week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('Week')}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'Month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('Month')}
            >
              Month
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Gantt Chart */}
      <Card className="p-6 relative">
        {isInitializing && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
            <div className="text-sm text-muted-foreground">Initializing chart...</div>
          </div>
        )}
        <div 
          ref={containerRef} 
          className="gantt-container"
          style={{ minHeight: '500px' }}
        />
      </Card>
      
      {/* Task Edit Panel */}
      {selectedTask && (
        <TaskEditPanel
          task={selectedTask}
          allTasks={tasks}
          onClose={() => setSelectedTask(null)}
          onSave={handleTaskSave}
        />
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

/**
 * Exported component with error boundary
 */
export default function ProjectScheduleView(props: ProjectScheduleViewProps) {
  return (
    <ScheduleErrorBoundary onReset={() => window.location.reload()}>
      <ProjectScheduleViewInner {...props} />
    </ScheduleErrorBoundary>
  );
}

