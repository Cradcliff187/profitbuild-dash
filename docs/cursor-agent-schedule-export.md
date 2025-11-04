# CURSOR AGENT: Add Schedule Export Feature

## OVERVIEW
Create a schedule download feature matching the existing EstimateExportModal and QuoteExportModal patterns. Users can export the Gantt schedule as CSV with task details, dates, durations, and dependencies.

---

## STEP 1: Create Schedule Export Utility

**NEW FILE:** `src/utils/scheduleExport.ts`

```typescript
import { format } from 'date-fns';
import { ScheduleTask } from '@/types/schedule';

interface ScheduleExportOptions {
  includeProgress: boolean;
  includeCosts: boolean;
  includeDependencies: boolean;
  includeNotes: boolean;
  sortBy: 'start_date' | 'category' | 'name';
}

/**
 * Export schedule tasks to CSV format
 */
export const exportScheduleToCSV = (
  tasks: ScheduleTask[],
  projectName: string,
  options: ScheduleExportOptions
) => {
  if (tasks.length === 0) {
    return;
  }

  // Sort tasks based on option
  let sortedTasks = [...tasks];
  switch (options.sortBy) {
    case 'start_date':
      sortedTasks.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      break;
    case 'category':
      sortedTasks.sort((a, b) => a.category.localeCompare(b.category));
      break;
    case 'name':
      sortedTasks.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  // Build headers
  const headers = [
    'Task Name',
    'Category',
    'Start Date',
    'End Date',
    'Duration (Days)',
    'Type'
  ];

  if (options.includeProgress) {
    headers.push('Progress (%)', 'Status');
  }

  if (options.includeCosts) {
    headers.push('Estimated Cost', 'Actual Cost', 'Cost Variance');
  }

  if (options.includeDependencies) {
    headers.push('Dependencies', 'Dependent Tasks');
  }

  if (options.includeNotes) {
    headers.push('Notes');
  }

  // Build rows
  const rows = sortedTasks.map(task => {
    const startDate = new Date(task.start);
    const endDate = new Date(task.end);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const row = [
      task.name.replace(/,/g, ';'), // Escape commas
      formatCategory(task.category),
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
      duration.toString(),
      task.isChangeOrder ? 'Change Order' : 'Original Estimate'
    ];

    if (options.includeProgress) {
      row.push(
        task.progress.toString(),
        getStatusFromProgress(task.progress)
      );
    }

    if (options.includeCosts) {
      const variance = (task.actual_cost || 0) - (task.estimated_cost || 0);
      row.push(
        formatCurrency(task.estimated_cost || 0),
        formatCurrency(task.actual_cost || 0),
        formatCurrency(variance)
      );
    }

    if (options.includeDependencies) {
      const deps = Array.isArray(task.dependencies) ? task.dependencies : [];
      const depNames = deps
        .map(depId => tasks.find(t => t.id === depId)?.name || depId)
        .join('; ');
      
      const dependents = sortedTasks
        .filter(t => {
          const tDeps = Array.isArray(t.dependencies) ? t.dependencies : [];
          return tDeps.includes(task.id);
        })
        .map(t => t.name)
        .join('; ');

      row.push(
        depNames || 'None',
        dependents || 'None'
      );
    }

    if (options.includeNotes) {
      row.push((task.notes || '').replace(/,/g, ';').replace(/\n/g, ' '));
    }

    return row;
  });

  // Combine headers and rows
  const csvContent = [
    // Add project header
    [`Project: ${projectName}`],
    [`Exported: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`],
    [`Total Tasks: ${tasks.length}`],
    [],
    headers,
    ...rows
  ]
    .map(row => row.join(','))
    .join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(projectName)}_schedule_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Format category for display
 */
function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get status based on progress percentage
 */
function getStatusFromProgress(progress: number): string {
  if (progress === 0) return 'Not Started';
  if (progress < 100) return 'In Progress';
  return 'Complete';
}

/**
 * Format currency for CSV
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Sanitize filename for safe download
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Export schedule as Microsoft Project compatible CSV
 * (Simplified format that MS Project can import)
 */
export const exportScheduleToMSProject = (
  tasks: ScheduleTask[],
  projectName: string
) => {
  // MS Project CSV format
  const headers = [
    'ID',
    'Name',
    'Duration',
    'Start',
    'Finish',
    'Predecessors',
    'Resource Names'
  ];

  const rows = tasks.map((task, index) => {
    const startDate = new Date(task.start);
    const endDate = new Date(task.end);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Format dependencies as MS Project expects (task IDs)
    const deps = Array.isArray(task.dependencies) 
      ? task.dependencies.map(depId => {
          const depIndex = tasks.findIndex(t => t.id === depId);
          return depIndex >= 0 ? (depIndex + 1).toString() : '';
        }).filter(Boolean).join(',')
      : '';

    return [
      (index + 1).toString(),
      task.name.replace(/,/g, ';'),
      `${duration}d`,
      format(startDate, 'MM/dd/yyyy'),
      format(endDate, 'MM/dd/yyyy'),
      deps || '',
      formatCategory(task.category)
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(projectName)}_msproject_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
```

---

## STEP 2: Create Schedule Export Modal Component

**NEW FILE:** `src/components/schedule/ScheduleExportModal.tsx`

```typescript
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Table, Calendar } from "lucide-react";
import { exportScheduleToCSV, exportScheduleToMSProject } from '@/utils/scheduleExport';
import { ScheduleTask } from '@/types/schedule';

interface ScheduleExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: ScheduleTask[];
  projectName: string;
}

interface ExportOptions {
  format: 'csv' | 'ms-project';
  includeProgress: boolean;
  includeCosts: boolean;
  includeDependencies: boolean;
  includeNotes: boolean;
  sortBy: 'start_date' | 'category' | 'name';
}

export const ScheduleExportModal: React.FC<ScheduleExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  projectName
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeProgress: true,
    includeCosts: true,
    includeDependencies: true,
    includeNotes: true,
    sortBy: 'start_date'
  });

  const updateOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions({ ...exportOptions, ...updates });
  };

  const handleExport = async () => {
    if (tasks.length === 0) {
      toast({
        title: "No Tasks to Export",
        description: "The schedule has no tasks to export",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    
    try {
      if (exportOptions.format === 'ms-project') {
        exportScheduleToMSProject(tasks, projectName);
      } else {
        exportScheduleToCSV(tasks, projectName, exportOptions);
      }

      toast({
        title: "✓ Export Complete",
        description: `Successfully exported ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
        duration: 3000
      });

      onClose();
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "✗ Export Failed",
        description: "There was an error exporting the schedule",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Project Schedule</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Count */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>{tasks.length}</strong> task{tasks.length === 1 ? '' : 's'} ready to export
            </p>
          </div>

          {/* Export Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select 
              value={exportOptions.format} 
              onValueChange={(value) => updateOptions({ format: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center space-x-2">
                    <Table className="h-4 w-4" />
                    <span>CSV (Recommended)</span>
                  </div>
                </SelectItem>
                <SelectItem value="ms-project">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Microsoft Project Format</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {exportOptions.format === 'ms-project' 
                ? 'Compatible with MS Project and Primavera'
                : 'Opens in Excel, Google Sheets, or any spreadsheet app'}
            </p>
          </div>

          {/* Sort Order */}
          {exportOptions.format === 'csv' && (
            <div className="space-y-2">
              <Label>Sort Tasks By</Label>
              <Select 
                value={exportOptions.sortBy} 
                onValueChange={(value) => updateOptions({ sortBy: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start_date">Start Date (Chronological)</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="name">Task Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Include Options - Only for CSV */}
          {exportOptions.format === 'csv' && (
            <div className="space-y-3">
              <Label>Include in Export</Label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="progress"
                    checked={exportOptions.includeProgress}
                    onCheckedChange={(checked) => updateOptions({ includeProgress: !!checked })}
                  />
                  <label htmlFor="progress" className="text-sm cursor-pointer">
                    Progress & Status
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="costs"
                    checked={exportOptions.includeCosts}
                    onCheckedChange={(checked) => updateOptions({ includeCosts: !!checked })}
                  />
                  <label htmlFor="costs" className="text-sm cursor-pointer">
                    Cost Information
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dependencies"
                    checked={exportOptions.includeDependencies}
                    onCheckedChange={(checked) => updateOptions({ includeDependencies: !!checked })}
                  />
                  <label htmlFor="dependencies" className="text-sm cursor-pointer">
                    Task Dependencies
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notes"
                    checked={exportOptions.includeNotes}
                    onCheckedChange={(checked) => updateOptions({ includeNotes: !!checked })}
                  />
                  <label htmlFor="notes" className="text-sm cursor-pointer">
                    Notes & Comments
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || tasks.length === 0}
          >
            {isExporting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Schedule
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## STEP 3: Add Export Button to Schedule View

**FILE:** `src/components/schedule/ProjectScheduleView.tsx`

**ADD IMPORT AT TOP:**
```typescript
import { ScheduleExportModal } from './ScheduleExportModal';
```

**ADD STATE FOR MODAL:**
```typescript
const [showExportModal, setShowExportModal] = useState(false);
```

**FIND THE CONTROLS CARD (around line 330) AND UPDATE IT:**

```typescript
{/* Controls */}
<Card className="p-4">
  <div className="flex justify-between items-center flex-wrap gap-4">
    {/* View Mode Buttons (existing) */}
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

    {/* ADD THIS: Export Button */}
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
```

**ADD MODAL AT END OF COMPONENT (before closing </div>):**

```typescript
      {/* Task Edit Panel */}
      {selectedTask && (
        <TaskEditPanel
          task={selectedTask}
          allTasks={scheduleTasks}
          onClose={() => setSelectedTask(null)}
          onSave={async (updatedTask) => {
            setSelectedTask(null);
            loadScheduleTasks();
          }}
        />
      )}

      {/* ADD THIS: Export Modal */}
      <ScheduleExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        tasks={scheduleTasks}
        projectName={project?.project_name || 'Project'}
      />
    </div>
  );
}
```

**DON'T FORGET TO IMPORT Download ICON:**
```typescript
import { Calendar, AlertCircle, Download } from 'lucide-react';
```

---

## STEP 4: Testing Checklist

After implementation:

### ✅ Basic Export
- [ ] Click "Export Schedule" button
- [ ] Modal opens with options
- [ ] Shows correct task count
- [ ] Can select CSV or MS Project format
- [ ] Can toggle include options
- [ ] Click "Export Schedule" button
- [ ] CSV file downloads with correct filename
- [ ] Open in Excel/Google Sheets - data looks correct

### ✅ CSV Options
- [ ] Uncheck "Progress & Status" - those columns don't appear
- [ ] Uncheck "Cost Information" - cost columns don't appear
- [ ] Change sort order - tasks sort correctly in CSV

### ✅ MS Project Format
- [ ] Select "Microsoft Project Format"
- [ ] Export downloads
- [ ] Has correct columns: ID, Name, Duration, Start, Finish, Predecessors

### ✅ Edge Cases
- [ ] Export with 0 tasks - shows error message
- [ ] Export with 1 task - singular "task" in message
- [ ] Export with 50+ tasks - all included in CSV
- [ ] Task names with commas - escaped properly
- [ ] Task notes with line breaks - formatted correctly

---

## STEP 5: Expected Output Examples

### CSV Format (with all options):
```csv
Project: DAYTON SPRINGFIELD RD Mercy
Exported: 2025-11-04 15:30
Total Tasks: 4

Task Name,Category,Start Date,End Date,Duration (Days),Type,Progress (%),Status,Estimated Cost,Actual Cost,Cost Variance,Dependencies,Dependent Tasks,Notes
Flooring,Subcontractors,2025-11-08,2025-11-16,9,Original Estimate,0,Not Started,$12000.00,$0.00,$-12000.00,None,Paint,Install hardwood flooring
Paint,Subcontractors,2025-10-29,2025-11-10,13,Original Estimate,0,Not Started,$5000.00,$0.00,$-5000.00,Flooring,None,Interior painting
CO-CO-001: Add Contingency,Materials,2025-11-07,2025-11-14,8,Change Order,0,Not Started,$3500.00,$0.00,$-3500.00,None,None,Additional materials needed
CO-CO-002: Change order Flooring,Subcontractors,2025-11-06,2025-11-14,9,Change Order,0,Not Started,$2000.00,$0.00,$-2000.00,None,None,Flooring upgrade
```

### MS Project Format:
```csv
ID,Name,Duration,Start,Finish,Predecessors,Resource Names
1,Flooring,9d,11/08/2025,11/16/2025,,Subcontractors
2,Paint,13d,10/29/2025,11/10/2025,1,Subcontractors
3,CO-CO-001: Add Contingency,8d,11/07/2025,11/14/2025,,Materials
4,CO-CO-002: Change order Flooring,9d,11/06/2025,11/14/2025,,Subcontractors
```

---

## BONUS: Add Print Schedule Feature

**If you want a quick print view, add this to the Controls section:**

```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={() => window.print()}
  className="flex items-center gap-2"
>
  <Printer className="h-4 w-4" />
  Print
</Button>
```

**And add print styles to** `src/index.css`:

```css
/* Print styles for Gantt schedule */
@media print {
  .gantt-task-react {
    page-break-inside: avoid;
  }
  
  /* Hide buttons and controls when printing */
  button, .no-print {
    display: none !important;
  }
}
```

---

## IMPLEMENTATION ORDER

```
1. Create src/utils/scheduleExport.ts (export utility)
2. Create src/components/schedule/ScheduleExportModal.tsx (modal)
3. Update ProjectScheduleView.tsx:
   - Import ScheduleExportModal and Download icon
   - Add showExportModal state
   - Add Export button to controls
   - Add modal component
4. Test with different options
5. (Optional) Add print feature
```

---

## CURSOR PROMPT

```
Add schedule export feature to the Gantt chart following existing export patterns.

1. Create src/utils/scheduleExport.ts with:
   - exportScheduleToCSV() function
   - exportScheduleToMSProject() function
   - Helper functions for formatting

2. Create src/components/schedule/ScheduleExportModal.tsx with:
   - Modal dialog matching EstimateExportModal style
   - Format selection (CSV, MS Project)
   - Include options checkboxes
   - Sort order selector
   - Export button with loading state

3. Update src/components/schedule/ProjectScheduleView.tsx:
   - Import ScheduleExportModal and Download from lucide-react
   - Add state: const [showExportModal, setShowExportModal] = useState(false);
   - Add Export button in controls card next to view mode buttons
   - Add ScheduleExportModal component at end before closing div
   - Pass scheduleTasks and project name to modal

Follow the exact pattern from EstimateExportModal. Test by clicking Export, selecting options, and downloading CSV.
```

---

END OF INSTRUCTIONS
