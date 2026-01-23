# Prompt 01: Update TypeScript Types

## Context
We are implementing a project category system to replace hardcoded project_number filtering. This prompt updates the TypeScript types.

## Reference Document
Read `/docs/project-category/03-TYPESCRIPT-TYPES.md` for full specifications.

## Task
Update `src/types/project.ts` to add category-based project classification.

## Changes Required

### 1. Add ProjectCategory Type

Add after the existing ProjectStatus type (around line 50):

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

Find the `Project` interface and add the `category` field after `status`:

```typescript
export interface Project {
  // ... existing fields ...
  status: ProjectStatus;
  category?: ProjectCategory;  // ADD THIS LINE
  start_date?: Date;
  // ... rest of existing fields ...
}
```

### 3. Add Category-Based Helper Functions

Add these new helper functions BEFORE the existing legacy helpers:

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
 */
export const getConstructionFilter = (): ProjectCategory => 'construction';

/**
 * Get the appropriate Supabase filter for expense contexts
 */
export const getExpenseContextFilter = (): ProjectCategory[] => ['construction', 'overhead'];
```

### 4. Keep Existing Legacy Helpers

**DO NOT REMOVE** the existing `SYSTEM_PROJECT_NUMBERS`, `OPERATIONAL_PROJECT_NUMBERS`, `isSystemProject`, `isOperationalProject`, or `shouldShowInGeneralLists`. These are needed for backward compatibility during the transition.

Add a comment above them:

```typescript
// ============================================================================
// Legacy Helpers (Keep for Backward Compatibility During Transition)
// ============================================================================
```

## Validation

After making changes, verify:
1. No TypeScript errors in the file
2. All existing exports still work
3. New exports are available

## Do Not

- Remove any existing functions or constants
- Change the signature of existing functions
- Modify unrelated parts of the file
