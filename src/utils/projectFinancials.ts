import { Project } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Expense } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectWithFinancials extends Project {
  estimatedCost: number; // Internal labor cost from approved estimate only
  actualExpenses: number;
  contingencyRemaining: number;
  projectedRevenue: number;
  projectedCosts: number; // External costs (quotes/estimates + change order costs)
  projectedMargin: number;
  nonInternalLineItemCount: number;
  totalLineItemCount: number; // Total count of all line items in approved estimate
  originalEstimatedCosts: number; // Sum of all line item costs from original approved estimate
  totalEstimatedCosts: number; // Internal labor + external costs (complete project cost estimate)
}

/**
 * Calculate financial data for a project based on estimates and expenses
 */
export async function calculateProjectFinancials(
  project: Project,
  estimates: Estimate[],
  expenses: Expense[]
): Promise<ProjectWithFinancials> {
  // Prioritized estimate selection: approved current version, then latest approved
  const projectEstimates = estimates.filter(e => e.project_id === project.id);
  const approvedCurrentEstimate = projectEstimates.find(e => e.is_current_version && e.status === 'approved');
  const latestApprovedEstimate = projectEstimates
    .filter(e => e.status === 'approved')
    .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())[0];
  
  const currentEstimate = approvedCurrentEstimate || latestApprovedEstimate;

  // Initialize financial metrics
  let estimatedCost = 0;
  let projectedRevenue = 0;
  let projectedCosts = 0;
  let nonInternalLineItemCount = 0;
  let totalLineItemCount = 0;
  let originalEstimatedCosts = 0;

  // Only calculate financials if there's an approved estimate
  if (currentEstimate?.id) {
    
    try {
      // Get projected revenue from contract amount (approved estimate + change orders)
      // Fall back to estimate total if no contract amount is set
      projectedRevenue = project.contracted_amount || currentEstimate.total_amount || 0;

      // Get estimate line items with category information
      const { data: lineItems } = await supabase
        .from('estimate_line_items')
        .select('id, total_cost, cost_per_unit, quantity, category')
        .eq('estimate_id', currentEstimate.id);

      // Get accepted quotes for this project grouped by category
      const { data: acceptedQuotes } = await supabase
        .from('quotes')
        .select('total_amount, estimate_line_item_id')
        .eq('project_id', project.id)
        .eq('status', 'accepted');

      // Get approved change orders for this project
      const { data: approvedChangeOrders } = await supabase
        .from('change_orders')
        .select('cost_impact')
        .eq('project_id', project.id)
        .eq('status', 'approved');

      if (lineItems) {
        // Calculate estimated cost (only internal labor)
        estimatedCost = lineItems
          .filter(item => item.category === 'labor_internal')
          .reduce((sum, item) => {
            const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
            return sum + itemCost;
          }, 0);

        // Count non-internal labor line items
        nonInternalLineItemCount = lineItems.filter(
          item => item.category !== 'labor_internal'
        ).length;

        // Count total line items
        totalLineItemCount = lineItems.length;

        // Calculate original estimated costs (sum of all line item costs from approved estimate)
        originalEstimatedCosts = lineItems.reduce((sum, item) => {
          const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
          return sum + itemCost;
        }, 0);

        // Calculate projected costs using quotes where available, estimate costs otherwise
        const categoryQuotes = new Map();
        if (acceptedQuotes) {
          acceptedQuotes.forEach(quote => {
            if (quote.estimate_line_item_id) {
              categoryQuotes.set(quote.estimate_line_item_id, quote.total_amount);
            }
          });
        }

        projectedCosts = lineItems.reduce((sum, item) => {
          // Skip internal labor costs from projected costs calculation
          if (item.category === 'labor_internal') {
            return sum;
          }
          
          // Check if we have an accepted quote for this line item
          const quotedAmount = categoryQuotes.get(item.id);
          if (quotedAmount !== undefined) {
            return sum + quotedAmount;
          }
          
          // Otherwise use estimate cost
          const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
          return sum + itemCost;
        }, 0);

        // Add approved change order cost impacts to projected costs
        if (approvedChangeOrders) {
          const changeOrderCosts = approvedChangeOrders.reduce((sum, co) => {
            return sum + (co.cost_impact || 0);
          }, 0);
          projectedCosts += changeOrderCosts;
        }
      }
    } catch (error) {
      console.error('Error calculating project financials:', error);
    }
  }

  // Calculate actual expenses for this project
  const actualExpenses = expenses
    .filter(e => e.project_id === project.id)
    .reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate projected margin
  const projectedMargin = projectedRevenue - projectedCosts;

  // Calculate total estimated costs: internal labor + external costs
  const totalEstimatedCosts = estimatedCost + projectedCosts;

  // Use contingency_remaining from the project record (calculated by database functions)
  const contingencyRemaining = project.contingency_remaining || 0;

  return {
    ...project,
    estimatedCost,
    actualExpenses,
    contingencyRemaining,
    projectedRevenue,
    projectedCosts,
    projectedMargin,
    nonInternalLineItemCount,
    totalLineItemCount,
    originalEstimatedCosts,
    totalEstimatedCosts,
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
  // Get all line items for approved estimates (prioritizing current approved, then any approved)
  const approvedEstimateIds = new Set<string>();
  
  projects.forEach(project => {
    const projectEstimates = estimates.filter(e => e.project_id === project.id);
    const approvedCurrentEstimate = projectEstimates.find(e => e.is_current_version && e.status === 'approved');
    const latestApprovedEstimate = projectEstimates
      .filter(e => e.status === 'approved')
      .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())[0];
    
    const selectedEstimate = approvedCurrentEstimate || latestApprovedEstimate;
    if (selectedEstimate?.id) {
      approvedEstimateIds.add(selectedEstimate.id);
    }
  });

  const currentEstimateIds = Array.from(approvedEstimateIds);

  let allLineItems: any[] = [];
  let allQuotes: any[] = [];
  let allChangeOrders: any[] = [];
  
  if (currentEstimateIds.length > 0) {
    try {
      // Get line items with category information
      const { data: lineItems } = await supabase
        .from('estimate_line_items')
        .select('id, estimate_id, total_cost, cost_per_unit, quantity, category')
        .in('estimate_id', currentEstimateIds);
      
      allLineItems = lineItems || [];

      // Get accepted quotes for all projects
      const { data: quotes } = await supabase
        .from('quotes')
        .select('project_id, total_amount, estimate_line_item_id')
        .in('project_id', projects.map(p => p.id))
        .eq('status', 'accepted');

      // Get approved change orders for all projects
      const { data: changeOrders } = await supabase
        .from('change_orders')
        .select('project_id, cost_impact')
        .in('project_id', projects.map(p => p.id))
        .eq('status', 'approved');
      
      allQuotes = quotes || [];
      allChangeOrders = changeOrders || [];
    } catch (error) {
      console.error('Error fetching line items and quotes:', error);
    }
  }

  // Calculate financials for each project
  return projects.map(project => {
    // Prioritized estimate selection: approved current version, then latest approved
    const projectEstimates = estimates.filter(e => e.project_id === project.id);
    const approvedCurrentEstimate = projectEstimates.find(e => e.is_current_version && e.status === 'approved');
    const latestApprovedEstimate = projectEstimates
      .filter(e => e.status === 'approved')
      .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())[0];
    
    const currentEstimate = approvedCurrentEstimate || latestApprovedEstimate;

    // Initialize financial metrics
    let estimatedCost = 0;
    let projectedRevenue = 0;
    let projectedCosts = 0;
    let nonInternalLineItemCount = 0;
    let totalLineItemCount = 0;
    let originalEstimatedCosts = 0;

    // Only calculate financials if there's an approved estimate
    if (currentEstimate?.id) {
      
      // Get projected revenue from contract amount (approved estimate + change orders)
      // Fall back to estimate total if no contract amount is set
      projectedRevenue = project.contracted_amount || currentEstimate.total_amount || 0;

      const projectLineItems = allLineItems.filter(
        item => item.estimate_id === currentEstimate.id
      );
      
      // Calculate estimated cost (only internal labor)
      estimatedCost = projectLineItems
        .filter(item => item.category === 'labor_internal')
        .reduce((sum, item) => {
          const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
          return sum + itemCost;
        }, 0);

      // Count non-internal labor line items
      nonInternalLineItemCount = projectLineItems.filter(
        item => item.category !== 'labor_internal'
      ).length;

      // Count total line items
      totalLineItemCount = projectLineItems.length;

      // Calculate original estimated costs (sum of all line item costs from approved estimate)
      originalEstimatedCosts = projectLineItems.reduce((sum, item) => {
        const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
        return sum + itemCost;
      }, 0);

      // Get quotes for this project
      const projectQuotes = allQuotes.filter(q => q.project_id === project.id);
      const categoryQuotes = new Map();
      projectQuotes.forEach(quote => {
        if (quote.estimate_line_item_id) {
          categoryQuotes.set(quote.estimate_line_item_id, quote.total_amount);
        }
      });

      // Calculate projected costs using quotes where available
      projectedCosts = projectLineItems.reduce((sum, item) => {
        // Skip internal labor costs from projected costs calculation
        if (item.category === 'labor_internal') {
          return sum;
        }
        
        const quotedAmount = categoryQuotes.get(item.id);
        if (quotedAmount !== undefined) {
          return sum + quotedAmount;
        }
        
        const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
        return sum + itemCost;
      }, 0);

      // Add approved change order cost impacts to projected costs
      const projectChangeOrders = allChangeOrders.filter(co => co.project_id === project.id);
      const changeOrderCosts = projectChangeOrders.reduce((sum, co) => {
        return sum + (co.cost_impact || 0);
      }, 0);
      projectedCosts += changeOrderCosts;
    }

    // Calculate actual expenses
    const actualExpenses = expenses
      .filter(e => e.project_id === project.id)
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate projected margin
    const projectedMargin = projectedRevenue - projectedCosts;

    // Calculate total estimated costs: internal labor + external costs
    const totalEstimatedCosts = estimatedCost + projectedCosts;

    // Use contingency_remaining from project record
    const contingencyRemaining = project.contingency_remaining || 0;

    return {
      ...project,
      estimatedCost,
      actualExpenses,
      contingencyRemaining,
      projectedRevenue,
      projectedCosts,
      projectedMargin,
      nonInternalLineItemCount,
      totalLineItemCount,
      originalEstimatedCosts,
      totalEstimatedCosts,
    };
  });
}