import { Project } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Expense } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectWithFinancials extends Project {
  // Original Approved Estimate Measurements
  estimatedCost: number; // Internal labor cost from approved estimate only
  approvedEstimateTotal: number; // Total amount from approved estimate
  approvedEstimateInternalLaborCost: number; // Internal labor from approved estimate
  approvedEstimateExternalCosts: number; // External costs from approved estimate
  approvedEstimateContingency: number; // Contingency amount from approved estimate
  approvedEstimateMargin: number; // Gross margin from approved estimate
  
  // Quote Analysis Measurements
  totalAcceptedQuoteAmount: number; // Sum of all accepted quotes
  quotedExternalCosts: number; // External costs covered by quotes
  unquotedExternalCosts: number; // External costs not yet quoted
  quotedVsEstimatedVariance: number; // Difference between quotes and estimate for external costs
  quoteCoveragePercentage: number; // Percentage of external costs covered by quotes
  quoteBasedMargin: number; // Expected margin using quote costs instead of estimates
  
  // Current Project Performance
  actualExpenses: number;
  contingencyRemaining: number;
  projectedRevenue: number;
  projectedCosts: number; // External costs (quotes/estimates + change order costs)
  projectedMargin: number; // Expected profit including internal labor costs
  currentMargin: number; // Revenue - actual expenses spent so far
  
  // Variance Analysis
  actualVsEstimatedVariance: number; // Actual expenses vs original estimate
  actualVsQuotedVariance: number; // Actual expenses vs quoted amounts
  budgetBurnRate: number; // Percentage of budget consumed
  
  // Change Order Impact
  changeOrderRevenue: number; // Revenue added from approved change orders
  changeOrderCosts: number; // Cost impact from approved change orders
  changeOrderMargin: number; // Net margin impact from change orders
  
  // Legacy/Compatibility Fields
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
  
  // New approved estimate metrics
  let approvedEstimateTotal = 0;
  let approvedEstimateInternalLaborCost = 0;
  let approvedEstimateExternalCosts = 0;
  let approvedEstimateContingency = 0;
  let approvedEstimateMargin = 0;
  
  // Quote analysis metrics
  let totalAcceptedQuoteAmount = 0;
  let quotedExternalCosts = 0;
  let unquotedExternalCosts = 0;
  let quotedVsEstimatedVariance = 0;
  let quoteCoveragePercentage = 0;
  let quoteBasedMargin = 0;
  
  // Change order metrics
  let changeOrderRevenue = 0;
  let changeOrderCosts = 0;
  let changeOrderMargin = 0;

  // Only calculate financials if there's an approved estimate
  if (currentEstimate?.id) {
    
    try {
      // Set approved estimate totals
      approvedEstimateTotal = currentEstimate.total_amount || 0;
      approvedEstimateContingency = currentEstimate.contingency_amount || 0;
      
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
        .select('cost_impact, client_amount, margin_impact')
        .eq('project_id', project.id)
        .eq('status', 'approved');

      if (lineItems) {
        // Calculate approved estimate metrics
        const internalLaborItems = lineItems.filter(item => item.category === 'labor_internal');
        const externalItems = lineItems.filter(item => item.category !== 'labor_internal');
        
        // Internal labor costs
        estimatedCost = internalLaborItems.reduce((sum, item) => {
          const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
          return sum + itemCost;
        }, 0);
        approvedEstimateInternalLaborCost = estimatedCost;
        
        // External costs from approved estimate
        approvedEstimateExternalCosts = externalItems.reduce((sum, item) => {
          const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
          return sum + itemCost;
        }, 0);
        
        // Calculate approved estimate margin (total - all costs)
        const totalApprovedCosts = approvedEstimateInternalLaborCost + approvedEstimateExternalCosts;
        approvedEstimateMargin = approvedEstimateTotal - totalApprovedCosts;

        // Legacy calculations for compatibility
        nonInternalLineItemCount = externalItems.length;
        totalLineItemCount = lineItems.length;
        originalEstimatedCosts = lineItems.reduce((sum, item) => {
          const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
          return sum + itemCost;
        }, 0);

        // Calculate quote analysis metrics
        const categoryQuotes = new Map();
        if (acceptedQuotes) {
          totalAcceptedQuoteAmount = acceptedQuotes.reduce((sum, quote) => sum + (quote.total_amount || 0), 0);
          
          acceptedQuotes.forEach(quote => {
            if (quote.estimate_line_item_id) {
              categoryQuotes.set(quote.estimate_line_item_id, quote.total_amount);
            }
          });
        }

        // Calculate quoted vs unquoted external costs
        quotedExternalCosts = externalItems.reduce((sum, item) => {
          const quotedAmount = categoryQuotes.get(item.id);
          return quotedAmount !== undefined ? sum + quotedAmount : sum;
        }, 0);
        
        unquotedExternalCosts = externalItems.reduce((sum, item) => {
          const quotedAmount = categoryQuotes.get(item.id);
          if (quotedAmount === undefined) {
            const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
            return sum + itemCost;
          }
          return sum;
        }, 0);
        
        // Calculate quote coverage and variance
        quoteCoveragePercentage = approvedEstimateExternalCosts > 0 
          ? (quotedExternalCosts / approvedEstimateExternalCosts) * 100 
          : 0;
        quotedVsEstimatedVariance = quotedExternalCosts - approvedEstimateExternalCosts;
        quoteBasedMargin = approvedEstimateTotal - (approvedEstimateInternalLaborCost + quotedExternalCosts + unquotedExternalCosts);

        // Calculate projected costs using quotes where available, estimate costs otherwise
        projectedCosts = externalItems.reduce((sum, item) => {
          const quotedAmount = categoryQuotes.get(item.id);
          if (quotedAmount !== undefined) {
            return sum + quotedAmount;
          }
          
          const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
          return sum + itemCost;
        }, 0);

        // Calculate change order impacts
        if (approvedChangeOrders) {
          changeOrderCosts = approvedChangeOrders.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
          changeOrderRevenue = approvedChangeOrders.reduce((sum, co) => sum + (co.client_amount || 0), 0);
          changeOrderMargin = approvedChangeOrders.reduce((sum, co) => sum + (co.margin_impact || 0), 0);
          
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

  // Calculate projected margin (revenue minus both external costs and internal labor costs)
  const projectedMargin = projectedRevenue - (projectedCosts + estimatedCost);

  // Calculate current margin (revenue - actual expenses so far)
  const currentMargin = projectedRevenue - actualExpenses;

  // Calculate variance metrics
  const actualVsEstimatedVariance = actualExpenses - (estimatedCost + approvedEstimateExternalCosts);
  const actualVsQuotedVariance = actualExpenses - (estimatedCost + quotedExternalCosts);
  const budgetBurnRate = projectedRevenue > 0 ? (actualExpenses / projectedRevenue) * 100 : 0;

  // Calculate total estimated costs: internal labor + external costs
  const totalEstimatedCosts = estimatedCost + projectedCosts;

  // Use contingency_remaining from the project record (calculated by database functions)
  const contingencyRemaining = project.contingency_remaining || 0;

  return {
    ...project,
    // Original approved estimate measurements
    estimatedCost,
    approvedEstimateTotal,
    approvedEstimateInternalLaborCost,
    approvedEstimateExternalCosts,
    approvedEstimateContingency,
    approvedEstimateMargin,
    
    // Quote analysis measurements
    totalAcceptedQuoteAmount,
    quotedExternalCosts,
    unquotedExternalCosts,
    quotedVsEstimatedVariance,
    quoteCoveragePercentage,
    quoteBasedMargin,
    
    // Current project performance
    actualExpenses,
    contingencyRemaining,
    projectedRevenue,
    projectedCosts,
    projectedMargin,
    currentMargin,
    
    // Variance analysis
    actualVsEstimatedVariance,
    actualVsQuotedVariance,
    budgetBurnRate,
    
    // Change order impact
    changeOrderRevenue,
    changeOrderCosts,
    changeOrderMargin,
    
    // Legacy/compatibility fields
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
        .select('project_id, cost_impact, client_amount, margin_impact')
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
    
    // New approved estimate metrics
    let approvedEstimateTotal = 0;
    let approvedEstimateInternalLaborCost = 0;
    let approvedEstimateExternalCosts = 0;
    let approvedEstimateContingency = 0;
    let approvedEstimateMargin = 0;
    
    // Quote analysis metrics
    let totalAcceptedQuoteAmount = 0;
    let quotedExternalCosts = 0;
    let unquotedExternalCosts = 0;
    let quotedVsEstimatedVariance = 0;
    let quoteCoveragePercentage = 0;
    let quoteBasedMargin = 0;
    
    // Change order metrics
    let changeOrderRevenue = 0;
    let changeOrderCosts = 0;
    let changeOrderMargin = 0;

    // Only calculate financials if there's an approved estimate
    if (currentEstimate?.id) {
      // Set approved estimate totals
      approvedEstimateTotal = currentEstimate.total_amount || 0;
      approvedEstimateContingency = currentEstimate.contingency_amount || 0;
      
      // Get projected revenue from contract amount (approved estimate + change orders)
      // Fall back to estimate total if no contract amount is set
      projectedRevenue = project.contracted_amount || currentEstimate.total_amount || 0;

      const projectLineItems = allLineItems.filter(
        item => item.estimate_id === currentEstimate.id
      );
      
      // Calculate approved estimate metrics
      const internalLaborItems = projectLineItems.filter(item => item.category === 'labor_internal');
      const externalItems = projectLineItems.filter(item => item.category !== 'labor_internal');
      
      // Internal labor costs
      estimatedCost = internalLaborItems.reduce((sum, item) => {
        const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
        return sum + itemCost;
      }, 0);
      approvedEstimateInternalLaborCost = estimatedCost;
      
      // External costs from approved estimate
      approvedEstimateExternalCosts = externalItems.reduce((sum, item) => {
        const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
        return sum + itemCost;
      }, 0);
      
      // Calculate approved estimate margin (total - all costs)
      const totalApprovedCosts = approvedEstimateInternalLaborCost + approvedEstimateExternalCosts;
      approvedEstimateMargin = approvedEstimateTotal - totalApprovedCosts;

      // Legacy calculations for compatibility
      nonInternalLineItemCount = externalItems.length;
      totalLineItemCount = projectLineItems.length;
      originalEstimatedCosts = projectLineItems.reduce((sum, item) => {
        const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
        return sum + itemCost;
      }, 0);

      // Get quotes for this project
      const projectQuotes = allQuotes.filter(q => q.project_id === project.id);
      const categoryQuotes = new Map();
      if (projectQuotes.length > 0) {
        totalAcceptedQuoteAmount = projectQuotes.reduce((sum, quote) => sum + (quote.total_amount || 0), 0);
        
        projectQuotes.forEach(quote => {
          if (quote.estimate_line_item_id) {
            categoryQuotes.set(quote.estimate_line_item_id, quote.total_amount);
          }
        });
      }

      // Calculate quoted vs unquoted external costs
      quotedExternalCosts = externalItems.reduce((sum, item) => {
        const quotedAmount = categoryQuotes.get(item.id);
        return quotedAmount !== undefined ? sum + quotedAmount : sum;
      }, 0);
      
      unquotedExternalCosts = externalItems.reduce((sum, item) => {
        const quotedAmount = categoryQuotes.get(item.id);
        if (quotedAmount === undefined) {
          const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
          return sum + itemCost;
        }
        return sum;
      }, 0);
      
      // Calculate quote coverage and variance
      quoteCoveragePercentage = approvedEstimateExternalCosts > 0 
        ? (quotedExternalCosts / approvedEstimateExternalCosts) * 100 
        : 0;
      quotedVsEstimatedVariance = quotedExternalCosts - approvedEstimateExternalCosts;
      quoteBasedMargin = approvedEstimateTotal - (approvedEstimateInternalLaborCost + quotedExternalCosts + unquotedExternalCosts);

      // Calculate projected costs using quotes where available
      projectedCosts = externalItems.reduce((sum, item) => {
        const quotedAmount = categoryQuotes.get(item.id);
        if (quotedAmount !== undefined) {
          return sum + quotedAmount;
        }
        
        const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
        return sum + itemCost;
      }, 0);

      // Calculate change order impacts
      const projectChangeOrders = allChangeOrders.filter(co => co.project_id === project.id);
      if (projectChangeOrders.length > 0) {
        changeOrderCosts = projectChangeOrders.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
        changeOrderRevenue = projectChangeOrders.reduce((sum, co) => sum + (co.client_amount || 0), 0);
        changeOrderMargin = projectChangeOrders.reduce((sum, co) => sum + (co.margin_impact || 0), 0);
        
        projectedCosts += changeOrderCosts;
      }
    }

    // Calculate actual expenses
    const actualExpenses = expenses
      .filter(e => e.project_id === project.id)
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate projected margin (revenue minus both external costs and internal labor costs)
    const projectedMargin = projectedRevenue - (projectedCosts + estimatedCost);

    // Calculate current margin (revenue - actual expenses so far)
    const currentMargin = projectedRevenue - actualExpenses;

    // Calculate variance metrics
    const actualVsEstimatedVariance = actualExpenses - (estimatedCost + approvedEstimateExternalCosts);
    const actualVsQuotedVariance = actualExpenses - (estimatedCost + quotedExternalCosts);
    const budgetBurnRate = projectedRevenue > 0 ? (actualExpenses / projectedRevenue) * 100 : 0;

    // Calculate total estimated costs: internal labor + external costs
    const totalEstimatedCosts = estimatedCost + projectedCosts;

    // Use contingency_remaining from project record
    const contingencyRemaining = project.contingency_remaining || 0;

    return {
      ...project,
      // Original approved estimate measurements
      estimatedCost,
      approvedEstimateTotal,
      approvedEstimateInternalLaborCost,
      approvedEstimateExternalCosts,
      approvedEstimateContingency,
      approvedEstimateMargin,
      
      // Quote analysis measurements
      totalAcceptedQuoteAmount,
      quotedExternalCosts,
      unquotedExternalCosts,
      quotedVsEstimatedVariance,
      quoteCoveragePercentage,
      quoteBasedMargin,
      
      // Current project performance
      actualExpenses,
      contingencyRemaining,
      projectedRevenue,
      projectedCosts,
      projectedMargin,
      currentMargin,
      
      // Variance analysis
      actualVsEstimatedVariance,
      actualVsQuotedVariance,
      budgetBurnRate,
      
      // Change order impact
      changeOrderRevenue,
      changeOrderCosts,
      changeOrderMargin,
      
      // Legacy/compatibility fields
      nonInternalLineItemCount,
      totalLineItemCount,
      originalEstimatedCosts,
      totalEstimatedCosts,
    };
  });
}