import { Project } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Expense } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectWithFinancials extends Project {
  estimatedCost: number;
  actualExpenses: number;
  contingencyRemaining: number;
}

/**
 * Calculate financial data for a project based on estimates and expenses
 */
export async function calculateProjectFinancials(
  project: Project,
  estimates: Estimate[],
  expenses: Expense[]
): Promise<ProjectWithFinancials> {
  // Find current estimate for this project
  const currentEstimate = estimates.find(
    e => e.project_id === project.id && e.is_current_version
  );

  // Calculate estimated cost from current estimate line items
  let estimatedCost = 0;
  if (currentEstimate?.id) {
    try {
      const { data: lineItems } = await supabase
        .from('estimate_line_items')
        .select('total_cost, cost_per_unit, quantity')
        .eq('estimate_id', currentEstimate.id);

      if (lineItems) {
        estimatedCost = lineItems.reduce((sum, item) => {
          // Use total_cost if available, otherwise calculate from cost_per_unit * quantity
          const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
          return sum + itemCost;
        }, 0);
      }
    } catch (error) {
      console.error('Error calculating estimated cost:', error);
    }
  }

  // Calculate actual expenses for this project
  const actualExpenses = expenses
    .filter(e => e.project_id === project.id)
    .reduce((sum, expense) => sum + expense.amount, 0);

  // Use contingency_remaining from the project record (calculated by database functions)
  const contingencyRemaining = project.contingency_remaining || 0;

  return {
    ...project,
    estimatedCost,
    actualExpenses,
    contingencyRemaining,
  };
}

/**
 * Calculate financial data for multiple projects efficiently
 */
export async function calculateMultipleProjectFinancials(
  projects: Project[],
  estimates: Estimate[],
  expenses: Expense[]
): Promise<ProjectWithFinancials[]> {
  // Get all line items for current estimates in one query
  const currentEstimateIds = estimates
    .filter(e => e.is_current_version)
    .map(e => e.id);

  let allLineItems: any[] = [];
  if (currentEstimateIds.length > 0) {
    try {
      const { data: lineItems } = await supabase
        .from('estimate_line_items')
        .select('estimate_id, total_cost, cost_per_unit, quantity')
        .in('estimate_id', currentEstimateIds);
      
      allLineItems = lineItems || [];
    } catch (error) {
      console.error('Error fetching line items:', error);
    }
  }

  // Calculate financials for each project
  return projects.map(project => {
    // Find current estimate for this project
    const currentEstimate = estimates.find(
      e => e.project_id === project.id && e.is_current_version
    );

    // Calculate estimated cost from line items
    let estimatedCost = 0;
    if (currentEstimate?.id) {
      const projectLineItems = allLineItems.filter(
        item => item.estimate_id === currentEstimate.id
      );
      
      estimatedCost = projectLineItems.reduce((sum, item) => {
        const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
        return sum + itemCost;
      }, 0);
    }

    // Calculate actual expenses
    const actualExpenses = expenses
      .filter(e => e.project_id === project.id)
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Use contingency_remaining from project record
    const contingencyRemaining = project.contingency_remaining || 0;

    return {
      ...project,
      estimatedCost,
      actualExpenses,
      contingencyRemaining,
    };
  });
}