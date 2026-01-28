/**
 * @file revenueSplits.ts
 * @description Utility functions for managing revenue splits
 * 
 * Pattern mirrors existing src/utils/expenseSplits.ts implementation.
 * Provides CRUD operations and validation for splitting invoices across projects.
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  RevenueSplit, 
  CreateRevenueSplitInput, 
  ProjectRevenue,
  RevenueSplitResult,
  SplitValidationResult 
} from '@/types/revenue';

// ============================================================================
// CONSTANTS
// ============================================================================

const SYS_000_PROJECT_NUMBER = 'SYS-000';
const SPLIT_TOLERANCE = 0.01; // Allow 1 cent tolerance for rounding

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create splits for a revenue record
 * This will:
 * 1. Get SYS-000 project ID
 * 2. Update parent revenue to point to SYS-000 and set is_split = true
 * 3. Create split records for each project allocation
 * 
 * @param revenueId - The parent revenue ID
 * @param splits - Array of split allocations
 * @returns Success/error result
 */
export async function createRevenueSplits(
  revenueId: string,
  splits: CreateRevenueSplitInput[]
): Promise<RevenueSplitResult> {
  try {
    // Validate minimum splits
    if (splits.length < 2) {
      return {
        success: false,
        error: 'At least 2 splits are required'
      };
    }

    // Get SYS-000 project ID
    const { data: sysProject, error: sysError } = await supabase
      .from('projects')
      .select('id')
      .eq('project_number', SYS_000_PROJECT_NUMBER)
      .single();

    if (sysError || !sysProject) {
      return {
        success: false,
        error: 'System project (SYS-000) not found. Please run database migration.'
      };
    }

    // Get parent revenue for validation (include project_id for rollback)
    const { data: parentRevenue, error: parentError } = await supabase
      .from('project_revenues')
      .select('amount, project_id')
      .eq('id', revenueId)
      .single();

    if (parentError || !parentRevenue) {
      return {
        success: false,
        error: 'Parent revenue record not found'
      };
    }

    // Validate no negative or zero split amounts
    const invalidSplit = splits.find(s => s.split_amount <= 0);
    if (invalidSplit) {
      return { success: false, error: 'All split amounts must be positive' };
    }

    // Validate split total matches parent amount
    const validation = validateSplitTotal(parentRevenue.amount, splits.map(s => s.split_amount));
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Update parent revenue to SYS-000 and mark as split
    const { error: updateError } = await supabase
      .from('project_revenues')
      .update({
        project_id: sysProject.id,
        is_split: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', revenueId);

    if (updateError) {
      throw updateError;
    }

    // Create split records
    const splitRecords = splits.map(split => ({
      revenue_id: revenueId,
      project_id: split.project_id,
      split_amount: split.split_amount,
      split_percentage: split.split_percentage || 
        calculateSplitPercentage(split.split_amount, parentRevenue.amount),
      notes: split.notes || null
    }));

    const { data: createdSplits, error: insertError } = await supabase
      .from('revenue_splits')
      .insert(splitRecords)
      .select(`
        *,
        projects (
          project_name,
          project_number
        )
      `);

    if (insertError) {
      // Rollback parent update: restore original project_id and is_split flag
      await supabase
        .from('project_revenues')
        .update({
          project_id: parentRevenue.project_id,
          is_split: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', revenueId);
      throw insertError;
    }

    return {
      success: true,
      splits: transformSplitsResponse(createdSplits)
    };
  } catch (error) {
    console.error('Error creating revenue splits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create splits'
    };
  }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all splits for a revenue with project details
 * 
 * @param revenueId - The parent revenue ID
 * @returns Array of splits with project info
 */
export async function getRevenueSplits(revenueId: string): Promise<RevenueSplit[]> {
  try {
    const { data, error } = await supabase
      .from('revenue_splits')
      .select(`
        *,
        projects (
          project_name,
          project_number
        )
      `)
      .eq('revenue_id', revenueId)
      .order('created_at');

    if (error) throw error;

    return transformSplitsResponse(data || []);
  } catch (error) {
    console.error('Error fetching revenue splits:', error);
    return [];
  }
}

/**
 * Check if a revenue has splits
 * 
 * @param revenueId - The revenue ID to check
 * @returns Boolean indicating if splits exist
 */
export async function revenueHasSplits(revenueId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('revenue_splits')
      .select('id')
      .eq('revenue_id', revenueId)
      .limit(1);

    if (error) throw error;

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('Error checking revenue splits:', error);
    return false;
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update splits for a revenue (deletes old splits and creates new ones)
 * 
 * @param revenueId - The parent revenue ID
 * @param splits - New split allocations
 * @returns Success/error result
 */
export async function updateRevenueSplits(
  revenueId: string,
  splits: CreateRevenueSplitInput[]
): Promise<RevenueSplitResult> {
  try {
    // Delete existing splits first
    const deleteResult = await deleteRevenueSplitsOnly(revenueId);
    if (!deleteResult.success) {
      return deleteResult;
    }

    // Create new splits
    return await createRevenueSplits(revenueId, splits);
  } catch (error) {
    console.error('Error updating revenue splits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update splits'
    };
  }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete all splits for a revenue and revert to single-project assignment
 * Reverts parent revenue to first split's project (or 000-UNASSIGNED if no splits)
 * 
 * @param revenueId - The parent revenue ID
 * @returns Success/error result
 */
export async function deleteRevenueSplits(revenueId: string): Promise<RevenueSplitResult> {
  try {
    // Get existing splits to determine revert project
    const { data: existingSplits, error: fetchError } = await supabase
      .from('revenue_splits')
      .select('project_id')
      .eq('revenue_id', revenueId)
      .order('created_at')
      .limit(1);

    if (fetchError) throw fetchError;

    // Determine revert project
    let revertProjectId: string;
    if (existingSplits && existingSplits.length > 0) {
      revertProjectId = existingSplits[0].project_id;
    } else {
      // Fallback to 000-UNASSIGNED
      const { data: unassigned } = await supabase
        .from('projects')
        .select('id')
        .eq('project_number', '000-UNASSIGNED')
        .single();
      if (!unassigned?.id) {
        throw new Error('Cannot revert revenue: 000-UNASSIGNED project not found and no splits exist');
      }
      revertProjectId = unassigned.id;
    }

    // Update parent revenue first (before deleting splits, so splits exist for recovery if this fails)
    const { error: updateError } = await supabase
      .from('project_revenues')
      .update({
        project_id: revertProjectId,
        is_split: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', revenueId);

    if (updateError) throw updateError;

    // Now delete split records
    const { error: deleteError } = await supabase
      .from('revenue_splits')
      .delete()
      .eq('revenue_id', revenueId);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    console.error('Error deleting revenue splits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete splits'
    };
  }
}

/**
 * Delete splits only (without reverting parent) - internal use
 */
async function deleteRevenueSplitsOnly(revenueId: string): Promise<RevenueSplitResult> {
  try {
    const { error } = await supabase
      .from('revenue_splits')
      .delete()
      .eq('revenue_id', revenueId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting revenue splits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete splits'
    };
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate that split amounts sum to the revenue total
 * Allows tolerance for rounding errors
 * 
 * @param revenueAmount - Parent revenue amount
 * @param splitAmounts - Array of split amounts
 * @returns Validation result
 */
export function validateSplitTotal(
  revenueAmount: number,
  splitAmounts: number[]
): SplitValidationResult {
  const total = splitAmounts.reduce((sum, amt) => sum + amt, 0);
  const diff = Math.abs(total - revenueAmount);

  if (diff > SPLIT_TOLERANCE) {
    return {
      valid: false,
      error: `Split total ($${total.toFixed(2)}) must equal revenue amount ($${revenueAmount.toFixed(2)}). Difference: $${diff.toFixed(2)}`,
      total,
      difference: diff
    };
  }

  return { valid: true, total, difference: diff };
}

/**
 * Calculate split percentage for display
 * 
 * @param splitAmount - Individual split amount
 * @param totalAmount - Parent revenue total
 * @returns Percentage (0-100)
 */
export function calculateSplitPercentage(splitAmount: number, totalAmount: number): number {
  if (totalAmount === 0) return 0;
  return (splitAmount / totalAmount) * 100;
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate the actual revenue amount for a project, handling splits correctly
 * - If revenue is split (project_id = SYS-000), only count split amounts for this project
 * - If revenue is not split, only count if project_id matches
 * 
 * @param projectId - The project ID to calculate revenue for
 * @param revenues - Array of revenues to process
 * @returns Total revenue amount for the project
 */
export async function calculateProjectRevenue(
  projectId: string,
  revenues: ProjectRevenue[]
): Promise<number> {
  let total = 0;

  for (const revenue of revenues) {
    if (revenue.is_split && revenue.id) {
      // This is a split revenue - get splits for this project only
      const splits = await getRevenueSplits(revenue.id);
      const projectSplits = splits.filter(s => s.project_id === projectId);
      total += projectSplits.reduce((sum, split) => sum + split.split_amount, 0);
    } else if (revenue.project_id === projectId) {
      // Regular revenue assigned to this project
      total += revenue.amount;
    }
  }

  return total;
}

/**
 * Calculate total revenues across all projects, handling splits correctly
 * 
 * @param revenues - Array of revenues to process
 * @returns Object with total and split-adjusted total
 */
export async function calculateTotalRevenues(
  revenues: ProjectRevenue[]
): Promise<{ total: number; splitAdjustedTotal: number }> {
  let total = 0;
  let splitAdjustedTotal = 0;

  const processedSplitRevenues = new Set<string>();

  for (const revenue of revenues) {
    total += revenue.amount;

    if (revenue.is_split && revenue.id && !processedSplitRevenues.has(revenue.id)) {
      const splits = await getRevenueSplits(revenue.id);
      splitAdjustedTotal += splits.reduce((sum, split) => sum + split.split_amount, 0);
      processedSplitRevenues.add(revenue.id);
    } else if (!revenue.is_split) {
      splitAdjustedTotal += revenue.amount;
    }
  }

  return { total, splitAdjustedTotal };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform database response to RevenueSplit type
 */
function transformSplitsResponse(data: any[]): RevenueSplit[] {
  return data.map(split => ({
    id: split.id,
    revenue_id: split.revenue_id,
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
}

/**
 * Get the display amount for a revenue
 * For split revenues, returns the original amount (not individual splits)
 */
export function getRevenueDisplayAmount(revenue: ProjectRevenue): number {
  return revenue.amount;
}

/**
 * Format split info for display
 */
export function formatSplitInfo(splits: RevenueSplit[]): string {
  if (splits.length === 0) return '';
  
  return splits
    .map(s => `${s.project_number}: $${s.split_amount.toFixed(2)}`)
    .join(', ');
}

