# CURSOR AGENT INSTRUCTIONS: Fix Gantt Chart Implementation

## MISSION
Replace broken frappe-gantt implementation with working, free gantt-task-react library and fix all database query issues.

## CONTEXT
- User's Gantt chart shows black box and doesn't work
- Database queries are failing because of schema mismatch
- frappe-gantt has React DOM issues
- Need 100% free solution that actually works

---

## PHASE 1: REMOVE BROKEN CODE

### Step 1.1: Uninstall frappe-gantt
```bash
npm uninstall frappe-gantt
```

### Step 1.2: Install gantt-task-react (free, React-native)
```bash
npm install gantt-task-react
```

---

## PHASE 2: FIX DATABASE QUERIES

### Step 2.1: Fix useProgressTracking Hook

**File:** `src/components/schedule/hooks/useProgressTracking.ts`

**PROBLEM:** Queries `expenses.line_item_id` which doesn't exist. Should use `expense_line_item_correlations` table.

**REPLACE ENTIRE FILE WITH:**

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TaskProgress {
  taskId: string;
  progress: number; // 0-100
  actualCost: number;
  estimatedCost: number;
}

export function useProgressTracking(projectId: string) {
  const [taskProgress, setTaskProgress] = useState<Map<string, TaskProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgressData();
  }, [projectId]);

  const loadProgressData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all estimate line items with their costs
      const { data: estimateItems, error: estimateError } = await supabase
        .from('estimate_line_items')
        .select(`
          id,
          total_cost,
          estimate_id,
          estimates!inner (
            project_id,
            status
          )
        `)
        .eq('estimates.project_id', projectId)
        .eq('estimates.status', 'approved');

      if (estimateError) throw estimateError;

      // Get change order line items
      const { data: coItems, error: coError } = await supabase
        .from('change_order_line_items')
        .select(`
          id,
          total_cost,
          change_order_id,
          change_orders!inner (
            project_id,
            status
          )
        `)
        .eq('change_orders.project_id', projectId)
        .eq('change_orders.status', 'approved');

      if (coError) throw coError;

      // Get expense correlations to calculate actual costs
      // Using the correlations table since expenses don't have direct line_item_id
      const { data: correlations, error: correlationError } = await supabase
        .from('expense_line_item_correlations')
        .select(`
          estimate_line_item_id,
          change_order_line_item_id,
          allocated_amount,
          expenses!inner (
            project_id,
            amount
          )
        `)
        .eq('expenses.project_id', projectId);

      if (correlationError) throw correlationError;

      // Calculate progress for each task
      const progressMap = new Map<string, TaskProgress>();

      // Process estimate line items
      (estimateItems || []).forEach(item => {
        const estimatedCost = item.total_cost || 0;
        
        // Sum up allocated expenses for this line item
        const actualCost = (correlations || [])
          .filter(c => c.estimate_line_item_id === item.id)
          .reduce((sum, c) => sum + (c.allocated_amount || 0), 0);

        const progress = estimatedCost > 0 
          ? Math.min(100, Math.round((actualCost / estimatedCost) * 100))
          : 0;

        progressMap.set(item.id, {
          taskId: item.id,
          progress,
          actualCost,
          estimatedCost
        });
      });

      // Process change order line items
      (coItems || []).forEach(item => {
        const estimatedCost = item.total_cost || 0;
        
        const actualCost = (correlations || [])
          .filter(c => c.change_order_line_item_id === item.id)
          .reduce((sum, c) => sum + (c.allocated_amount || 0), 0);

        const progress = estimatedCost > 0 
          ? Math.min(100, Math.round((actualCost / estimatedCost) * 100))
          : 0;

        progressMap.set(item.id, {
          taskId: item.id,
          progress,
          actualCost,
          estimatedCost
        });
      });

      setTaskProgress(progressMap);
    } catch (err) {
      console.error('Error loading progress data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress');
    } finally {
      setIsLoading(false);
    }
  };

  const getTaskProgress = (taskId: string): number => {
    return taskProgress.get(taskId)?.progress || 0;
  };

  const getTaskActualCost = (taskId: string): number => {
    return taskProgress.get(taskId)?.actualCost || 0;
  };

  return {
    taskProgress,
    getTaskProgress,
    getTaskActualCost,
    isLoading,
    error,
    refetch: loadProgressData
  };
}
```

---

## PHASE 3: REBUILD GANTT COMPONENT

### Step 3.1: Replace ProjectScheduleView Component

**File:** `src/components/schedule/ProjectScheduleView.tsx`

**REPLACE ENTIRE FILE WITH:**

```typescript
import React, { useState, useEffect } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TaskEditPanel from './TaskEditPanel';
import ScheduleWarningBanner from './ScheduleWarningBanner';
import ScheduleStats from './ScheduleStats';
import { useProgressTracking } from './hooks/useProgressTracking';
import { ScheduleTask, ScheduleWarning } from '@/types/schedule';

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
  const { toast } = useToast();
  const { getTaskProgress, isLoading: progressLoading } = useProgressTracking(projectId);

  useEffect(() => {
    loadScheduleTasks();
  }, [projectId]);

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
      toast({
        title: 'Error',
        description: 'Failed to load project schedule',
        variant: 'destructive'
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
    return scheduleTasks.map((task, index) => {
      const start = new Date(task.start);
      const end = new Date(task.end);

      return {
        start,
        end,
        name: task.name,
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
    try {
      const scheduleTask = scheduleTasks.find(t => t.id === task.id);
      if (!scheduleTask) return;

      const table = scheduleTask.isChangeOrder 
        ? 'change_order_line_items' 
        : 'estimate_line_items';

      const duration = Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const { error } = await supabase
        .from(table)
        .update({
          scheduled_start_date: task.start.toISOString().split('T')[0],
          scheduled_end_date: task.end.toISOString().split('T')[0],
          duration_days: duration
        })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: 'Schedule Updated',
        description: `${scheduleTask.name} rescheduled successfully`
      });

      loadScheduleTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task schedule',
        variant: 'destructive'
      });
    }
  };

  const handleTaskClick = (task: Task) => {
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
          Click tasks to edit details and dependencies.
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
        </div>
      </Card>

      {/* Gantt Chart */}
      <Card className="p-6 overflow-x-auto">
        <Gantt
          tasks={tasks}
          viewMode={viewMode}
          onDateChange={handleTaskChange}
          onClick={handleTaskClick}
          listCellWidth="200px"
          columnWidth={viewMode === ViewMode.Month ? 300 : 65}
        />
      </Card>

      {/* Task Edit Panel */}
      {selectedTask && (
        <TaskEditPanel
          task={selectedTask}
          allTasks={scheduleTasks}
          onClose={() => setSelectedTask(null)}
          onSave={async (updatedTask) => {
            // Handle save logic here
            setSelectedTask(null);
            loadScheduleTasks();
          }}
        />
      )}
    </div>
  );
}
```

---

## PHASE 4: ADD MISSING CSS

### Step 4.1: Add Gantt Styles

**File:** `src/index.css`

**ADD TO END OF FILE:**

```css
/* Gantt Task React Styles */
.gantt-container {
  font-family: inherit;
}

.gantt-task-react .task-list-header {
  border-bottom: 1px solid #e2e8f0;
}

.gantt-task-react .task-list-table {
  border-right: 1px solid #e2e8f0;
}

.gantt-task-react .task-item {
  border-radius: 4px;
}

/* Category-specific colors are handled inline via Task.styles */
```

---

## PHASE 5: VERIFY AND TEST

### Step 5.1: Check Installation
```bash
npm list gantt-task-react
# Should show: gantt-task-react@0.3.9 or similar
```

### Step 5.2: Clear Cache and Restart
```bash
rm -rf node_modules/.vite
npm run dev
```

### Step 5.3: Test Checklist
- [ ] Navigate to a project with approved estimate
- [ ] Click Schedule tab
- [ ] Gantt chart shows colored task bars (not black box)
- [ ] Can see task names on left side
- [ ] Can drag tasks horizontally
- [ ] Click task opens edit panel
- [ ] Stats cards show correct numbers

---

## PHASE 6: TROUBLESHOOTING

### If Gantt Still Doesn't Render:

**Check Browser Console for:**
```
Error: Cannot read properties of undefined
```

**If you see this**, check that your `estimate_line_items` table has these columns:
- `scheduled_start_date`
- `scheduled_end_date`
- `duration_days`
- `dependencies`

**If columns are missing**, run this SQL in Supabase:

```sql
-- Add missing schedule columns
ALTER TABLE estimate_line_items
ADD COLUMN IF NOT EXISTS scheduled_start_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_end_date DATE,
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS schedule_notes TEXT;

-- Same for change orders
ALTER TABLE change_order_line_items
ADD COLUMN IF NOT EXISTS scheduled_start_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_end_date DATE,
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS schedule_notes TEXT;
```

---

## SUCCESS CRITERIA

✅ **Schedule page loads without errors**  
✅ **Gantt chart displays colored task bars**  
✅ **Can see all tasks from approved estimate**  
✅ **Can drag tasks to change dates**  
✅ **Click task shows edit panel**  
✅ **Progress percentages display (based on expenses)**  
✅ **Change orders show with different color**  
✅ **No console errors**

---

## WHAT WAS FIXED

1. ✅ **Removed frappe-gantt** (had DOM issues)
2. ✅ **Installed gantt-task-react** (React-native, free)
3. ✅ **Fixed database queries** (now uses correlations table correctly)
4. ✅ **Proper progress tracking** (based on expense allocations)
5. ✅ **Working drag & drop** (library handles it natively)
6. ✅ **Task click handler** (opens edit panel)
7. ✅ **Color coding by category** (inline styles)

---

## NOTES FOR CURSOR AGENT

- Execute phases in order
- Don't skip steps
- After Phase 3, do a full server restart
- gantt-task-react is MIT licensed (free forever)
- If user reports "still doesn't work", check they ran the SQL to add columns
- Progress tracking now correctly queries through correlations table

---

END OF INSTRUCTIONS
