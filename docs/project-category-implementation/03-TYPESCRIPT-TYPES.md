# TypeScript Types Updates

## File: src/types/project.ts

This file needs updates to add category-based type definitions and helper functions while maintaining backward compatibility.

## Changes Required

### 1. Add ProjectCategory Type

Add after the existing type definitions (around line 50):

```typescript
// ============================================================================
// Project Category System
// ============================================================================
// Categories replace hardcoded project_number filtering:
// - 'construction': Real job projects (default) - visible everywhere
// - 'system': Internal projects (SYS-000, 000-UNASSIGNED) - completely hidden
// - 'overhead': Overhead buckets (001-GAS, 002-GA) - visible in expenses/receipts only

export type ProjectCategory = 'construction' | 'system' | 'overhead';
```

### 2. Update Project Interface

Add the `category` field to the Project interface:

```typescript
export interface Project {
  id: string;
  project_name: string;
  project_number: string;
  qb_formatted_number?: string;
  client_name: string;
  address?: string;
  project_type: ProjectType;
  job_type?: string;
  status: ProjectStatus;
  category?: ProjectCategory;  // ADD THIS LINE
  start_date?: Date;
  end_date?: Date;
  // ... rest of existing fields
}
```

### 3. Add Category-Based Helper Functions

Add these new helper functions after the existing ones:

```typescript
// ============================================================================
// Category-Based Helper Functions (Preferred - Use These Going Forward)
// ============================================================================

/**
 * Check if project is a construction project (real job)
 * Returns true for undefined/null category for backward compatibility
 */
export const isConstructionProject = (category?: ProjectCategory | null): boolean => 
  category === 'construction' || category === undefined || category === null;

/**
 * Check if project is an overhead project (001-GAS, 002-GA, etc.)
 * These are visible only in expense and receipt contexts
 */
export const isOverheadProject = (category?: ProjectCategory | null): boolean => 
  category === 'overhead';

/**
 * Check if project is a system project (SYS-000, 000-UNASSIGNED)
 * These are completely hidden from users
 */
export const isSystemProjectByCategory = (category?: ProjectCategory | null): boolean => 
  category === 'system';

/**
 * Check if project should be shown in general lists (dashboard, projects page)
 * Only construction projects should appear
 */
export const shouldShowInConstructionLists = (category?: ProjectCategory | null): boolean => 
  isConstructionProject(category);

/**
 * Check if project should be shown in expense/receipt selectors
 * Both construction and overhead projects should appear
 */
export const shouldShowInExpenseContext = (category?: ProjectCategory | null): boolean => 
  category === 'construction' || category === 'overhead';

/**
 * Get the appropriate Supabase filter for construction-only contexts
 * Use with: .eq('category', getConstructionFilter())
 */
export const getConstructionFilter = (): ProjectCategory => 'construction';

/**
 * Get the appropriate Supabase filter for expense contexts
 * Use with: .in('category', getExpenseContextFilter())
 */
export const getExpenseContextFilter = (): ProjectCategory[] => ['construction', 'overhead'];
```

### 4. Keep Existing Functions (Backward Compatibility)

**DO NOT REMOVE** these existing definitions - they are needed during the transition:

```typescript
// ============================================================================
// Legacy Project Number-Based Helpers (Keep for Backward Compatibility)
// ============================================================================
// These will be deprecated once all components migrate to category-based filtering

// System placeholder projects - completely hidden from users
export const SYSTEM_PROJECT_NUMBERS = ['SYS-000', '000-UNASSIGNED'] as const;

// Operational projects - visible only in time tracking & expenses
export const OPERATIONAL_PROJECT_NUMBERS = ['001-GAS'] as const;

export type SystemProjectNumber = typeof SYSTEM_PROJECT_NUMBERS[number];
export type OperationalProjectNumber = typeof OPERATIONAL_PROJECT_NUMBERS[number];

// Legacy helper functions
export const isSystemProject = (projectNumber: string): boolean => {
  return SYSTEM_PROJECT_NUMBERS.includes(projectNumber as SystemProjectNumber);
};

export const isOperationalProject = (projectNumber: string): boolean => {
  return OPERATIONAL_PROJECT_NUMBERS.includes(projectNumber as OperationalProjectNumber);
};

export const shouldShowInGeneralLists = (projectNumber: string): boolean => {
  return !isSystemProject(projectNumber) && !isOperationalProject(projectNumber);
};
```

## Complete Updated File Structure

After updates, the relevant section of `src/types/project.ts` should look like:

```typescript
// ... existing imports and types ...

export interface Project {
  id: string;
  project_name: string;
  project_number: string;
  qb_formatted_number?: string;
  client_name: string;
  address?: string;
  project_type: ProjectType;
  job_type?: string;
  status: ProjectStatus;
  category?: ProjectCategory;  // NEW
  start_date?: Date;
  end_date?: Date;
  payment_terms?: string;
  quickbooks_job_id?: string;
  sync_status?: 'success' | 'failed' | 'pending' | null;
  last_synced_at?: string | null;
  contracted_amount?: number | null;
  total_accepted_quotes?: number | null;
  current_margin?: number | null;
  margin_percentage?: number | null;
  contingency_remaining?: number | null;
  minimum_margin_threshold?: number | null;
  target_margin?: number | null;
  original_margin?: number | null;
  projected_margin?: number | null;
  adjusted_est_costs?: number | null;
  original_est_costs?: number | null;
  notes?: string | null;
  customer_po_number?: string | null;
  created_at: Date;
  updated_at: Date;
}

// ... existing ProjectType, ProjectStatus, etc. ...

// ============================================================================
// Project Category System (NEW)
// ============================================================================

export type ProjectCategory = 'construction' | 'system' | 'overhead';

export const isConstructionProject = (category?: ProjectCategory | null): boolean => 
  category === 'construction' || category === undefined || category === null;

export const isOverheadProject = (category?: ProjectCategory | null): boolean => 
  category === 'overhead';

export const isSystemProjectByCategory = (category?: ProjectCategory | null): boolean => 
  category === 'system';

export const shouldShowInConstructionLists = (category?: ProjectCategory | null): boolean => 
  isConstructionProject(category);

export const shouldShowInExpenseContext = (category?: ProjectCategory | null): boolean => 
  category === 'construction' || category === 'overhead';

export const getConstructionFilter = (): ProjectCategory => 'construction';

export const getExpenseContextFilter = (): ProjectCategory[] => ['construction', 'overhead'];

// ============================================================================
// Legacy Helpers (Keep for Backward Compatibility)
// ============================================================================

export const SYSTEM_PROJECT_NUMBERS = ['SYS-000', '000-UNASSIGNED'] as const;
export const OPERATIONAL_PROJECT_NUMBERS = ['001-GAS'] as const;

export type SystemProjectNumber = typeof SYSTEM_PROJECT_NUMBERS[number];
export type OperationalProjectNumber = typeof OPERATIONAL_PROJECT_NUMBERS[number];

export const isSystemProject = (projectNumber: string): boolean => {
  return SYSTEM_PROJECT_NUMBERS.includes(projectNumber as SystemProjectNumber);
};

export const isOperationalProject = (projectNumber: string): boolean => {
  return OPERATIONAL_PROJECT_NUMBERS.includes(projectNumber as OperationalProjectNumber);
};

export const shouldShowInGeneralLists = (projectNumber: string): boolean => {
  return !isSystemProject(projectNumber) && !isOperationalProject(projectNumber);
};

// ... rest of existing file (generateProjectNumber, ProjectMedia, etc.) ...
```

## Usage Examples

### In Components (Construction-Only Context)

```typescript
import { ProjectCategory, isConstructionProject } from '@/types/project';

// Supabase query
const { data } = await supabase
  .from('projects')
  .select('*, category')
  .eq('category', 'construction');

// Client-side filter (if needed)
const constructionProjects = projects.filter(p => isConstructionProject(p.category));
```

### In Components (Expense/Receipt Context)

```typescript
import { getExpenseContextFilter, shouldShowInExpenseContext } from '@/types/project';

// Supabase query
const { data } = await supabase
  .from('projects')
  .select('*, category')
  .in('category', getExpenseContextFilter());

// Client-side filter (if needed)
const expenseProjects = projects.filter(p => shouldShowInExpenseContext(p.category));
```
