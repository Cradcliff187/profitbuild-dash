# Gantt Chart Schedule Implementation - AI Agent Instructions

## Project Context
You are implementing a drag-and-drop Gantt chart schedule view for ProfitBuild, a construction profit tracking application. This feature will be added to the Project Details page and will display all line items from approved estimates plus approved change orders as schedulable tasks on a timeline.

## Core Requirements
- **Manual Flexibility**: No automation, users control all scheduling
- **Soft Warnings**: Non-blocking warnings for unusual sequences
- **Change Orders**: Fully integrated with estimate line items
- **Mobile-First**: Must work well on mobile PWA
- **Dependencies**: User-defined task dependencies with visual arrows

---

## Phase 1: Database Schema Updates

### Task 1.1: Create Migration for Schedule Fields

Create a new Supabase migration file that adds scheduling fields to both `estimate_line_items` and `change_order_line_items` tables.

**File**: `supabase/migrations/[timestamp]_add_schedule_fields.sql`

```sql
-- Add scheduling fields to estimate_line_items
ALTER TABLE public.estimate_line_items
ADD COLUMN IF NOT EXISTS scheduled_start_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_end_date DATE,
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS schedule_notes TEXT;

-- Add same fields to change_order_line_items
ALTER TABLE public.change_order_line_items
ADD COLUMN IF NOT EXISTS scheduled_start_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_end_date DATE,
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS schedule_notes TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_scheduled_dates 
  ON public.estimate_line_items(scheduled_start_date, scheduled_end_date);

CREATE INDEX IF NOT EXISTS idx_change_order_line_items_scheduled_dates 
  ON public.change_order_line_items(scheduled_start_date, scheduled_end_date);

-- Add comments for documentation
COMMENT ON COLUMN public.estimate_line_items.scheduled_start_date IS 'User-defined start date for this task in project schedule';
COMMENT ON COLUMN public.estimate_line_items.scheduled_end_date IS 'User-defined or calculated end date for this task';
COMMENT ON COLUMN public.estimate_line_items.duration_days IS 'Number of calendar days for task completion';
COMMENT ON COLUMN public.estimate_line_items.dependencies IS 'JSON array of task IDs that must complete before this task can start: [{"task_id": "uuid", "task_name": "string", "type": "finish-to-start"}]';
COMMENT ON COLUMN public.estimate_line_items.schedule_notes IS 'User notes about scheduling considerations for this task';
```

**Acceptance Criteria**:
- Migration runs without errors
- All columns added successfully
- Indexes created for query performance
- Works with existing RLS policies

---

## Phase 2: TypeScript Types

### Task 2.1: Create Schedule Types

**File**: `src/types/schedule.ts`

```typescript
export interface TaskDependency {
  task_id: string;
  task_name: string;
  task_type: 'estimate' | 'change_order';
  type: 'finish-to-start'; // Can extend later: 'start-to-start', 'finish-to-finish'
}

export interface ScheduleTask {
  id: string;
  name: string; // description field
  category: string;
  start: string; // ISO date string
  end: string; // ISO date string
  progress: number; // 0-100, calculated from expenses
  dependencies: TaskDependency[];
  custom_class: string; // for Gantt styling
  isChangeOrder: boolean;
  notes?: string;
  
  // Additional metadata
  estimated_cost: number;
  actual_cost: number;
  payee_id?: string;
  payee_name?: string;
}

export interface ScheduleWarning {
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  task_id: string;
  task_name: string;
  suggestion?: string;
  canDismiss: boolean;
}

export interface ScheduleSettings {
  showDependencies: boolean;
  warnings: {
    unusualSequence: boolean;
    dateOverlap: boolean;
    changeOrderTiming: boolean;
    resourceConflicts: boolean;
  };
}
```

### Task 2.2: Update Existing Types

**File**: `src/types/estimate.ts`

Add to existing `LineItem` interface:
```typescript
export interface LineItem {
  // ... existing fields ...
  
  // Schedule fields
  scheduled_start_date?: Date | null;
  scheduled_end_date?: Date | null;
  duration_days?: number | null;
  dependencies?: TaskDependency[];
  is_milestone?: boolean;
  schedule_notes?: string | null;
}
```

**File**: `src/types/changeOrder.ts`

Add to existing change order line item type:
```typescript
export interface ChangeOrderLineItem {
  // ... existing fields ...
  
  // Schedule fields
  scheduled_start_date?: Date | null;
  scheduled_end_date?: Date | null;
  duration_days?: number | null;
  dependencies?: TaskDependency[];
  is_milestone?: boolean;
  schedule_notes?: string | null;
}
```

---

## Phase 3: Install Dependencies

### Task 3.1: Install Frappe Gantt

```bash
npm install frappe-gantt
npm install --save-dev @types/frappe-gantt
```

**Note**: If @types/frappe-gantt doesn't exist, create a type declaration file.

**File**: `src/types/frappe-gantt.d.ts`

```typescript
declare module 'frappe-gantt' {
  export interface Task {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
    [key: string]: any;
  }

  export interface GanttOptions {
    view_mode?: 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month';
    date_format?: string;
    custom_popup_html?: (task: Task) => string;
    on_click?: (task: Task) => void;
    on_date_change?: (task: Task, start: Date, end: Date) => void;
    on_progress_change?: (task: Task, progress: number) => void;
    on_view_change?: (mode: string) => void;
  }

  export default class Gantt {
    constructor(element: string | HTMLElement, tasks: Task[], options?: GanttOptions);
    change_view_mode(mode: string): void;
    refresh(tasks: Task[]): void;
  }
}
```

---

## Phase 4: Core Components

### Task 4.1: Create ProjectScheduleView Component

**File**: `src/components/ProjectScheduleView.tsx`

```typescript
import React, { useState, useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';
import { supabase } from '@/integrations/supabase/client';
import { ScheduleTask, ScheduleSettings, ScheduleWarning } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, Settings } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Week');
  const [isLoading, setIsLoading] = useState(true);
  const ganttRef = useRef<Gantt | null>(null);
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadScheduleTasks();
  }, [projectId]);

  useEffect(() => {
    if (tasks.length > 0 && ganttContainerRef.current) {
      initializeGantt();
    }
  }, [tasks]);

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
    return lineItems.map((item, index) => {
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

      return {
        id: item.id,
        name: taskName,
        category: item.category,
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        progress: 0, // TODO: Calculate from expenses
        dependencies: item.dependencies || [],
        custom_class: isChangeOrder ? 'change-order' : item.category,
        isChangeOrder,
        notes: item.schedule_notes,
        estimated_cost: item.total_cost || 0,
        actual_cost: 0, // TODO: Calculate from expenses
      };
    });
  };

  const initializeGantt = () => {
    if (!ganttContainerRef.current || tasks.length === 0) return;

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
          setSelectedTask(scheduleTask);
        }
      },
      on_date_change: async (task: any, start: Date, end: Date) => {
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
      checkTaskWarnings(taskId);

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

  const checkScheduleWarnings = (tasks: ScheduleTask[]) => {
    const newWarnings: ScheduleWarning[] = [];

    tasks.forEach(task => {
      // Check for unusual sequences (e.g., painting before drywall)
      if (settings.warnings.unusualSequence) {
        const sequenceWarning = checkUnusualSequence(task, tasks);
        if (sequenceWarning) newWarnings.push(sequenceWarning);
      }

      // Check for date overlaps with dependencies
      if (settings.warnings.dateOverlap) {
        const overlapWarning = checkDependencyOverlap(task, tasks);
        if (overlapWarning) newWarnings.push(overlapWarning);
      }

      // Check change order timing
      if (settings.warnings.changeOrderTiming && task.isChangeOrder) {
        const coWarning = checkChangeOrderTiming(task, tasks);
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

  const checkTaskWarnings = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    checkScheduleWarnings([task]);
  };

  const handleTaskUpdate = async (updatedTask: ScheduleTask) => {
    try {
      const table = updatedTask.isChangeOrder 
        ? 'change_order_line_items' 
        : 'estimate_line_items';

      const { error } = await supabase
        .from(table)
        .update({
          scheduled_start_date: updatedTask.start,
          scheduled_end_date: updatedTask.end,
          duration_days: updatedTask.dependencies.length,
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
                ganttRef.current?.change_view_mode('Day');
              }}
            >
              Day
            </Button>
            <Button
              variant={viewMode === 'Week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode('Week');
                ganttRef.current?.change_view_mode('Week');
              }}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'Month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode('Month');
                ganttRef.current?.change_view_mode('Month');
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

      {/* Task Edit Panel */}
      {selectedTask && (
        <TaskEditPanel
          task={selectedTask}
          allTasks={tasks}
          onClose={() => setSelectedTask(null)}
          onSave={handleTaskUpdate}
        />
      )}

      <style>{`
        .gantt-container .bar[data-category="labor_internal"] { fill: #3b82f6; }
        .gantt-container .bar[data-category="subcontractors"] { fill: #8b5cf6; }
        .gantt-container .bar[data-category="materials"] { fill: #10b981; }
        .gantt-container .bar[data-category="equipment"] { fill: #f59e0b; }
        .gantt-container .bar[data-category="permits"] { fill: #ef4444; }
        .gantt-container .bar[data-category="management"] { fill: #6366f1; }
        
        .gantt-container .bar.change-order-bar {
          fill: url(#diagonal-stripe);
          stroke: #ec4899;
          stroke-width: 2;
        }
        
        .gantt-popup {
          padding: 12px;
          font-size: 13px;
        }
        
        .gantt-popup h5 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .gantt-popup p {
          margin: 4px 0;
        }
      `}</style>

      {/* SVG Pattern Definition */}
      <svg width="0" height="0">
        <defs>
          <pattern id="diagonal-stripe" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <rect width="4" height="8" fill="#ec4899" opacity="0.6"/>
          </pattern>
        </defs>
      </svg>
    </div>
  );
}
```

**Acceptance Criteria**:
- Component renders without errors
- Loads estimate and change order line items
- Displays Gantt chart with proper styling
- Handles drag/drop date changes
- Shows category-based colors
- Change orders have striped pattern

---

### Task 4.2: Create TaskEditPanel Component

**File**: `src/components/TaskEditPanel.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { ScheduleTask, TaskDependency } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

interface TaskEditPanelProps {
  task: ScheduleTask;
  allTasks: ScheduleTask[];
  onClose: () => void;
  onSave: (task: ScheduleTask) => void;
}

export default function TaskEditPanel({ task, allTasks, onClose, onSave }: TaskEditPanelProps) {
  const [editedTask, setEditedTask] = useState<ScheduleTask>(task);
  const [startDate, setStartDate] = useState(task.start);
  const [duration, setDuration] = useState(
    Math.ceil((new Date(task.end).getTime() - new Date(task.start).getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  useEffect(() => {
    // Calculate end date when start or duration changes
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + duration - 1);
    
    setEditedTask(prev => ({
      ...prev,
      start: startDate,
      end: end.toISOString().split('T')[0]
    }));
  }, [startDate, duration]);

  const handleDependencyToggle = (taskId: string) => {
    const dependencyTask = allTasks.find(t => t.id === taskId);
    if (!dependencyTask) return;

    const exists = editedTask.dependencies.some(d => d.task_id === taskId);

    if (exists) {
      setEditedTask(prev => ({
        ...prev,
        dependencies: prev.dependencies.filter(d => d.task_id !== taskId)
      }));
    } else {
      const newDep: TaskDependency = {
        task_id: taskId,
        task_name: dependencyTask.name,
        task_type: dependencyTask.isChangeOrder ? 'change_order' : 'estimate',
        type: 'finish-to-start'
      };
      setEditedTask(prev => ({
        ...prev,
        dependencies: [...prev.dependencies, newDep]
      }));
    }
  };

  const handleSave = () => {
    onSave(editedTask);
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Task</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Task Name */}
          <div>
            <Label>Task Name</Label>
            <Input value={editedTask.name} disabled className="bg-muted" />
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={editedTask.isChangeOrder ? "destructive" : "secondary"}>
                {editedTask.isChangeOrder ? 'Change Order' : editedTask.category}
              </Badge>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Duration */}
          <div>
            <Label htmlFor="duration">Duration (days)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
              className="mt-2"
            />
          </div>

          {/* End Date (Read-only) */}
          <div>
            <Label>End Date</Label>
            <Input 
              value={editedTask.end} 
              disabled 
              className="bg-muted mt-2"
            />
          </div>

          {/* Dependencies */}
          <div>
            <Label>Dependencies (Optional)</Label>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              Select tasks that must finish before this one can start
            </p>
            <div className="border rounded-md max-h-60 overflow-y-auto">
              {allTasks
                .filter(t => t.id !== task.id)
                .map(t => {
                  const isChecked = editedTask.dependencies.some(d => d.task_id === t.id);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => handleDependencyToggle(t.id)}
                    >
                      <Checkbox checked={isChecked} />
                      <div className="flex-1 text-sm">
                        {t.name}
                      </div>
                      <Badge 
                        variant={t.isChangeOrder ? "outline" : "secondary"}
                        className="text-xs"
                      >
                        {t.isChangeOrder ? 'CO' : t.category.substring(0, 3).toUpperCase()}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Hint Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>💡 Tips:</strong> Dependencies are optional and flexible. 
              We'll show warnings for unusual sequences, but you're free to schedule however you need.
            </p>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Schedule Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={editedTask.notes || ''}
              onChange={(e) => setEditedTask(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special scheduling considerations..."
              className="mt-2"
              rows={3}
            />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

**Acceptance Criteria**:
- Panel slides in from right
- Shows all task details
- Duration auto-calculates end date
- Dependency checkboxes work
- Save button updates task

---

### Task 4.3: Create ScheduleWarningBanner Component

**File**: `src/components/ScheduleWarningBanner.tsx`

```typescript
import React from 'react';
import { ScheduleWarning } from '@/types/schedule';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ScheduleWarningBannerProps {
  warnings: ScheduleWarning[];
  onDismiss: (warningId: string) => void;
  onAdjust: (taskId: string) => void;
}

export default function ScheduleWarningBanner({ warnings, onDismiss, onAdjust }: ScheduleWarningBannerProps) {
  if (warnings.length === 0) return null;

  const getIcon = (severity: ScheduleWarning['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = (severity: ScheduleWarning['severity']) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
    }
  };

  return (
    <div className="space-y-2">
      {warnings.map(warning => (
        <Alert key={warning.id} variant={getVariant(warning.severity)}>
          {getIcon(warning.severity)}
          <AlertTitle className="flex items-center justify-between">
            <span>Scheduling Notice</span>
            {warning.canDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onDismiss(warning.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </AlertTitle>
          <AlertDescription>
            <p className="mb-2">{warning.message}</p>
            {warning.suggestion && (
              <p className="text-sm opacity-80 mb-2">Suggestion: {warning.suggestion}</p>
            )}
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onDismiss(warning.id)}
              >
                Dismiss
              </Button>
              <Button 
                size="sm"
                onClick={() => onAdjust(warning.task_id)}
              >
                Adjust Schedule
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

**Acceptance Criteria**:
- Shows warnings with appropriate severity colors
- Dismiss button works
- Adjust button opens task edit panel
- Multiple warnings can display

---

### Task 4.4: Create ScheduleStats Component

**File**: `src/components/ScheduleStats.tsx`

```typescript
import React from 'react';
import { ScheduleTask } from '@/types/schedule';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CheckCircle2, TrendingDown, AlertTriangle } from 'lucide-react';

interface ScheduleStatsProps {
  tasks: ScheduleTask[];
}

export default function ScheduleStats({ tasks }: ScheduleStatsProps) {
  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.progress === 100).length;
  const inProgressTasks = tasks.filter(t => t.progress > 0 && t.progress < 100).length;
  
  // Calculate schedule variance
  const today = new Date();
  const overdueTasks = tasks.filter(t => {
    const endDate = new Date(t.end);
    return endDate < today && t.progress < 100;
  }).length;

  // Calculate project duration
  const dates = tasks.map(t => ({ start: new Date(t.start), end: new Date(t.end) }));
  const earliestStart = dates.length > 0 
    ? new Date(Math.min(...dates.map(d => d.start.getTime())))
    : null;
  const latestEnd = dates.length > 0
    ? new Date(Math.max(...dates.map(d => d.end.getTime())))
    : null;
  
  const totalDuration = earliestStart && latestEnd
    ? Math.ceil((latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  // Calculate critical path items (tasks with no slack)
  const criticalPathItems = tasks.filter(t => t.dependencies.length > 0).length;

  const stats = [
    {
      label: 'Total Duration',
      value: `${totalDuration} days`,
      icon: Calendar,
      color: 'text-blue-600'
    },
    {
      label: 'Tasks Completed',
      value: `${completedTasks} of ${totalTasks}`,
      icon: CheckCircle2,
      color: 'text-green-600'
    },
    {
      label: 'Schedule Status',
      value: overdueTasks > 0 ? `${overdueTasks} overdue` : 'On Track',
      icon: overdueTasks > 0 ? AlertTriangle : TrendingDown,
      color: overdueTasks > 0 ? 'text-red-600' : 'text-green-600'
    },
    {
      label: 'Critical Path Items',
      value: `${criticalPathItems} tasks`,
      icon: AlertTriangle,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Acceptance Criteria**:
- Shows 4 key stats in grid
- Calculates duration from tasks
- Shows completed count
- Identifies overdue tasks
- Responsive on mobile

---

## Phase 5: Integration

### Task 5.1: Add Schedule Tab to ProjectDetailView

**File**: `src/components/ProjectDetailView.tsx`

Find the tabs section and add the Schedule tab:

```typescript
// Add to imports
import ProjectScheduleView from './ProjectScheduleView';

// In the tabs section, add:
<div className="tab" onClick={() => setActiveTab('schedule')}>Schedule</div>

// In the tab content rendering section, add:
{activeTab === 'schedule' && (
  <ProjectScheduleView
    projectId={projectId}
    projectStartDate={project.start_date}
    projectEndDate={project.end_date}
  />
)}
```

**Acceptance Criteria**:
- Schedule tab appears in navigation
- Only shows when project has approved estimate
- Tab switches to schedule view
- Passes project dates to component

---

### Task 5.2: Add Schedule Styling

**File**: `src/index.css` (or create `src/styles/gantt.css`)

```css
/* Gantt Chart Custom Styles */
.gantt-container {
  position: relative;
  overflow-x: auto;
  overflow-y: visible;
}

.gantt .bar {
  cursor: move;
  transition: opacity 0.2s;
}

.gantt .bar-wrapper:hover .bar {
  opacity: 0.9;
}

.gantt .bar-label {
  font-size: 12px;
  font-weight: 500;
}

.gantt .arrow {
  stroke: #94a3b8;
  stroke-width: 1.5;
}

/* Category Colors */
.gantt .bar[data-category="labor_internal"] {
  fill: #3b82f6;
}

.gantt .bar[data-category="subcontractors"] {
  fill: #8b5cf6;
}

.gantt .bar[data-category="materials"] {
  fill: #10b981;
}

.gantt .bar[data-category="equipment"] {
  fill: #f59e0b;
}

.gantt .bar[data-category="permits"] {
  fill: #ef4444;
}

.gantt .bar[data-category="management"] {
  fill: #6366f1;
}

.gantt .bar.change-order-bar {
  fill: url(#diagonal-stripe);
  stroke: #ec4899;
  stroke-width: 2;
}

/* Gantt Popup */
.gantt-popup {
  padding: 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 300px;
}

.gantt-popup h5 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #0f172a;
}

.gantt-popup p {
  margin: 4px 0;
  font-size: 13px;
  color: #475569;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .gantt-container {
    font-size: 11px;
  }
  
  .gantt .bar-label {
    font-size: 10px;
  }
  
  .gantt-popup {
    max-width: 250px;
    padding: 10px;
  }
}
```

**Acceptance Criteria**:
- Colors match design
- Change orders have stripe pattern
- Responsive on mobile
- Hover effects work

---

## Phase 6: Testing & Polish

### Task 6.1: Add Loading States

Ensure all components handle loading gracefully:
- Show skeleton while fetching data
- Handle empty states
- Show errors appropriately

### Task 6.2: Mobile Testing

Test on mobile devices:
- Gantt chart scrolls horizontally
- Side panel slides in properly
- Touch targets are large enough
- Works offline (PWA)

### Task 6.3: Performance Optimization

- Lazy load Gantt library
- Debounce drag events
- Memoize calculations
- Virtual scrolling for long task lists (if needed)

---

## Phase 7: Documentation

### Task 7.1: Update README

Add section about schedule feature:
- How to access schedule view
- How dependencies work
- Warning system explanation
- Known limitations

### Task 7.2: Add Comments

Add JSDoc comments to key functions:
```typescript
/**
 * Converts estimate and change order line items to ScheduleTask format
 * @param lineItems - Array of line items from database
 * @param isChangeOrder - Whether these are from a change order
 * @param coNumber - Change order number (if applicable)
 * @returns Array of ScheduleTask objects ready for Gantt chart
 */
```

---

## Testing Checklist

Before marking complete, verify:

- [ ] Database migration runs successfully
- [ ] Types compile without errors
- [ ] Gantt chart displays all tasks
- [ ] Click task opens edit panel
- [ ] Drag task updates database
- [ ] Dependencies show as arrows
- [ ] Change orders have stripe pattern
- [ ] Warnings display correctly
- [ ] Mobile view works properly
- [ ] Offline mode supported
- [ ] Performance is acceptable (< 1s load time)

---

## Known Limitations & Future Enhancements

Document these for future work:

1. **Progress Tracking**: Currently hardcoded, needs expense integration
2. **Critical Path**: Not yet calculated, shows task count only
3. **Resource Allocation**: Not implemented in MVP
4. **Baseline vs Actual**: No comparison view yet
5. **Export**: PDF export is placeholder
6. **Undo/Redo**: Not implemented
7. **Bulk Operations**: Can't select multiple tasks

---

## Rollback Plan

If issues arise:

1. Disable Schedule tab in UI
2. Roll back migration (create down migration)
3. Remove route from navigation
4. Keep code in feature branch

---

## Success Metrics

Track these post-launch:

- % of projects with scheduled tasks
- Average time to create schedule
- Number of dependency changes per project
- Warning dismiss rate
- Mobile vs desktop usage

---

## Support Resources

- Frappe Gantt Docs: https://frappe.io/gantt
- Supabase Docs: https://supabase.com/docs
- shadcn/ui Components: https://ui.shadcn.com/

---

## Questions to Resolve Before Starting

1. Should we auto-schedule new change orders or leave unscheduled?
2. What's the default duration for tasks without dates?
3. Should dependencies be copied when duplicating estimates?
4. Do we need audit trail for schedule changes?
5. Should we send notifications when schedule changes affect dependencies?

---

## Implementation Order Summary

1. ✅ Phase 1: Database (30 min)
2. ✅ Phase 2: Types (20 min)
3. ✅ Phase 3: Dependencies (10 min)
4. ✅ Phase 4: Core Components (3-4 hours)
5. ✅ Phase 5: Integration (1 hour)
6. ✅ Phase 6: Testing (2 hours)
7. ✅ Phase 7: Documentation (30 min)

**Total Estimated Time: 8-10 hours**

---

## Post-Implementation

After core feature is working:

1. Gather user feedback
2. Monitor usage analytics
3. Iterate on warning logic
4. Add requested features
5. Optimize performance

---

END OF INSTRUCTIONS
