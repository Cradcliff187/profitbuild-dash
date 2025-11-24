# Prompt 08: Update Expenses List

## Context
We are implementing a project category system to replace hardcoded project_number filtering. The ExpensesList component has several places that check for specific project numbers.

## Reference Document
Read `/docs/project-category-implementation/02-COMPONENT-UPDATES.md` for full context.

## Task
Update `src/components/ExpensesList.tsx` to use category-based project checks where appropriate.

## Changes Required

### 1. Add Import (at top of file)

Add to existing imports from '@/types/project':
```typescript
import { 
  isOperationalProject,
  isSystemProjectByCategory, 
  isOverheadProject,
  ProjectCategory 
} from '@/types/project';
```

### 2. Update Match Status Filter Logic (around line 280)

Find the filter logic for "unassigned" status:
```typescript
if (status === "unassigned") {
  return expense.project_number === "000-UNASSIGNED";
}
```

This can stay as-is for now since it's checking for a specific UX state (expenses that need project assignment). The project_number check is appropriate here.

**NO CHANGE NEEDED** - This is checking for a specific workflow state, not filtering project visibility.

### 3. Update Line Item Allocation Render (around line 450)

Find:
```typescript
const isPlaceholder =
  row.project_number === "000-UNASSIGNED" ||
  row.project_number === "SYS-000" ||
  (row.project_number && isOperationalProject(row.project_number));
```

Replace with:
```typescript
// Check if this is a non-construction project (can't allocate to line items)
const isPlaceholder =
  isSystemProjectByCategory(row.category as ProjectCategory) ||
  isOverheadProject(row.category as ProjectCategory) ||
  // Backward compatibility: check project_number if category not set
  (!row.category && (
    row.project_number === "000-UNASSIGNED" ||
    row.project_number === "SYS-000" ||
    (row.project_number && isOperationalProject(row.project_number))
  ));
```

### 4. Ensure DisplayRow Type Includes Category

Find the DisplayRow interface or type (may be inline) and ensure it includes category:

```typescript
interface DisplayRow {
  // ... existing fields
  category?: string;  // ADD IF NOT PRESENT
}
```

### 5. Update Any Other Hardcoded Project Number Checks

Search the file for any other occurrences of:
- `'SYS-000'`
- `'000-UNASSIGNED'`
- `'001-GAS'`

For each occurrence, evaluate:
- If it's checking for UX state (like "needs assignment"), keep it
- If it's filtering visibility, add category-based check with backward compatibility

## Notes

The ExpensesList is complex and some project_number checks are intentional for specific UX purposes:

1. **"Unassigned" filter** - Checking `project_number === "000-UNASSIGNED"` is correct because it's identifying a workflow state (expenses that need to be assigned to a real project).

2. **Line item allocation** - This should use category because it's determining whether the expense CAN be allocated, not what state it's in.

3. **Split parent detection** - Uses `is_split` flag and `project_number === 'SYS-000'` - the project_number check is a backup validation.

## Validation

After making changes:
1. No TypeScript errors
2. Expense list loads without errors
3. "Unassigned" filter still works correctly
4. Line item allocation column shows correct status for:
   - Construction projects: Show allocation status
   - Overhead projects (001-GAS): Show dash/placeholder
   - System projects: Show dash/placeholder
5. All other filters and sorting work correctly

## Do Not

- Remove backward compatibility checks (project_number fallbacks)
- Change the "unassigned" filter logic (it's correct as-is)
- Modify split expense handling
- Change how expenses are displayed or edited
