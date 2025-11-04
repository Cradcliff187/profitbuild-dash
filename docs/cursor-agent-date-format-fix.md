# CURSOR AGENT: Fix Date Display in Gantt Chart

## PROBLEMS VISIBLE IN SCREENSHOT
1. ❌ "From" and "To" columns show long format: "Sat, November 8, 2025"
2. ❌ Dates overlapping with calendar grid
3. ❌ Takes up too much horizontal space

## TARGET FORMAT
✅ Short format: "Nov 8, 2025" or "11/8/25"

---

## FIX: Custom Task List Headers with Short Dates

**File:** `src/components/schedule/ProjectScheduleView.tsx`

### STEP 1: Add Custom Table Component

**ADD THIS NEW COMPONENT BEFORE `ProjectScheduleView`:**

```typescript
import { Task } from 'gantt-task-react';

// Custom task list table with formatted dates
const TaskListTable: React.FC<{
  rowHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
  locale: string;
  tasks: Task[];
  selectedTaskId: string;
  setSelectedTask: (taskId: string) => void;
}> = ({
  rowHeight,
  rowWidth,
  fontFamily,
  fontSize,
  tasks,
  selectedTaskId,
  setSelectedTask,
}) => {
  // Format date to short format
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div
      className="gantt-task-list-table"
      style={{
        fontFamily: fontFamily,
        fontSize: fontSize,
      }}
    >
      {tasks.map((task, index) => {
        const isSelected = task.id === selectedTaskId;
        return (
          <div
            key={task.id}
            className={`gantt-task-list-row ${isSelected ? 'selected' : ''}`}
            style={{
              height: rowHeight,
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: isSelected ? '#f3f4f6' : 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => setSelectedTask(task.id)}
          >
            {/* Task Name */}
            <div
              style={{
                minWidth: '200px',
                maxWidth: '200px',
                padding: '0 8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={task.name}
            >
              {task.name}
            </div>

            {/* From Date */}
            <div
              style={{
                minWidth: '110px',
                maxWidth: '110px',
                padding: '0 8px',
                fontSize: '13px',
                color: '#6b7280',
              }}
            >
              {formatDate(task.start)}
            </div>

            {/* To Date */}
            <div
              style={{
                minWidth: '110px',
                maxWidth: '110px',
                padding: '0 8px',
                fontSize: '13px',
                color: '#6b7280',
              }}
            >
              {formatDate(task.end)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TaskListHeader: React.FC<{
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
}> = ({ headerHeight, rowWidth, fontFamily, fontSize }) => {
  return (
    <div
      className="gantt-task-list-header"
      style={{
        height: headerHeight,
        fontFamily: fontFamily,
        fontSize: fontSize,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '2px solid #e5e7eb',
        fontWeight: 600,
        backgroundColor: '#f9fafb',
      }}
    >
      {/* Name Column */}
      <div
        style={{
          minWidth: '200px',
          maxWidth: '200px',
          padding: '0 8px',
        }}
      >
        Name
      </div>

      {/* From Column */}
      <div
        style={{
          minWidth: '110px',
          maxWidth: '110px',
          padding: '0 8px',
        }}
      >
        From
      </div>

      {/* To Column */}
      <div
        style={{
          minWidth: '110px',
          maxWidth: '110px',
          padding: '0 8px',
        }}
      >
        To
      </div>
    </div>
  );
};
```

---

### STEP 2: Update Gantt Component to Use Custom Table

**FIND THE GANTT COMPONENT (around line 350):**

```typescript
<Gantt
  tasks={tasks}
  viewMode={viewMode}
  onDateChange={handleTaskChange}
  onDoubleClick={handleTaskClick}
  listCellWidth="200px"
  columnWidth={viewMode === ViewMode.Month ? 300 : 65}
/>
```

**REPLACE WITH:**

```typescript
<Gantt
  tasks={tasks}
  viewMode={viewMode}
  onDateChange={handleTaskChange}
  onDoubleClick={handleTaskClick}
  listCellWidth="420px"  // Increased to fit all 3 columns: 200 + 110 + 110
  columnWidth={viewMode === ViewMode.Month ? 300 : 65}
  TaskListHeader={TaskListHeader}
  TaskListTable={TaskListTable}
  barCornerRadius={4}
  handleWidth={8}
  todayColor="rgba(59, 130, 246, 0.1)"
/>
```

---

## ALTERNATIVE: Simpler Fix (If Above Doesn't Work)

**If the custom components don't work, use this simpler approach:**

### OPTION 2: Just Format the Task Names to Include Dates

**File:** `src/components/schedule/ProjectScheduleView.tsx`

**FIND `convertToGanttTasks` function:**

```typescript
const convertToGanttTasks = (scheduleTasks: ScheduleTask[]): Task[] => {
  return scheduleTasks.map((task, index) => {
    const start = new Date(task.start);
    const end = new Date(task.end);

    return {
      start,
      end,
      name: task.name,  // <-- Change this line
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
```

**REPLACE WITH:**

```typescript
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
```

---

## OPTION 3: Hide Date Columns, Show Dates on Hover

**If you want to keep task list simple:**

**File:** `src/components/schedule/ProjectScheduleView.tsx`

**UPDATE GANTT PROPS:**

```typescript
<Gantt
  tasks={tasks}
  viewMode={viewMode}
  onDateChange={handleTaskChange}
  onDoubleClick={handleTaskClick}
  listCellWidth="250px"  // Just name column
  columnWidth={viewMode === ViewMode.Month ? 300 : 65}
  barCornerRadius={4}
  handleWidth={8}
  todayColor="rgba(59, 130, 246, 0.1)"
  TooltipContent={({ task }) => (
    <div className="bg-gray-900 text-white px-3 py-2 rounded text-sm">
      <div className="font-semibold">{task.name}</div>
      <div className="text-gray-300 mt-1">
        {task.start.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric' 
        })}
        {' → '}
        {task.end.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric' 
        })}
      </div>
      <div className="text-gray-400 text-xs mt-1">
        Duration: {Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24))} days
      </div>
    </div>
  )}
/>
```

---

## RECOMMENDED APPROACH

**Try Option 2 first** (simplest):
- ✅ No new components needed
- ✅ Dates show in task name like "Flooring (Nov 8 - Nov 16)"
- ✅ Keeps UI clean
- ✅ Works with existing code

**Then if you want separate columns**, try Option 1.

---

## ADD CUSTOM CSS FOR BETTER SPACING

**File:** `src/index.css`

**ADD THIS:**

```css
/* Gantt Task List Improvements */
.gantt-task-list-header {
  background: #f9fafb !important;
  border-bottom: 2px solid #e5e7eb !important;
}

.gantt-task-list-row {
  border-bottom: 1px solid #e5e7eb !important;
}

.gantt-task-list-row:hover {
  background: #f3f4f6 !important;
}

.gantt-task-list-row.selected {
  background: #dbeafe !important;
  border-left: 3px solid #3b82f6 !important;
}

/* Make date columns more compact */
.gantt-task-list-table [data-column="from"],
.gantt-task-list-table [data-column="to"] {
  font-size: 13px;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

/* Prevent text overflow in task names */
.gantt-task-list-table [data-column="name"] {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

## TESTING

After applying the fix:

1. ✅ Check "From" column shows: "Nov 8, 2025" (not "Sat, November 8, 2025")
2. ✅ Check "To" column shows: "Nov 16, 2025" (not "Sun, November 16, 2025")
3. ✅ No overlapping text
4. ✅ Dates are readable at a glance
5. ✅ Columns are properly aligned

---

## IMPLEMENTATION ORDER

**QUICKEST FIX (5 minutes):**
```
1. Do Option 2 (add dates to task names)
2. Test
3. Done!
```

**BEST UX (15 minutes):**
```
1. Try Option 1 (custom table components)
2. If it works, great!
3. If not, fall back to Option 2
4. Add CSS improvements
```

---

END OF INSTRUCTIONS
