import { supabase } from '@/integrations/supabase/client';
import { ExpenseSplit, Expense } from '@/types/expense';

export interface CreateSplitInput {
  project_id: string;
  split_amount: number;
  notes?: string;
}

/**
 * Create splits for an expense across multiple projects
 * Validates that split totals match the expense amount
 */
export async function createExpenseSplits(
  expenseId: string,
  splits: CreateSplitInput[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get original expense amount for validation
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('id', expenseId)
      .single();
    
    if (expenseError) throw expenseError;
    if (!expense) throw new Error('Expense not found');
    
    // Validate split amounts
    const validation = validateSplitTotal(expense.amount, splits.map(s => s.split_amount));
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Calculate percentages for each split
    const splitsWithPercentages = splits.map(s => ({
      expense_id: expenseId,
      project_id: s.project_id,
      split_amount: s.split_amount,
      split_percentage: (s.split_amount / expense.amount) * 100,
      notes: s.notes
    }));
    
    // Insert all splits
    const { error: insertError } = await supabase
      .from('expense_splits')
      .insert(splitsWithPercentages);
    
    if (insertError) throw insertError;
    
    // Update parent expense to be a split container
    const { error: updateError } = await supabase
      .from('expenses')
      .update({
        project_id: null,
        is_split: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId);

    if (updateError) {
      // Rollback: delete the splits we just created
      await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expenseId);
      
      throw new Error(`Failed to update parent expense: ${updateError.message}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating expense splits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create splits'
    };
  }
}

/**
 * Get all splits for an expense with project details
 */
export async function getExpenseSplits(expenseId: string): Promise<ExpenseSplit[]> {
  try {
    const { data, error } = await supabase
      .from('expense_splits')
      .select(`
        *,
        projects (
          project_name,
          project_number
        )
      `)
      .eq('expense_id', expenseId)
      .order('created_at');
    
    if (error) throw error;
    
    return (data || []).map(split => ({
      id: split.id,
      expense_id: split.expense_id,
      project_id: split.project_id,
      split_amount: split.split_amount,
      split_percentage: split.split_percentage,
      notes: split.notes,
      created_at: new Date(split.created_at),
      updated_at: new Date(split.updated_at),
      created_by: split.created_by,
      project_name: split.projects?.project_name,
      project_number: split.projects?.project_number
    }));
  } catch (error) {
    console.error('Error fetching expense splits:', error);
    return [];
  }
}

/**
 * Update splits for an expense (deletes old splits and creates new ones)
 */
export async function updateExpenseSplits(
  expenseId: string,
  splits: CreateSplitInput[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing splits
    const deleteResult = await deleteExpenseSplits(expenseId);
    if (!deleteResult.success) {
      return deleteResult;
    }
    
    // Create new splits
    return await createExpenseSplits(expenseId, splits);
  } catch (error) {
    console.error('Error updating expense splits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update splits'
    };
  }
}

/**
 * Delete all splits for an expense
 * This converts the expense back to a single-project expense
 * Reverts parent expense to first split's project (or 000-UNASSIGNED if no splits found)
 */
export async function deleteExpenseSplits(expenseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get existing splits to determine which project to revert to
    const { data: existingSplits, error: fetchError } = await supabase
      .from('expense_splits')
      .select('project_id')
      .eq('expense_id', expenseId)
      .order('created_at')
      .limit(1);
    
    if (fetchError) throw fetchError;
    
    // Determine revert project: use first split's project, or UNASSIGNED if no splits
    const revertProjectId = existingSplits?.[0]?.project_id || '000-UNASSIGNED';
    
    // Update parent expense first (before deleting splits)
    const { error: updateError } = await supabase
      .from('expenses')
      .update({
        project_id: revertProjectId,
        is_split: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId);
    
    if (updateError) throw updateError;
    
    // Now delete all splits
    const { error: deleteError } = await supabase
      .from('expense_splits')
      .delete()
      .eq('expense_id', expenseId);
    
    if (deleteError) throw deleteError;
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting expense splits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete splits'
    };
  }
}

/**
 * Validate that split amounts sum to the expense total
 * Allows 0.01 tolerance for rounding errors
 */
export function validateSplitTotal(
  expenseAmount: number,
  splitAmounts: number[]
): { valid: boolean; error?: string } {
  const total = splitAmounts.reduce((sum, amt) => sum + amt, 0);
  const diff = Math.abs(total - expenseAmount);
  
  if (diff > 0.01) {
    return {
      valid: false,
      error: `Split total ($${total.toFixed(2)}) must equal expense amount ($${expenseAmount.toFixed(2)}). Difference: $${diff.toFixed(2)}`
    };
  }
  
  return { valid: true };
}

/**
 * Calculate split percentage for display
 */
export function calculateSplitPercentage(splitAmount: number, totalAmount: number): number {
  if (totalAmount === 0) return 0;
  return (splitAmount / totalAmount) * 100;
}

/**
 * Calculate the actual expense amount for a project, handling splits correctly
 * - If expense is split (project_id = SYS-000), only count split amounts for this project
 * - If expense is not split, only count if project_id matches
 * 
 * @param projectId - The project ID to calculate expenses for
 * @param expenses - Array of expenses to process
 * @returns The total expense amount for the project, correctly handling splits
 */
export async function calculateProjectExpenses(
  projectId: string, 
  expenses: Expense[]
): Promise<number> {
  let total = 0;
  
  for (const expense of expenses) {
    if (expense.is_split && expense.id) {
      // This is a split expense - get splits for this project only
      const splits = await getExpenseSplits(expense.id);
      const projectSplits = splits.filter(s => s.project_id === projectId);
      total += projectSplits.reduce((sum, split) => sum + split.split_amount, 0);
    } else if (expense.project_id === projectId) {
      // Regular expense assigned to this project
      total += expense.amount;
    }
    // Skip expenses that don't match (different project or split without matching split)
  }
  
  return total;
}

/**
 * Calculate total expenses across all projects, handling splits correctly
 * @param expenses - Array of expenses to process
 * @returns Object with total expenses and split-adjusted total
 */
export async function calculateTotalExpenses(
  expenses: Expense[]
): Promise<{ total: number; splitAdjustedTotal: number }> {
  let total = 0;
  let splitAdjustedTotal = 0;
  
  const processedSplitExpenses = new Set<string>();
  
  for (const expense of expenses) {
    total += expense.amount; // Always count full amount for total
    
    if (expense.is_split && expense.id && !processedSplitExpenses.has(expense.id)) {
      // Get splits for this expense
      const splits = await getExpenseSplits(expense.id);
      // For split-adjusted, sum all split amounts (should equal original, but use actual splits)
      splitAdjustedTotal += splits.reduce((sum, split) => sum + split.split_amount, 0);
      processedSplitExpenses.add(expense.id);
    } else if (!expense.is_split) {
      // Not split, count full amount
      splitAdjustedTotal += expense.amount;
    }
  }
  
  return { total, splitAdjustedTotal };
}

/**
 * Check if an expense has splits
 */
export async function expenseHasSplits(expenseId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('expense_splits')
      .select('id')
      .eq('expense_id', expenseId)
      .limit(1);
    
    if (error) throw error;
    
    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('Error checking expense splits:', error);
    return false;
  }
}
