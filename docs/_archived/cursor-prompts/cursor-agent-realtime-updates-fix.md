# CURSOR AGENT: Fix Real-Time Updates After Drag & Drop

## PROBLEM
❌ After dragging a task, changes don't show immediately
❌ Must refresh page to see updated dates
❌ Database saves successfully, but UI doesn't update

## ROOT CAUSE
The `handleTaskChange` function updates `scheduleTasks` state but NOT the `tasks` state that the Gantt component actually uses. Also calling `loadScheduleTasks()` is slow and causes unnecessary database queries.

---

## FIX: Update Both States Immediately (Optimistic Updates)

**File:** `src/components/schedule/ProjectScheduleView.tsx`

### STEP 1: Find the `handleTaskChange` Function

**FIND THIS CODE (around line 180-230):**

```typescript
const handleTaskChange = async (task: Task) => {
  setIsDragging.current = true;
  
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

    toast({
      title: 'Schedule Updated',
      description: `${scheduleTask.name} rescheduled to ${task.start.toLocaleDateString()}`,
      duration: 3000,
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
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragging.current = false;
    }, 300);
  }
};
```

---

### STEP 2: Replace With This Optimistic Update Version

**REPLACE ENTIRE `handleTaskChange` FUNCTION WITH:**

```typescript
const handleTaskChange = async (task: Task) => {
  setIsDragging.current = true;
  
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
    const startDateStr = task.start.toISOString().split('T')[0];
    const endDateStr = task.end.toISOString().split('T')[0];

    // OPTIMISTIC UPDATE: Update UI immediately BEFORE database
    // Update scheduleTasks state
    setScheduleTasks(prev => prev.map(t => 
      t.id === task.id 
        ? { 
            ...t, 
            start: startDateStr,
            end: endDateStr
          }
        : t
    ));

    // CRITICAL: Also update tasks state so Gantt re-renders
    setTasks(prev => prev.map(t => 
      t.id === task.id
        ? { 
            ...t, 
            start: task.start,
            end: task.end
          }
        : t
    ));

    // Now save to database in background
    const { error } = await supabase
      .from(table)
      .update({
        scheduled_start_date: startDateStr,
        scheduled_end_date: endDateStr,
        duration_days: duration
      })
      .eq('id', task.id);

    if (error) {
      // If database save fails, revert the optimistic update
      console.error('Database save failed:', error);
      
      // Reload from database to get correct state
      await loadScheduleTasks();
      
      throw error;
    }

    // Success toast
    toast({
      title: '✓ Saved',
      description: `${scheduleTask.name} → ${task.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      duration: 2000,
    });

  } catch (error) {
    console.error('Error updating task:', error);
    toast({
      title: '✗ Update Failed',
      description: 'Changes reverted. Please try again.',
      variant: 'destructive',
      duration: 5000,
    });
  } finally {
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragging.current = false;
    }, 300);
  }
};
```

---

## WHAT CHANGED

### Before (Broken):
1. Save to database
2. Update `scheduleTasks` only
3. Call `loadScheduleTasks()` (slow, causes flicker)
4. Gantt uses `tasks` state which wasn't updated ❌

### After (Fixed):
1. **Update `scheduleTasks` AND `tasks` immediately** (optimistic)
2. User sees change instantly ✅
3. Save to database in background
4. If save fails, revert changes
5. No page refresh needed ✅

---

## ADDITIONAL FIX: Remove Slow `loadScheduleTasks()` Call

**FIND ANY PLACES WHERE YOU CALL `loadScheduleTasks()` AFTER A DRAG:**

**REMOVE THIS:**
```typescript
toast({ ... });
loadScheduleTasks();  // <-- DELETE THIS LINE
```

**Keep only the optimistic updates.**

---

## BONUS FIX: Add Visual Feedback During Save

**ADD THIS STATE AT THE TOP OF COMPONENT:**

```typescript
const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
```

**UPDATE `handleTaskChange` TO USE IT:**

```typescript
const handleTaskChange = async (task: Task) => {
  setIsDragging.current = true;
  setSavingTaskId(task.id);  // Show saving indicator
  
  // ... rest of function ...
  
  } finally {
    setSavingTaskId(null);  // Hide saving indicator
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragging.current = false;
    }, 300);
  }
};
```

**ADD THIS VISUAL INDICATOR IN THE GANTT COMPONENT:**

```typescript
// Update task styles to show saving state
const convertToGanttTasks = (scheduleTasks: ScheduleTask[]): Task[] => {
  const formatShortDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return scheduleTasks.map((task) => {
    const start = new Date(task.start);
    const end = new Date(task.end);
    const taskNameWithDates = `${task.name} (${formatShortDate(task.start)} - ${formatShortDate(task.end)})`;
    
    // Check if this task is currently saving
    const isSaving = savingTaskId === task.id;

    return {
      start,
      end,
      name: taskNameWithDates,
      id: task.id,
      type: 'task',
      progress: task.progress,
      isDisabled: isSaving,  // Disable while saving
      styles: {
        backgroundColor: isSaving 
          ? '#94a3b8'  // Gray while saving
          : getCategoryColor(task.category),
        backgroundSelectedColor: getCategoryColor(task.category),
        progressColor: '#4ade80',
        progressSelectedColor: '#22c55e',
        opacity: isSaving ? 0.6 : 1  // Fade while saving
      }
    };
  });
};
```

---

## FIX FOR PROGRESS UPDATES TOO

**If progress percentages also don't update in real-time:**

**File:** `src/components/schedule/hooks/useProgressTracking.ts`

**ADD A MANUAL REFRESH FUNCTION:**

```typescript
export function useProgressTracking(projectId: string) {
  // ... existing code ...

  // Add this function to manually update a single task's progress
  const updateTaskProgress = (taskId: string, progress: number, actualCost: number) => {
    setTaskProgress(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(taskId);
      if (existing) {
        newMap.set(taskId, {
          ...existing,
          progress,
          actualCost
        });
      }
      return newMap;
    });
  };

  return {
    taskProgress,
    getTaskProgress,
    getTaskActualCost,
    updateTaskProgress,  // Export this new function
    isLoading,
    error,
    refetch: loadProgressData
  };
}
```

---

## TESTING CHECKLIST

After applying fixes:

### ✅ Drag Task Test
1. Drag a task to new dates
2. **Release mouse**
3. Task should stay at new position immediately (no jump back)
4. Toast shows "✓ Saved"
5. **Do NOT refresh page**
6. Double-click task
7. Edit panel should show new dates
8. Refresh page - dates should still be correct

### ✅ Fast Consecutive Drags
1. Drag task A
2. Immediately drag task B
3. Both should update without conflict
4. No "Update Failed" toasts

### ✅ Failed Save Handling
1. Turn off internet (simulate database failure)
2. Drag a task
3. Should see error toast "✗ Update Failed"
4. Task should jump back to original position
5. Turn internet back on
6. Next drag should work

### ✅ Multiple Users (Optional)
1. Open project in two browser tabs
2. Drag task in tab 1
3. Tab 2 won't auto-update (that's expected without websockets)
4. Refresh tab 2 - should show new dates

---

## IMPLEMENTATION ORDER

```
1. Apply STEP 2 (replace handleTaskChange with optimistic version)
2. Remove any loadScheduleTasks() calls after drag
3. Test drag & drop - should work immediately now
4. (Optional) Add saving indicator for visual feedback
5. (Optional) Add progress update function if needed
```

---

## WHY THIS WORKS

**The Key Insight:**
```typescript
// The Gantt component renders from 'tasks' state
<Gantt tasks={tasks} ... />

// But we were only updating 'scheduleTasks' state
setScheduleTasks(prev => ...) // ❌ Gantt doesn't see this

// Now we update BOTH:
setScheduleTasks(prev => ...)  // For our app logic
setTasks(prev => ...)          // For Gantt to re-render ✅
```

**Optimistic Updates:**
- UI updates immediately (feels instant)
- Database saves in background
- If save fails, we revert
- This is how modern apps work (Gmail, Notion, etc.)

---

## COMMON PITFALLS TO AVOID

❌ **Don't call `loadScheduleTasks()` after every drag**
- It refetches ALL data from database
- Causes flicker
- Slow on large projects

✅ **Do use optimistic updates**
- Update state immediately
- Save in background
- Revert only if error

❌ **Don't forget to update both states**
- Must update `scheduleTasks` AND `tasks`
- Otherwise Gantt won't re-render

✅ **Do handle save failures gracefully**
- Show error toast
- Revert optimistic update
- Let user try again

---

END OF FIX INSTRUCTIONS
