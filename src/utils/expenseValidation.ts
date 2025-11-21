import { Expense } from '@/types/expense';
import { isOperationalProject } from '@/types/project';

/**
 * Validates whether an expense can be directly correlated to line items
 * Split parent expenses (with is_split=true or project_id=SYS-000) cannot be correlated
 * Operational tracking projects (e.g., 001-GAS) cannot be correlated
 * Only individual split records or regular expenses can be correlated
 * 
 * @param expense - The expense to validate (can be Expense or EnhancedExpense)
 * @returns Object with isValid flag and error message if invalid
 */
export function canCorrelateExpense(expense: Pick<Expense, 'is_split' | 'project_id' | 'project_number'>): { 
  isValid: boolean; 
  error?: string 
} {
  // Check if this is a split parent container
  if (expense.is_split || expense.project_number === 'SYS-000') {
    return {
      isValid: false,
      error: 'Cannot correlate split parent expenses. Please correlate the individual split records instead.'
    };
  }
  
  // Check if this is an operational tracking project (e.g., Gas, Equipment)
  if (expense.project_number && isOperationalProject(expense.project_number)) {
    return {
      isValid: false,
      error: 'Tracking project expenses cannot be allocated to line items.'
    };
  }
  
  // Regular expense or split record - can be correlated
  return { isValid: true };
}

/**
 * Validates a batch of expenses for correlation
 * Returns list of invalid expenses with reasons
 */
export function validateExpensesForCorrelation<T extends Pick<Expense, 'is_split' | 'project_id' | 'project_number'>>(expenses: T[]): {
  valid: T[];
  invalid: Array<{ expense: T; reason: string }>;
} {
  const valid: T[] = [];
  const invalid: Array<{ expense: T; reason: string }> = [];
  
  for (const expense of expenses) {
    const validation = canCorrelateExpense(expense);
    if (validation.isValid) {
      valid.push(expense);
    } else {
      invalid.push({ 
        expense, 
        reason: validation.error || 'Cannot correlate this expense' 
      });
    }
  }
  
  return { valid, invalid };
}
