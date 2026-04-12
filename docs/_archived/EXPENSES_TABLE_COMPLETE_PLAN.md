# Updated Plan: ExpensesList with Timesheet Styling + Column Selector

## 🎯 Complete Feature Set

**What We're Adding:**
1. ✅ Timesheet-style compact table design
2. ✅ **ColumnSelector** component (show/hide columns)
3. ✅ **Drag-to-reorder** columns
4. ✅ **LocalStorage persistence** for preferences
5. ✅ Keep **ALL existing columns**
6. ✅ All existing functionality preserved

---

## 📋 Complete Column List (No Columns Removed!)

**All Columns (Same as Current):**
1. **Checkbox** - Select expense (required)
2. **Split Indicator** - Expand/collapse splits (conditional)
3. **Date** - Expense date (sortable)
4. **Project** - Project number + name (sortable)
5. **Payee** - Vendor/employee (sortable)
6. **Description** - Expense description
7. **Category** - Expense category (badge)
8. **Transaction Type** - Receipt/invoice/etc
9. **Amount** - Dollar amount (sortable)
10. **Invoice Number** - Reference number
11. **Status - Assigned** - Project assignment badge
12. **Status - Allocated** - Line item allocation badge
13. **Approval Status** - Pending/approved/rejected
14. **Actions** - Dropdown menu (required)

**Default Visible Columns:**
- Checkbox, Split, Date, Project, Payee, Description, Category, Amount, Status badges, Actions

**Can Hide (Optional Columns):**
- Transaction Type, Invoice Number, Approval Status

---

## 🚀 Updated Cursor Prompt (Complete Implementation)

```
REFACTOR: ExpensesList with Timesheet Styling + ColumnSelector

Add ColumnSelector with drag-to-reorder AND apply timesheet compact styling.

In src/components/ExpensesList.tsx:

STEP 1: Add imports

```typescript
import { ColumnSelector } from '@/components/ui/column-selector';
import { Settings2 } from 'lucide-react';
import { useEffect } from 'react'; // If not already imported
```

STEP 2: Define column definitions

Add after imports, before component:

```typescript
interface ColumnDefinition {
  key: string;
  label: string;
  required?: boolean;
  defaultVisible?: boolean;
  width?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}

const EXPENSE_COLUMNS: ColumnDefinition[] = [
  { key: 'checkbox', label: 'Select', required: true, width: 'w-10', defaultVisible: true },
  { key: 'split', label: '', required: false, width: 'w-8', defaultVisible: true },
  { key: 'date', label: 'Date', required: false, width: 'w-24', sortable: true, defaultVisible: true },
  { key: 'project', label: 'Project', required: false, width: 'w-48', sortable: true, defaultVisible: true },
  { key: 'payee', label: 'Payee', required: false, width: 'w-48', sortable: true, defaultVisible: true },
  { key: 'description', label: 'Description', required: false, defaultVisible: true },
  { key: 'category', label: 'Category', required: false, width: 'w-32', defaultVisible: true },
  { key: 'transaction_type', label: 'Type', required: false, width: 'w-24', defaultVisible: false },
  { key: 'amount', label: 'Amount', required: false, width: 'w-24', align: 'right', sortable: true, defaultVisible: true },
  { key: 'invoice_number', label: 'Invoice #', required: false, width: 'w-28', defaultVisible: false },
  { key: 'status_assigned', label: 'Assigned', required: false, width: 'w-20', align: 'center', defaultVisible: true },
  { key: 'status_allocated', label: 'Allocated', required: false, width: 'w-20', align: 'center', defaultVisible: true },
  { key: 'approval_status', label: 'Approval', required: false, width: 'w-24', align: 'center', defaultVisible: false },
  { key: 'actions', label: 'Actions', required: true, width: 'w-16', align: 'center', defaultVisible: true },
];
```

STEP 3: Add state for column visibility and order

Inside ExpensesList component, add:

```typescript
// Column visibility state with localStorage persistence
const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
  const saved = localStorage.getItem('expenses-visible-columns');
  if (saved) {
    return JSON.parse(saved);
  }
  // Default visible columns
  return EXPENSE_COLUMNS
    .filter(col => col.defaultVisible)
    .map(col => col.key);
});

// Column order state with localStorage persistence
const [columnOrder, setColumnOrder] = useState<string[]>(() => {
  const saved = localStorage.getItem('expenses-column-order');
  if (saved) {
    const savedOrder = JSON.parse(saved);
    // Add any new columns not in saved order
    const newColumns = EXPENSE_COLUMNS
      .map(col => col.key)
      .filter(key => !savedOrder.includes(key));
    return [...savedOrder, ...newColumns];
  }
  return EXPENSE_COLUMNS.map(col => col.key);
});

// Save to localStorage when changed
useEffect(() => {
  localStorage.setItem('expenses-visible-columns', JSON.stringify(visibleColumns));
}, [visibleColumns]);

useEffect(() => {
  localStorage.setItem('expenses-column-order', JSON.stringify(columnOrder));
}, [columnOrder]);

// Helper to check if column is visible
const isColumnVisible = (key: string) => {
  return visibleColumns.includes(key);
};

// Get ordered columns
const orderedColumns = columnOrder
  .map(key => EXPENSE_COLUMNS.find(col => col.key === key))
  .filter((col): col is ColumnDefinition => col !== undefined);
```

STEP 4: Add ColumnSelector to UI

Add above the table (in the controls section):

```typescript
{/* Controls Bar */}
<div className="flex items-center justify-between gap-3 mb-3">
  <div className="flex items-center gap-3 flex-1">
    {/* Search and other filters */}
  </div>
  
  {/* Column Selector */}
  <ColumnSelector
    columns={EXPENSE_COLUMNS}
    visibleColumns={visibleColumns}
    onVisibilityChange={setVisibleColumns}
    columnOrder={columnOrder}
    onColumnOrderChange={setColumnOrder}
  />
  
  <div className="text-xs text-muted-foreground">
    {displayData.filter(r => !r._isSplitRow).length} expenses
  </div>
</div>
```

STEP 5: Replace EntityTableTemplate with native table

```typescript
{/* Expenses Table */}
<div className="border rounded-md overflow-x-auto">
  <table className="w-full text-xs min-w-[1200px]">
    <thead className="bg-muted/50 sticky top-0 z-10">
      <tr>
        {orderedColumns.map(column => {
          if (!isColumnVisible(column.key)) return null;
          
          return (
            <th 
              key={column.key}
              className={cn(
                "p-2 font-medium",
                column.width,
                column.align === 'right' && "text-right",
                column.align === 'center' && "text-center",
                column.align !== 'right' && column.align !== 'center' && "text-left"
              )}
            >
              {column.label}
            </th>
          );
        })}
      </tr>
    </thead>
    <tbody>
      {displayData.map((row, index) => (
        <tr 
          key={row.id}
          className={cn(
            "border-t hover:bg-muted/30 transition-colors",
            row._isSplitRow && "bg-muted/10",
            !row._isSplitRow && index % 2 === 0 && "bg-background/50"
          )}
        >
          {orderedColumns.map(column => {
            if (!isColumnVisible(column.key)) return null;
            
            return (
              <td 
                key={column.key}
                className={cn(
                  "p-2",
                  column.align === 'right' && "text-right font-mono font-medium",
                  column.align === 'center' && "text-center"
                )}
              >
                {renderCell(row, column.key)}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
    
    {/* Footer with totals */}
    <tfoot className="border-t bg-muted/30">
      <tr>
        {orderedColumns.map((column, idx) => {
          if (!isColumnVisible(column.key)) return null;
          
          if (column.key === 'project') {
            return (
              <td key={column.key} className="p-2 font-medium text-xs">
                Total ({displayData.filter(r => !r._isSplitRow).length} expenses):
              </td>
            );
          } else if (column.key === 'amount') {
            return (
              <td key={column.key} className="p-2 text-right font-mono font-medium text-xs">
                {formatCurrency(
                  displayData
                    .filter(r => !r._isSplitRow)
                    .reduce((sum, r) => sum + r.amount, 0)
                )}
              </td>
            );
          } else {
            return <td key={column.key}></td>;
          }
        })}
      </tr>
    </tfoot>
  </table>
</div>
```

STEP 6: Create renderCell helper function

Add before return statement:

```typescript
const renderCell = (row: DisplayRow, columnKey: string) => {
  switch (columnKey) {
    case 'checkbox':
      return (
        <Checkbox
          checked={selectedExpenses.includes(row.id)}
          onCheckedChange={() => toggleExpenseSelection(row.id)}
          disabled={row._isSplitRow}
        />
      );
    
    case 'split':
      if (row._isSplitRow) return <div className="pl-4" />;
      if (!row.is_split) return null;
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => toggleExpanded(row.id)}
        >
          {expandedExpenses.has(row.id) ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
      );
    
    case 'date':
      if (row._isSplitRow && row._splitData) {
        return (
          <span className="text-muted-foreground font-mono">
            {row._splitData.split_percentage?.toFixed(1)}%
          </span>
        );
      }
      return (
        <span className="font-mono text-muted-foreground">
          {format(row.expense_date, 'M/d/yy')}
        </span>
      );
    
    case 'project':
      if (row._isSplitRow && row._splitData) {
        return (
          <div className="text-muted-foreground pl-2">
            {row._splitData.project_number && (
              <span className="font-mono text-[10px]">{row._splitData.project_number} • </span>
            )}
            <span className="text-xs">{row._splitData.project_name}</span>
          </div>
        );
      }
      return (
        <div className={cn(
          "text-xs",
          row.project_name?.includes("Unassigned") && "text-muted-foreground italic"
        )}>
          {row.project_number && (
            <span className="font-mono text-[10px] mr-1">{row.project_number}</span>
          )}
          {row.project_name}
        </div>
      );
    
    case 'payee':
      if (row._isSplitRow) return null;
      return (
        <div className="text-xs">
          {row.payee_name || (
            <span className="text-muted-foreground italic">No payee</span>
          )}
        </div>
      );
    
    case 'description':
      if (row._isSplitRow) return null;
      return (
        <div className="text-xs text-muted-foreground truncate max-w-xs">
          {row.description || '-'}
        </div>
      );
    
    case 'category':
      if (row._isSplitRow) return null;
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
          {EXPENSE_CATEGORY_DISPLAY[row.category]}
        </Badge>
      );
    
    case 'transaction_type':
      if (row._isSplitRow) return null;
      return (
        <span className="text-xs text-muted-foreground">
          {TRANSACTION_TYPE_DISPLAY[row.transaction_type]}
        </span>
      );
    
    case 'amount':
      if (row._isSplitRow && row._splitData) {
        return (
          <span className="font-mono font-medium text-muted-foreground">
            {formatCurrency(row._splitData.split_amount)}
          </span>
        );
      }
      return (
        <span className="font-mono font-medium">
          {formatCurrency(row.amount)}
        </span>
      );
    
    case 'invoice_number':
      if (row._isSplitRow) return null;
      return (
        <span className="text-xs font-mono text-muted-foreground">
          {row.invoice_number || '-'}
        </span>
      );
    
    case 'status_assigned':
      if (row._isSplitRow) return null;
      const isUnassigned = row.project_name?.includes("Unassigned");
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
          {isUnassigned ? (
            <AlertTriangle className="h-2.5 w-2.5" />
          ) : (
            <CheckCircle2 className="h-2.5 w-2.5" />
          )}
        </Badge>
      );
    
    case 'status_allocated':
      if (row._isSplitRow) return null;
      const isAllocated = expenseMatches[row.id]?.matched;
      return (
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] px-1.5 py-0 h-4",
            isAllocated ? "text-success border-success/50" : "text-warning border-warning/50"
          )}
        >
          {isAllocated ? (
            <CheckCircle2 className="h-2.5 w-2.5" />
          ) : (
            <AlertTriangle className="h-2.5 w-2.5" />
          )}
        </Badge>
      );
    
    case 'approval_status':
      if (row._isSplitRow) return null;
      return (
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] px-1.5 py-0 h-4",
            row.approval_status === 'approved' && "text-success border-success/50",
            row.approval_status === 'rejected' && "text-destructive border-destructive/50"
          )}
        >
          {row.approval_status || 'pending'}
        </Badge>
      );
    
    case 'actions':
      if (row._isSplitRow) return null;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Existing menu items */}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    
    default:
      return null;
  }
};
```

EXPECTED RESULT:
- ✅ ColumnSelector button in controls bar
- ✅ Click to show column picker popover
- ✅ Checkboxes to show/hide columns
- ✅ Drag handles to reorder columns
- ✅ "All" and "Reset" buttons
- ✅ LocalStorage persistence (remembers preferences)
- ✅ Timesheet compact styling
- ✅ All existing functionality preserved
- ✅ Table dynamically shows only selected columns in selected order

TEST:
1. Click "Columns (10/14)" button
2. Uncheck "Transaction Type" - column disappears
3. Drag "Amount" to top - column moves
4. Refresh page - preferences persist
5. Click "All" - all columns show
6. Click "Reset" - back to defaults
```

---

## 🎨 Visual Layout

**Controls Bar:**
```
┌─────────────────────────────────────────────────────────┐
│ [Search] [Status ▼] [Project ▼]  [Columns (10/14)] 234 │
└─────────────────────────────────────────────────────────┘
```

**ColumnSelector Popover:**
```
┌────────────────────────────┐
│ Show Columns    [All] [Reset] │
│ ─────────────────────────── │
│ ☰ ☑ Select      (required)  │
│ ☰ ☑ Date                    │
│ ☰ ☑ Project                 │
│ ☰ ☑ Payee                   │
│ ☰ ☑ Description             │
│ ☰ ☑ Category                │
│ ☰ ☐ Type         (hidden)   │
│ ☰ ☑ Amount                  │
│ ☰ ☐ Invoice #    (hidden)   │
│ ☰ ☑ Assigned                │
│ ☰ ☑ Allocated               │
│ ☰ ☐ Approval     (hidden)   │
│ ☰ ☑ Actions     (required)  │
└────────────────────────────┘
```

---

## ✅ Feature Checklist

**ColumnSelector Features:**
- [ ] Show/hide columns with checkboxes
- [ ] Drag-to-reorder columns (☰ handle)
- [ ] "Select All" button
- [ ] "Reset" button (to defaults)
- [ ] Required columns can't be hidden (grayed out)
- [ ] LocalStorage persistence
- [ ] Shows count: "Columns (10/14)"

**Timesheet Styling:**
- [ ] Ultra-compact spacing (p-2)
- [ ] Font-mono for numbers/dates
- [ ] Sticky header (bg-muted/50)
- [ ] Hover effects (hover:bg-muted/30)
- [ ] Alternating row colors
- [ ] Clean borders
- [ ] Professional appearance

**Existing Functionality:**
- [ ] Select expenses (checkbox)
- [ ] Split expense expand/collapse
- [ ] Actions dropdown menu
- [ ] Filters work
- [ ] Bulk actions work
- [ ] Allocation workflow works
- [ ] Edit/delete works

---

## 📊 Storage Format

**LocalStorage Keys:**
```typescript
'expenses-visible-columns': ["checkbox", "date", "project", ...]
'expenses-column-order': ["checkbox", "split", "date", ...]
```

---

## 🎯 Benefits Summary

1. **Customizable** - Users choose which columns to see
2. **Reorderable** - Drag columns to preferred order
3. **Persistent** - Remembers preferences across sessions
4. **Compact** - Timesheet styling shows more data
5. **Professional** - Excel/QuickBooks aesthetic
6. **All Columns Kept** - Nothing removed, just hideable
7. **Flexible** - Users can show all 14 or just 6 columns

---

## 🔄 Migration Notes

**For Existing Users:**
- First load will use default visible columns
- Can customize to their preference
- Preferences saved to LocalStorage
- Can reset to defaults anytime

**For New Users:**
- Sees sensible defaults (10/14 columns)
- Can explore ColumnSelector
- Can customize immediately

---

END OF UPDATED PLAN
