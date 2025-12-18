# CURSOR AGENT: Fix Overlapping Calendar Header in Gantt Chart

## PROBLEM IN SCREENSHOT
❌ Calendar header shows: "29Thu, 30Fri, 31 Sat, 1 Sun, 2Mon, 3 Tue..." all overlapping
✅ Task bars show correct format: "Flooring (Oct 30 - Nov 13)"

## ROOT CAUSE
The `gantt-task-react` library's default column width is too narrow for the date labels in Day view.

---

## FIX 1: Adjust Column Width for Day View

**File:** `src/components/schedule/ProjectScheduleView.tsx`

**FIND THIS LINE (around line 350):**
```typescript
<Gantt
  tasks={tasks}
  viewMode={viewMode}
  onDateChange={handleTaskChange}
  onDoubleClick={handleTaskClick}
  listCellWidth="250px"
  columnWidth={viewMode === ViewMode.Month ? 300 : 65}  // <-- THIS LINE
  barCornerRadius={4}
  handleWidth={8}
  todayColor="rgba(59, 130, 246, 0.1)"
/>
```

**REPLACE `columnWidth` PROP WITH:**
```typescript
<Gantt
  tasks={tasks}
  viewMode={viewMode}
  onDateChange={handleTaskChange}
  onDoubleClick={handleTaskClick}
  listCellWidth="250px"
  columnWidth={
    viewMode === ViewMode.Day ? 80 : 
    viewMode === ViewMode.Week ? 65 : 
    viewMode === ViewMode.Month ? 300 : 65
  }
  barCornerRadius={4}
  handleWidth={8}
  todayColor="rgba(59, 130, 246, 0.1)"
/>
```

**EXPLANATION:**
- Day view: 80px (was 65px - now wider to fit "Mon, 3")
- Week view: 65px (unchanged)
- Month view: 300px (unchanged)

---

## FIX 2: Add CSS to Clean Up Header Display

**File:** `src/index.css`

**ADD THIS AT THE END:**

```css
/* ============================================
   GANTT CHART HEADER FIXES
   ============================================ */

/* Calendar header formatting */
.gantt .calendar {
  font-size: 12px;
}

/* Top row (Month/Year) */
.gantt .calendar-header {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 13px;
}

/* Bottom row (Days/Dates) */
.gantt .calendar-header-bottom {
  background: white;
  border-bottom: 2px solid #e5e7eb;
  font-size: 11px;
  color: #6b7280;
}

/* Individual date cells */
.gantt .calendar-header-bottom > div {
  padding: 4px 2px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Prevent text wrapping in calendar cells */
.gantt-task-react .calendar .top,
.gantt-task-react .calendar .bottom {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Make sure dates don't overlap */
.gantt-task-react .calendar-top-text,
.gantt-task-react .calendar-bottom-text {
  font-size: 11px;
  padding: 2px;
  text-align: center;
  overflow: hidden;
}

/* Today highlight */
.gantt-task-react .calendar-bottom-text.today {
  background-color: rgba(59, 130, 246, 0.1);
  font-weight: 600;
  color: #3b82f6;
}
```

---

## FIX 3: Use Shorter Date Format in Day View

**If the above doesn't fully fix it, we can customize the header format.**

**File:** `src/components/schedule/ProjectScheduleView.tsx`

**ADD THIS HELPER FUNCTION BEFORE THE GANTT COMPONENT:**

```typescript
// Custom date format for cleaner headers
const getHeaderDateFormat = (viewMode: ViewMode) => {
  switch (viewMode) {
    case ViewMode.Day:
      return {
        topLabel: 'MMM yyyy', // "Nov 2025"
        bottomLabel: 'dd EEE'  // "03 Mon"
      };
    case ViewMode.Week:
      return {
        topLabel: 'MMM yyyy',
        bottomLabel: 'dd MMM'  // "03 Nov"
      };
    case ViewMode.Month:
      return {
        topLabel: 'yyyy',
        bottomLabel: 'MMM'     // "Nov"
      };
    default:
      return undefined;
  }
};
```

**THEN UPDATE GANTT COMPONENT:**

```typescript
<Gantt
  tasks={tasks}
  viewMode={viewMode}
  onDateChange={handleTaskChange}
  onDoubleClick={handleTaskClick}
  listCellWidth="250px"
  columnWidth={
    viewMode === ViewMode.Day ? 80 : 
    viewMode === ViewMode.Week ? 65 : 
    viewMode === ViewMode.Month ? 300 : 65
  }
  barCornerRadius={4}
  handleWidth={8}
  todayColor="rgba(59, 130, 246, 0.1)"
  locale="en-US"
  headerHeight={50}
  rowHeight={40}
/>
```

---

## FIX 4: Alternative - Hide Day Names in Day View

**If you want a cleaner look, show just numbers:**

**File:** `src/index.css`

**ADD THIS:**

```css
/* Simplified day view - just show date numbers */
.gantt-task-react[data-view-mode="Day"] .calendar-bottom-text {
  font-size: 13px;
  font-weight: 500;
}

/* Hide "Thu", "Fri" etc in day view to save space */
.gantt-task-react[data-view-mode="Day"] .calendar-bottom-text::first-line {
  display: none;
}

/* Or alternatively, format as just "3\nMon" vertically */
.gantt-task-react[data-view-mode="Day"] .calendar-bottom-text {
  line-height: 1.2;
  padding-top: 4px;
}
```

---

## FIX 5: Increase Header Height for Better Spacing

**File:** `src/components/schedule/ProjectScheduleView.tsx`

**UPDATE GANTT COMPONENT:**

```typescript
<Gantt
  tasks={tasks}
  viewMode={viewMode}
  onDateChange={handleTaskChange}
  onDoubleClick={handleTaskClick}
  listCellWidth="250px"
  columnWidth={
    viewMode === ViewMode.Day ? 80 : 
    viewMode === ViewMode.Week ? 65 : 
    viewMode === ViewMode.Month ? 300 : 65
  }
  barCornerRadius={4}
  handleWidth={8}
  todayColor="rgba(59, 130, 246, 0.1)"
  headerHeight={60}  // Increased from default 50
  rowHeight={45}     // Slightly taller rows
/>
```

---

## RECOMMENDED IMPLEMENTATION ORDER

**QUICKEST FIX (Try First):**
```
1. Apply FIX 1 (increase columnWidth for Day view from 65 to 80)
2. Apply FIX 2 (add CSS for header formatting)
3. Test in Day view - should be readable now
```

**IF STILL OVERLAPPING:**
```
4. Apply FIX 5 (increase headerHeight to 60)
5. Test again
```

**IF YOU WANT PERFECT CONTROL:**
```
6. Apply FIX 3 (custom date format function)
7. This gives you complete control over what shows
```

---

## COPY THIS INTO CURSOR:

```
The calendar header dates are overlapping in Day view.

Apply these fixes to src/components/schedule/ProjectScheduleView.tsx:

1. Change columnWidth to:
   columnWidth={
     viewMode === ViewMode.Day ? 80 : 
     viewMode === ViewMode.Week ? 65 : 
     viewMode === ViewMode.Month ? 300 : 65
   }

2. Add headerHeight={60} and rowHeight={45} props to Gantt component

3. Then add the CSS from FIX 2 to src/index.css to style the calendar header

Test in all three view modes (Day, Week, Month) after applying.
```

---

## EXPECTED RESULTS

**Before Fix:**
```
29Thu, 30Fri, 31 Sat, 1 Sun, 2Mon, 3 Tue...  ← All overlapping
```

**After Fix:**
```
29   30   31    1     2     3               ← Clean spacing
Thu  Fri  Sat  Sun  Mon  Tue                ← Day names below
```

Or:

```
November 2025
29  30  31   1   2   3   4   5   6   7      ← Just numbers
```

---

## TESTING CHECKLIST

After applying fixes:

- [ ] Switch to Day view - dates don't overlap
- [ ] Switch to Week view - still looks good
- [ ] Switch to Month view - still looks good  
- [ ] Scroll horizontally - dates remain readable
- [ ] Zoom in/out - spacing adjusts properly

---

END OF FIX INSTRUCTIONS
