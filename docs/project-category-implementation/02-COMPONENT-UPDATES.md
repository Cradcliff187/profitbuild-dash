# Component Updates - Complete Inventory

## Summary

There are **18 locations** across **12 files** that need updates to use category-based filtering instead of hardcoded project numbers.

## Update Pattern

### Before (Current)
```typescript
.neq('project_number', 'SYS-000')
.neq('project_number', '000-UNASSIGNED')
.neq('project_number', '001-GAS')
```

### After (New)
```typescript
// For construction-only contexts (dashboard, projects page, time tracker)
.eq('category', 'construction')

// For expense/receipt contexts (includes overhead)
.in('category', ['construction', 'overhead'])
```

---

## Category A: Dashboard & Pages

### 1. src/pages/Dashboard.tsx

**Location 1: `loadActiveProjectCount()` (around line 95)**
```typescript
// BEFORE
const { data, error } = await supabase
  .from('projects')
  .select('id, status')
  .neq('project_number', 'SYS-000')
  .neq('project_number', '000-UNASSIGNED')
  .neq('project_number', '001-GAS');

// AFTER
const { data, error } = await supabase
  .from('projects')
  .select('id, status, category')
  .eq('category', 'construction');
```

**Location 2: `loadProjectStatusCounts()` (around line 110)**
```typescript
// BEFORE
const { data, error } = await supabase
  .from('projects')
  .select('status')
  .neq('project_number', 'SYS-000')
  .neq('project_number', '000-UNASSIGNED')
  .neq('project_number', '001-GAS');

// AFTER
const { data, error } = await supabase
  .from('projects')
  .select('status, category')
  .eq('category', 'construction');
```

**Location 3: `loadFinancialMetrics()` (around line 180)**
```typescript
// BEFORE
const { data: activeProjects, error: activeError } = await supabase
  .from('projects')
  .select('contracted_amount, adjusted_est_costs, projected_margin, margin_percentage')
  .in('status', ['approved', 'in_progress'])
  .neq('project_number', 'SYS-000')
  .neq('project_number', '000-UNASSIGNED')
  .neq('project_number', '001-GAS');

// AFTER
const { data: activeProjects, error: activeError } = await supabase
  .from('projects')
  .select('contracted_amount, adjusted_est_costs, projected_margin, margin_percentage, category')
  .in('status', ['approved', 'in_progress'])
  .eq('category', 'construction');
```

### 2. src/pages/Projects.tsx

**Location 4: `loadProjects()` (around line 65)**
```typescript
// BEFORE
const [projectsRes, estimatesRes, quotesRes, expensesRes, changeOrdersRes] = await Promise.all([
  supabase.from('projects').select('*').neq('project_number', 'SYS-000').neq('project_number', '000-UNASSIGNED').neq('project_number', '001-GAS').order('created_at', { ascending: false }),
  // ...
]);

// AFTER
const [projectsRes, estimatesRes, quotesRes, expensesRes, changeOrdersRes] = await Promise.all([
  supabase.from('projects').select('*').eq('category', 'construction').order('created_at', { ascending: false }),
  // ...
]);
```

---

## Category B: Time Tracking Components

### 3. src/components/time-tracker/MobileTimeTracker.tsx

**Location 5: `loadInitialData()` query (around line 85)**
```typescript
// BEFORE
const { data: projectsData, error: projectsError } = await supabase
  .from('projects')
  .select('id, project_number, project_name, client_name, address')
  .in('status', ['approved', 'in_progress'])
  .neq('project_number', '000-UNASSIGNED')
  .neq('project_number', 'SYS-000')
  .neq('project_number', '001-GAS')
  .order('project_number', { ascending: false })
  .limit(20);

// AFTER
const { data: projectsData, error: projectsError } = await supabase
  .from('projects')
  .select('id, project_number, project_name, client_name, address, category')
  .in('status', ['approved', 'in_progress'])
  .eq('category', 'construction')
  .order('project_number', { ascending: false })
  .limit(20);
```

**Location 6: Local `isSystemProject` function (around line 60)**
```typescript
// BEFORE
const isSystemProject = (num: string) => 
  !!num && (num === 'SYS-000' || num === '000-UNASSIGNED' || num.startsWith('SYS-'));

// AFTER
// Import at top of file:
import { isSystemProjectByCategory, ProjectCategory } from '@/types/project';

// Replace function with:
const isNonConstructionProject = (category?: ProjectCategory) => 
  category === 'system' || category === 'overhead';
```

**Location 7: Defense-in-depth filter (around line 100)**
```typescript
// BEFORE
const cleanedProjects = (projectsData || []).filter(
  p => p.project_number !== '000-UNASSIGNED' && 
       p.project_number !== 'SYS-000' && 
       !p.project_number.startsWith('SYS-')
);

// AFTER
const cleanedProjects = (projectsData || []).filter(
  p => p.category === 'construction'
);
```

---

## Category C: Project Selectors

### 4. src/components/FieldProjectSelector.tsx

**Location 8: useQuery queryFn (around line 55)**
```typescript
// BEFORE
const { data, error } = await supabase
  .from('projects')
  .select('id, project_number, project_name, client_name, status')
  .neq('project_number', 'SYS-000')
  .neq('project_number', '000-UNASSIGNED')
  .neq('project_number', '001-GAS')
  .order('project_number', { ascending: false });

// AFTER
const { data, error } = await supabase
  .from('projects')
  .select('id, project_number, project_name, client_name, status, category')
  .eq('category', 'construction')
  .order('project_number', { ascending: false });
```

**Location 9: Project interface (around line 40)**
```typescript
// BEFORE
interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string;
  status: string;
}

// AFTER
interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string;
  status: string;
  category: string;
}
```

---

## Category D: Receipt Components

### 5. src/components/time-tracker/AddReceiptModal.tsx

**Location 10: `loadProjects()` function (around line 55-80)**
```typescript
// BEFORE
const loadProjects = async () => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_number, project_name, status')
      .order('project_name');

    if (error) throw error;
    
    const sysProject = data?.find(p => p.project_number === UNASSIGNED_RECEIPTS_PROJECT_NUMBER);
    if (sysProject) {
      setSystemProjectId(sysProject.id);
    }
    
    const pinnedProjects = data?.filter(p => 
      p.project_number === '001-GAS'
    ) || [];
    
    const regularProjects = data?.filter(p => 
      !['SYS-000', '000-UNASSIGNED', '001-GAS'].includes(p.project_number) &&
      (p.status === 'approved' || p.status === 'in_progress')
    ) || [];
    
    setProjects([...pinnedProjects, ...regularProjects]);
  } catch (error) {
    console.error('Failed to load projects:', error);
    toast.error('Failed to load projects');
  }
};

// AFTER
const loadProjects = async () => {
  try {
    // Get system project ID for unassigned fallback
    const { data: sysProject } = await supabase
      .from('projects')
      .select('id')
      .eq('project_number', 'SYS-000')
      .single();
    
    if (sysProject) {
      setSystemProjectId(sysProject.id);
    }
    
    // Get overhead projects (pinned at top of list)
    const { data: overheadProjects, error: overheadError } = await supabase
      .from('projects')
      .select('id, project_number, project_name, status, category')
      .eq('category', 'overhead')
      .in('status', ['approved', 'in_progress'])
      .order('project_number', { ascending: true });
    
    if (overheadError) throw overheadError;
    
    // Get construction projects
    const { data: constructionProjects, error: constructionError } = await supabase
      .from('projects')
      .select('id, project_number, project_name, status, category')
      .eq('category', 'construction')
      .in('status', ['approved', 'in_progress'])
      .order('project_number', { ascending: false });
    
    if (constructionError) throw constructionError;
    
    // Combine: overhead first (pinned), then construction projects
    setProjects([...(overheadProjects || []), ...(constructionProjects || [])]);
  } catch (error) {
    console.error('Failed to load projects:', error);
    toast.error('Failed to load projects');
  }
};
```

### 6. src/components/time-tracker/EditReceiptModal.tsx

**Location 11: `loadProjects()` function (around line 60)**
```typescript
// BEFORE
const { data, error } = await supabase
  .from('projects')
  .select('id, project_name, project_number')
  .in('status', ['approved', 'in_progress'])
  .not('project_number', 'in', '("000-UNASSIGNED","SYS-000")')
  .order('project_name');

// AFTER
const { data, error } = await supabase
  .from('projects')
  .select('id, project_name, project_number, category')
  .in('status', ['approved', 'in_progress'])
  .in('category', ['construction', 'overhead'])
  .order('project_name');
```

---

## Category E: Expense Components

### 7. src/components/ExpensesList.tsx

**Location 12: Match status filter logic (around line 280)**
```typescript
// BEFORE
if (status === "unassigned") {
  return expense.project_number === "000-UNASSIGNED";
}

// AFTER (keep for backward compatibility, but add category check)
if (status === "unassigned") {
  return expense.project_number === "000-UNASSIGNED" || expense.category === 'system';
}
```

**Location 13: Line item allocation render (around line 450)**
```typescript
// BEFORE
const isPlaceholder =
  row.project_number === "000-UNASSIGNED" ||
  row.project_number === "SYS-000" ||
  (row.project_number && isOperationalProject(row.project_number));

// AFTER
import { isSystemProjectByCategory, isOverheadProject, ProjectCategory } from '@/types/project';

const isPlaceholder =
  isSystemProjectByCategory(row.category as ProjectCategory) ||
  isOverheadProject(row.category as ProjectCategory);
```

---

## Category F: Utility Functions

### 8. src/utils/expenseValidation.ts

**Location 14: `canCorrelateExpense()` function**
```typescript
// BEFORE
export function canCorrelateExpense(expense: Pick<Expense, 'is_split' | 'project_id' | 'project_number'>): { 
  isValid: boolean; 
  error?: string 
} {
  if (expense.is_split || expense.project_number === 'SYS-000') {
    return {
      isValid: false,
      error: 'Cannot correlate split parent expenses...'
    };
  }
  
  if (expense.project_number && isOperationalProject(expense.project_number)) {
    return {
      isValid: false,
      error: 'Tracking project expenses cannot be allocated to line items.'
    };
  }
  
  return { isValid: true };
}

// AFTER
import { isSystemProjectByCategory, isOverheadProject, ProjectCategory } from '@/types/project';

export function canCorrelateExpense(
  expense: Pick<Expense, 'is_split' | 'project_id' | 'project_number'> & { category?: ProjectCategory }
): { 
  isValid: boolean; 
  error?: string 
} {
  // Check if this is a split parent container
  if (expense.is_split || isSystemProjectByCategory(expense.category)) {
    return {
      isValid: false,
      error: 'Cannot correlate split parent expenses. Please correlate the individual split records instead.'
    };
  }
  
  // Check if this is an overhead project
  if (isOverheadProject(expense.category)) {
    return {
      isValid: false,
      error: 'Overhead expenses cannot be allocated to line items.'
    };
  }
  
  // Backward compatibility: check project_number if category not available
  if (!expense.category && expense.project_number) {
    if (expense.project_number === 'SYS-000' || expense.project_number === '000-UNASSIGNED') {
      return {
        isValid: false,
        error: 'Cannot correlate system project expenses.'
      };
    }
  }
  
  return { isValid: true };
}
```

### 9. src/utils/expenseSplits.ts

**Location 15-16: Keep as-is**

The `getSys000ProjectId()` and `getUnassignedProjectId()` functions query by `project_number` which is correct. These are looking up specific known projects, not filtering lists.

**NO CHANGES NEEDED** for these functions.

---

## Category G: Archived Components

### src/_archived/components/GlobalExpenseMatching.tsx

**NO CHANGES NEEDED** - This file is archived and not in use.

---

## Testing Checklist

After each component update:

- [ ] Component loads without errors
- [ ] Correct projects appear in lists/dropdowns
- [ ] System projects (SYS-000, 000-UNASSIGNED) are hidden where expected
- [ ] Overhead projects (001-GAS) appear only in expense/receipt contexts
- [ ] Construction projects appear everywhere expected
- [ ] Existing functionality still works (CRUD operations, etc.)
