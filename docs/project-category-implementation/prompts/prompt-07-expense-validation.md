# Prompt 07: Update Expense Validation

## Context
We are implementing a project category system to replace hardcoded project_number filtering. The expense validation utilities need to check project category instead of project numbers.

## Reference Document
Read `/docs/project-category-implementation/02-COMPONENT-UPDATES.md` for full context.

## Task
Update `src/utils/expenseValidation.ts` to use category-based project checks.

## Changes Required

### 1. Update Imports (at top of file)

Find:
```typescript
import { Expense } from '@/types/expense';
import { isOperationalProject } from '@/types/project';
```

Replace with:
```typescript
import { Expense } from '@/types/expense';
import { isOperationalProject, isSystemProjectByCategory, isOverheadProject, ProjectCategory } from '@/types/project';
```

### 2. Update `canCorrelateExpense()` Function

Find the entire function and replace with:

```typescript
/**
 * Validates whether an expense can be directly correlated to line items
 * Split parent expenses (with is_split=true or system category) cannot be correlated
 * Overhead projects (e.g., 001-GAS, 002-GA) cannot be correlated
 * Only individual split records or regular construction expenses can be correlated
 * 
 * @param expense - The expense to validate (can be Expense or EnhancedExpense)
 * @returns Object with isValid flag and error message if invalid
 */
export function canCorrelateExpense(
  expense: Pick<Expense, 'is_split' | 'project_id' | 'project_number'> & { category?: ProjectCategory }
): { 
  isValid: boolean; 
  error?: string 
} {
  // Check if this is a split parent container (by is_split flag or system category)
  if (expense.is_split) {
    return {
      isValid: false,
      error: 'Cannot correlate split parent expenses. Please correlate the individual split records instead.'
    };
  }
  
  // Check by category first (preferred)
  if (expense.category) {
    if (isSystemProjectByCategory(expense.category)) {
      return {
        isValid: false,
        error: 'Cannot correlate system project expenses.'
      };
    }
    
    if (isOverheadProject(expense.category)) {
      return {
        isValid: false,
        error: 'Overhead expenses cannot be allocated to line items.'
      };
    }
  }
  
  // Backward compatibility: check project_number if category not available
  if (!expense.category && expense.project_number) {
    if (expense.project_number === 'SYS-000' || expense.project_number === '000-UNASSIGNED') {
      return {
        isValid: false,
        error: 'Cannot correlate system project expenses.'
      };
    }
    
    if (isOperationalProject(expense.project_number)) {
      return {
        isValid: false,
        error: 'Overhead expenses cannot be allocated to line items.'
      };
    }
  }
  
  // Regular construction expense - can be correlated
  return { isValid: true };
}
```

### 3. Update `validateExpensesForCorrelation()` Function

Update the generic type constraint to include category:

Find:
```typescript
export function validateExpensesForCorrelation<T extends Pick<Expense, 'is_split' | 'project_id' | 'project_number'>>(expenses: T[]): {
```

Replace with:
```typescript
export function validateExpensesForCorrelation<T extends Pick<Expense, 'is_split' | 'project_id' | 'project_number'> & { category?: ProjectCategory }>(expenses: T[]): {
```

## Validation

After making changes:
1. No TypeScript errors
2. All existing tests pass (if any)
3. Split parent expenses are correctly rejected
4. System project expenses are correctly rejected
5. Overhead project expenses are correctly rejected
6. Construction project expenses are correctly allowed
7. Backward compatibility works (expenses without category field)

## Do Not

- Remove the project_number fallback checks (needed for backward compatibility)
- Change the function signatures beyond what's specified
- Modify the validateExpensesForCorrelation logic (only the type constraint)
