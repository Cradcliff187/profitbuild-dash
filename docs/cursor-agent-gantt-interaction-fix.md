# CURSOR AGENT: Fix Gantt Chart Interaction Issues

## PROBLEMS IDENTIFIED
1. ❌ Dragging tasks opens edit sidebar (should only update dates)
2. ❌ New dates don't show in edit panel after drag
3. ❌ Toast notifications don't auto-dismiss

## ROOT CAUSE
The `onClick` handler fires during drag operations, causing edit panel to open. Also, state isn't syncing properly.

---

## FIX 1: Separate Click from Drag Events

**File:** `src/components/schedule/ProjectScheduleView.tsx`

**FIND THIS SECTION (around line 180-200):**
```typescript
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
```

**REPLACE WITH THIS:**
```typescript
  // Track if we're currently dragging to prevent click events
  const [isDragging, setIsDragging] = React.useRef(false);
  const dragTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleTaskChange = async (task: Task) => {
    // Set dragging flag
    setIsDragging.current = true;
    
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

      // Update database
      const { error } = await supabase
        .from(table)
        .update({
          scheduled_start_date: task.start.toISOString().split('T')[0],
          scheduled_end_date: task.end.toISOString().split('T')[0],
          duration_days: duration
        })
        .eq('id', task.id);

      if (error) throw error;

      // Update local state immediately
      setScheduleTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { 
              ...t, 
              start: task.start.toISOString().split('T')[0],
              end: task.end.toISOString().split('T')[0]
            }
          : t
      ));

      // Show success toast with auto-dismiss
      toast({
        title: 'Schedule Updated',
        description: `${scheduleTask.name} rescheduled to ${task.start.toLocaleDateString()}`,
        duration: 3000, // Auto-dismiss after 3 seconds
      });

    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task schedule',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      // Reset dragging flag after 300ms to allow click events
      dragTimeoutRef.current = setTimeout(() => {
        setIsDragging.current = false;
      }, 300);
    }
  };

  const handleTaskClick = (task: Task) => {
    // Don't open edit panel if we're dragging
    if (setIsDragging.current) {
      return;
    }

    const scheduleTask = scheduleTasks.find(t => t.id === task.id);
    if (scheduleTask) {
      // Find the updated task with latest dates
      const updatedTask = scheduleTasks.find(t => t.id === task.id);
      setSelectedTask(updatedTask || scheduleTask);
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);
```

---

## FIX 2: Update Toast Hook Configuration

**File:** `src/hooks/use-toast.ts` (or wherever toast is configured)

**IF YOU SEE THIS:**
```typescript
toast({
  title: "...",
  description: "..."
})
```

**MAKE SURE ALL TOASTS HAVE:**
```typescript
toast({
  title: "...",
  description: "...",
  duration: 3000  // Add this to every toast!
})
```

**OR, BETTER YET, UPDATE THE TOAST DEFAULTS:**

**Find the toast provider configuration** (likely in `src/App.tsx` or `src/main.tsx`)

**ADD DEFAULT DURATION:**
```typescript
<Toaster 
  duration={3000}  // Default 3 second auto-dismiss
  closeButton
  richColors
/>
```

---

## FIX 3: Improve Gantt Component Props

**File:** `src/components/schedule/ProjectScheduleView.tsx`

**FIND THE GANTT COMPONENT (around line 350):**
```typescript
<Gantt
  tasks={tasks}
  viewMode={viewMode}
  onDateChange={handleTaskChange}
  onClick={handleTaskClick}
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
  onDoubleClick={handleTaskClick}  // Changed from onClick to onDoubleClick
  listCellWidth="200px"
  columnWidth={viewMode === ViewMode.Month ? 300 : 65}
  barCornerRadius={4}
  handleWidth={8}
  todayColor="rgba(59, 130, 246, 0.1)"
/>
```

**KEY CHANGES:**
- `onClick` → `onDoubleClick` - Now requires double-click to open edit panel
- Single click + drag = just moves the task
- Double click = opens edit panel

---

## FIX 4: Add Visual Feedback During Drag

**File:** `src/components/schedule/ProjectScheduleView.tsx`

**ADD THIS NEW FUNCTION BEFORE `convertToGanttTasks`:**
```typescript
  const handleProgressChange = async (task: Task) => {
    // Optional: Handle progress bar drag if needed
    // For now, we'll just prevent it from opening edit panel
    setIsDragging.current = true;
    
    setTimeout(() => {
      setIsDragging.current = false;
    }, 300);
  };
```

**THEN UPDATE THE GANTT COMPONENT:**
```typescript
<Gantt
  tasks={tasks}
  viewMode={viewMode}
  onDateChange={handleTaskChange}
  onProgressChange={handleProgressChange}  // Add this
  onDoubleClick={handleTaskClick}
  listCellWidth="200px"
  columnWidth={viewMode === ViewMode.Month ? 300 : 65}
  barCornerRadius={4}
  handleWidth={8}
  todayColor="rgba(59, 130, 246, 0.1)"
/>
```

---

## FIX 5: Better Toast Messages

**File:** `src/components/schedule/ProjectScheduleView.tsx`

**FIND ALL TOAST CALLS AND UPDATE THEM:**

**Example 1 - Success Toast:**
```typescript
toast({
  title: '✓ Schedule Updated',
  description: `${scheduleTask.name} moved to ${task.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
  duration: 3000,
});
```

**Example 2 - Error Toast:**
```typescript
toast({
  title: '✗ Update Failed',
  description: 'Could not save schedule changes. Please try again.',
  variant: 'destructive',
  duration: 5000,
});
```

**Example 3 - Warning Toast:**
```typescript
toast({
  title: '⚠ Warning',
  description: 'Task scheduled before dependencies complete',
  variant: 'default',
  duration: 4000,
});
```

---

## FIX 6: Add Loading State During Save

**File:** `src/components/schedule/ProjectScheduleView.tsx`

**ADD STATE AT TOP:**
```typescript
const [isSaving, setIsSaving] = useState(false);
```

**UPDATE handleTaskChange:**
```typescript
const handleTaskChange = async (task: Task) => {
  setIsDragging.current = true;
  setIsSaving(true);  // Add this
  
  if (dragTimeoutRef.current) {
    clearTimeout(dragTimeoutRef.current);
  }

  try {
    // ... existing code ...
    
    toast({
      title: '✓ Saved',
      description: `${scheduleTask.name} updated`,
      duration: 2000,  // Shorter duration for success
    });

  } catch (error) {
    // ... error handling ...
  } finally {
    setIsSaving(false);  // Add this
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragging.current = false;
    }, 300);
  }
};
```

**SHOW LOADING INDICATOR:**
```typescript
{isSaving && (
  <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
    Saving...
  </div>
)}
```

---

## ALTERNATIVE SOLUTION: Confirmation Before Save

**If you prefer to confirm changes before saving:**

**File:** `src/components/schedule/ProjectScheduleView.tsx`

**ADD PENDING STATE:**
```typescript
const [pendingChange, setPendingChange] = useState<Task | null>(null);
```

**MODIFY handleTaskChange:**
```typescript
const handleTaskChange = async (task: Task) => {
  setIsDragging.current = true;
  
  // Don't save immediately - store pending change
  setPendingChange(task);
  
  // Update visual only
  setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  
  // Show confirmation toast
  toast({
    title: 'Schedule Changed',
    description: 'Click "Save Changes" to keep new dates',
    duration: 5000,
    action: {
      label: 'Save',
      onClick: () => saveTaskChange(task)
    }
  });
  
  setTimeout(() => {
    setIsDragging.current = false;
  }, 300);
};

const saveTaskChange = async (task: Task) => {
  // ... actual save logic here ...
};
```

---

## TESTING CHECKLIST

After applying fixes, test these scenarios:

### ✅ Drag Task Horizontally (Change Dates)
- [ ] Drag task left/right
- [ ] Edit panel does NOT open
- [ ] Toast shows "Schedule Updated"
- [ ] Toast auto-dismisses after 3 seconds
- [ ] New dates save to database

### ✅ Drag Task Edge (Extend Duration)
- [ ] Drag right edge of task bar
- [ ] Edit panel does NOT open
- [ ] Duration updates correctly
- [ ] Toast confirms change

### ✅ Double-Click Task (Open Editor)
- [ ] Double-click a task bar
- [ ] Edit panel opens with CURRENT dates
- [ ] Shows latest dates if task was just dragged

### ✅ Toast Behavior
- [ ] Success toasts disappear after 3 seconds
- [ ] Error toasts disappear after 5 seconds
- [ ] Multiple toasts stack properly
- [ ] Can manually dismiss with X button

---

## RECOMMENDED APPROACH

**Choose ONE of these patterns:**

### **Option A: Auto-Save on Drag** (Simpler)
- Drag = immediately saves to database
- Toast confirms save
- Double-click to edit details

### **Option B: Confirmation on Drag** (Safer)
- Drag = visual change only
- Toast with "Save" button
- Saves when user clicks "Save"
- Can undo by refreshing

**I recommend Option A** (auto-save) because:
- ✅ Faster workflow
- ✅ Less clicks
- ✅ Standard Gantt chart behavior
- ✅ Changes are obvious

---

## IMPLEMENTATION ORDER

1. ✅ **Do Fix 1 first** - Separates click/drag events
2. ✅ **Then Fix 3** - Changes onClick to onDoubleClick  
3. ✅ **Then Fix 2** - Adds toast auto-dismiss
4. ✅ **Test thoroughly**
5. ⏭ **Optional: Fix 6** - Add loading indicator if desired

---

## IF ISSUES PERSIST

**Problem: Edit panel still opens on drag**
- Check if `setIsDragging.current = true` is actually executing
- Add `console.log('Dragging:', setIsDragging.current)` in handleTaskClick
- Increase timeout from 300ms to 500ms

**Problem: Dates still don't update**
- Check browser console for database errors
- Verify `scheduled_start_date` column exists in both tables
- Check if `setScheduleTasks` is updating state correctly

**Problem: Toasts won't dismiss**
- Verify Toaster component has `duration` prop
- Check if toast library version supports auto-dismiss
- Try adding `closeButton` prop to Toaster

---

END OF FIX INSTRUCTIONS
