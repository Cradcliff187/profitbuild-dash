import { Project } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Expense } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";

// CRITICAL: Ensure we're using costs, not prices
const validateCostNotPrice = (value: number, label: string, contractAmount: number) => {
  if (value > contractAmount * 0.95) { // Allow 5% margin for edge cases
    console.error(`WARNING: ${label} (${value}) may be using PRICE instead of COST. Contract: ${contractAmount}`);
  }
  return value;
};

export interface ProjectWithFinancials extends Project {
  // Three-Tier Margin Analysis
  original_margin: number; // Revenue from approved estimate minus estimated costs only
  projected_margin: number; // Current contract amount minus projected costs (quotes/estimates + change orders)
  actual_margin: number; // Current contract amount minus allocated actual expenses
  
  // Original Approved Estimate Measurements
  estimatedCost: number; // Internal labor cost from approved estimate only
  approvedEstimateTotal: number; // Total amount from approved estimate
  approvedEstimateInternalLaborCost: number; // Internal labor from approved estimate
  approvedEstimateExternalCosts: number; // External costs from approved estimate
  approvedEstimateContingency: number; // Contingency amount from approved estimate
  approvedEstimateMargin: number; // Gross margin from approved estimate
  
  // Contract Breakdown (Base + Change Orders)
  originalContractAmount: number; // Base approved estimate total
  changeOrderRevenue: number; // Revenue added from approved change orders
  changeOrderCount: number; // Number of approved change orders
  currentContractAmount: number; // Original + change order revenue
  changeOrderCosts: number; // Cost impact from approved change orders
  changeOrderNetMargin: number; // Net margin impact from change orders (revenue - costs)
  
  // Quote Analysis Measurements (Updated for Change Orders)
  totalAcceptedQuoteAmount: number; // Sum of all accepted quotes
  
  // Current Project Performance
  actualExpenses: number;
  contingencyRemaining: number;
  projectedRevenue: number; // currentContractAmount (original + change orders)
  projectedCosts: number; // External costs (quotes/estimates) + change order costs + internal labor
  projectedMargin: number; // Expected profit including all costs
  currentMargin: number; // Revenue - actual expenses spent so far
  
  // Variance Analysis
  actualVsEstimatedVariance: number; // Actual expenses vs original estimate (including change order impact)
  actualVsQuotedVariance: number; // Actual expenses vs quoted amounts
  budgetBurnRate: number; // Percentage of budget consumed
  changeOrderImpactOnMargin: number; // How change orders affected overall margin
  
  // Legacy/Compatibility Fields
  nonInternalLineItemCount: number;
  totalLineItemCount: number; // Total count of all line items in approved estimate
  originalEstimatedCosts: number; // Sum of all line item costs from original approved estimate
  totalEstimatedCosts: number; // Internal labor + external costs (complete project cost estimate)
  
  // Enhanced Cost Analysis
  adjustedEstCosts: number; // Uses database value if available, fallback to projectedCosts
  originalEstCosts: number; // Uses database value if available, fallback to originalEstimatedCosts
  costVariance: number; // Difference between adjusted and original estimated costs
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
  
  // Check for pending estimates (for preview when no approved estimate exists)
  const pendingEstimate = currentEstimate || projectEstimates
    .filter(e => e.status === 'sent' || e.status === 'draft')
    .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())[0];
  
  // Contract breakdown metrics
  let originalContractAmount = 0;
  let changeOrderRevenue = 0;
  let changeOrderCount = 0;
  let currentContractAmount = 0;
  let changeOrderCosts = 0;
  let changeOrderNetMargin = 0;
  
  // Quote analysis metrics (updated for change orders)
  let totalAcceptedQuoteAmount = 0;

  // Calculate financials if there's an approved estimate, otherwise use pending data for preview
  const estimateToUse = currentEstimate || pendingEstimate;
  if (estimateToUse?.id) {
    
    try {
      // Set estimate totals (approved or pending for preview)
      approvedEstimateTotal = estimateToUse.total_amount || 0;
      approvedEstimateContingency = estimateToUse.contingency_amount || 0;
      
      // Set original contract amount (only for approved estimates, otherwise zero)
      originalContractAmount = currentEstimate ? approvedEstimateTotal : 0;

      // Get estimate line items with category information
      const { data: lineItems } = await supabase
        .from('estimate_line_items')
        .select('id, total_cost, cost_per_unit, quantity, category')
        .eq('estimate_id', estimateToUse.id);

      // Get accepted quotes for this project
      const { data: acceptedQuotes } = await supabase
        .from('quotes')
        .select('id, total_amount, estimate_line_item_id, includes_materials, includes_labor')
        .eq('project_id', project.id)
        .eq('status', 'accepted');

      // Get quote line items with their actual costs for external categories
      const { data: quoteLineItems } = await supabase
        .from('quote_line_items')
        .select('quote_id, category, total_cost, estimate_line_item_id')
        .in('quote_id', (acceptedQuotes || []).map(q => q.id));

      // Get approved change orders for this project
      const { data: approvedChangeOrders } = await supabase
        .from('change_orders')
        .select('cost_impact, client_amount, margin_impact')
        .eq('project_id', project.id)
        .eq('status', 'approved');

      if (lineItems) {
        // Calculate approved estimate metrics
        // Internal costs include both internal labor and management (company overhead)
        const internalLaborItems = lineItems.filter(item => 
          item.category === 'labor_internal' || item.category === 'management'
        );
        const externalItems = lineItems.filter(item => 
          item.category !== 'labor_internal' && item.category !== 'management'
        );
        
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

        // Calculate change order impacts first (needed for revenue calculation)
        if (approvedChangeOrders) {
          changeOrderCount = approvedChangeOrders.length;
          changeOrderCosts = approvedChangeOrders.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
          changeOrderRevenue = approvedChangeOrders.reduce((sum, co) => sum + (co.client_amount || 0), 0);
          changeOrderNetMargin = changeOrderRevenue - changeOrderCosts;
        }
        
        // Calculate contract amounts
        currentContractAmount = originalContractAmount + changeOrderRevenue;
        projectedRevenue = currentContractAmount;
        
        // Calculate quote analysis metrics
        if (acceptedQuotes) {
          totalAcceptedQuoteAmount = acceptedQuotes.reduce((sum, quote) => sum + (quote.total_amount || 0), 0);
        }

        // Calculate projected costs including internal labor
        const internalLaborCost = approvedEstimateInternalLaborCost;
        const changeOrderCostImpact = changeOrderCosts;
        
        let externalCostsWithQuotes = 0;
        if (acceptedQuotes && acceptedQuotes.length > 0) {
          // Map quotes to their estimate line items
          const quotesByLineItem = new Map();
          acceptedQuotes.forEach(quote => {
            if (quote.estimate_line_item_id) {
              quotesByLineItem.set(quote.estimate_line_item_id, quote.total_amount || 0);
            }
          });
          
          // Calculate external costs: use quote amount if available, otherwise estimate cost
        // Calculate external costs: use QUOTE COST if available, else ESTIMATE COST (never use price)
        externalCostsWithQuotes = externalItems.reduce((sum, item) => {
          const quoteAmount = quotesByLineItem.get(item.id);
          const itemCost = quoteAmount !== undefined ? quoteAmount : 
            (item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0));
          return sum + itemCost;
        }, 0);
        } else {
          // Fallback to estimated external costs
          externalCostsWithQuotes = approvedEstimateExternalCosts;
        }
        
        projectedCosts = internalLaborCost + externalCostsWithQuotes + changeOrderCostImpact;
        
        // Validate: projectedCosts should NEVER exceed the full contract value (indicates price/cost confusion)
        const fullContractAmount = originalContractAmount + changeOrderRevenue;
        projectedCosts = validateCostNotPrice(projectedCosts, 'Projected Costs', fullContractAmount);
      }
    } catch (error) {
      console.error('Error calculating project financials:', error);
    }
  }

  // Calculate actual expenses for this project
  const actualExpenses = expenses
    .filter(e => e.project_id === project.id)
    .reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate projected margin (revenue minus all projected costs including internal labor)
  const validatedAdjustedCosts = validateCostNotPrice(
    project.adjusted_est_costs || projectedCosts,
    'Adjusted Costs',
    projectedRevenue
  );
  const projectedMargin = projectedRevenue - validatedAdjustedCosts;

  // Calculate current margin (revenue - actual expenses so far)
  const currentMargin = projectedRevenue - actualExpenses;

  // Calculate variance metrics (including change order impacts)
  const originalBudget = estimatedCost + approvedEstimateExternalCosts;
  const actualVsEstimatedVariance = actualExpenses - (originalBudget + changeOrderCosts);
  const actualVsQuotedVariance = actualExpenses - (estimatedCost + totalAcceptedQuoteAmount);
  const budgetBurnRate = projectedRevenue > 0 ? (actualExpenses / projectedRevenue) * 100 : 0;
  const changeOrderImpactOnMargin = changeOrderNetMargin;

  // Calculate total estimated costs: internal labor + external costs (projectedCosts already includes internal labor)
  const totalEstimatedCosts = projectedCosts;

  // Use contingency_remaining from the project record (calculated by database functions)
  const contingencyRemaining = project.contingency_remaining || 0;

  // Calculate three-tier margins
  const originalMargin = originalContractAmount - (approvedEstimateInternalLaborCost + approvedEstimateExternalCosts);
  const projectedMarginValue = currentContractAmount - projectedCosts;
  const actualMargin = currentContractAmount - actualExpenses;

  // Add margin percentage validation
  if (projectedMargin < 0) {
    console.error('CRITICAL: Negative margin detected - costs may be using prices');
  }
  if (projectedMarginValue < 0) {
    console.error('CRITICAL: Negative projected margin detected - costs may be using prices');
  }
  if (actualMargin < 0) {
    console.error('CRITICAL: Negative actual margin detected - costs may be using prices');
  }

  return {
    ...project,
    // Three-tier margin analysis
    original_margin: originalMargin,
    projected_margin: projectedMarginValue,
    actual_margin: actualMargin,
    
    // Original approved estimate measurements
    estimatedCost,
    approvedEstimateTotal,
    approvedEstimateInternalLaborCost,
    approvedEstimateExternalCosts,
    approvedEstimateContingency,
    approvedEstimateMargin,
    
    // Contract breakdown (base + change orders)
    originalContractAmount,
    changeOrderRevenue,
    changeOrderCount,
    currentContractAmount,
    changeOrderCosts,
    changeOrderNetMargin,
    
    // Quote analysis measurements (updated for change orders)
    totalAcceptedQuoteAmount,
    
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
    changeOrderImpactOnMargin,
    
    // Legacy/compatibility fields
    nonInternalLineItemCount,
    totalLineItemCount,
    originalEstimatedCosts,
    totalEstimatedCosts,
    
    // Enhanced cost analysis with validation
    adjustedEstCosts: validatedAdjustedCosts,
    originalEstCosts: validateCostNotPrice(
      project.original_est_costs || originalEstimatedCosts,
      'Original Costs',
      originalContractAmount
    ),
    costVariance: validatedAdjustedCosts - (project.original_est_costs || originalEstimatedCosts),
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
  let allQuoteLineItems: any[] = [];
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
        .select('id, project_id, total_amount, estimate_line_item_id, includes_materials, includes_labor')
        .in('project_id', projects.map(p => p.id))
        .eq('status', 'accepted');

      // Get all quote line items with their actual costs
      const { data: quoteLineItems } = await supabase
        .from('quote_line_items')
        .select('quote_id, category, total_cost, estimate_line_item_id')
        .in('quote_id', (quotes || []).map(q => q.id));

      // Get approved change orders for all projects
      const { data: changeOrders } = await supabase
        .from('change_orders')
        .select('project_id, cost_impact, client_amount, margin_impact')
        .in('project_id', projects.map(p => p.id))
        .eq('status', 'approved');
      
      allQuotes = quotes || [];
      allQuoteLineItems = quoteLineItems || [];
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
    
    // Contract breakdown metrics
    let originalContractAmount = 0;
    let changeOrderRevenue = 0;
    let changeOrderCount = 0;
    let currentContractAmount = 0;
    let changeOrderCosts = 0;
    let changeOrderNetMargin = 0;
    
    // Quote analysis metrics (updated for change orders)
    let totalAcceptedQuoteAmount = 0;

    // Only calculate financials if there's an approved estimate
    if (currentEstimate?.id) {
      // Set approved estimate totals
      approvedEstimateTotal = currentEstimate.total_amount || 0;
      approvedEstimateContingency = currentEstimate.contingency_amount || 0;
      
      // Set original contract amount (base approved estimate)
      originalContractAmount = approvedEstimateTotal;

      const projectLineItems = allLineItems.filter(
        item => item.estimate_id === currentEstimate.id
      );
      
      // Calculate approved estimate metrics
      // Internal costs include both internal labor and management (company overhead)
      const internalLaborItems = projectLineItems.filter(item => 
        item.category === 'labor_internal' || item.category === 'management'
      );
      const externalItems = projectLineItems.filter(item => 
        item.category !== 'labor_internal' && item.category !== 'management'
      );
      
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

      // Get change orders for this project
      const projectChangeOrders = allChangeOrders.filter(co => co.project_id === project.id);
      
      // Calculate change order impacts first (needed for revenue calculation)
      if (projectChangeOrders.length > 0) {
        changeOrderCount = projectChangeOrders.length;
        changeOrderCosts = projectChangeOrders.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
        changeOrderRevenue = projectChangeOrders.reduce((sum, co) => sum + (co.client_amount || 0), 0);
        changeOrderNetMargin = changeOrderRevenue - changeOrderCosts;
      }
      
      // Calculate contract amounts
      currentContractAmount = originalContractAmount + changeOrderRevenue;
      projectedRevenue = currentContractAmount;

      // Get quotes for this project
      const projectQuotes = allQuotes.filter(q => q.project_id === project.id);
      
      if (projectQuotes.length > 0) {
        totalAcceptedQuoteAmount = projectQuotes.reduce((sum, quote) => sum + (quote.total_amount || 0), 0);
      }

      // Calculate projected costs including internal labor
      const internalLaborCost = approvedEstimateInternalLaborCost;
      const changeOrderCostImpact = changeOrderCosts;
      
      let externalCostsWithQuotes = 0;
      if (projectQuotes.length > 0) {
        // Map quotes to their estimate line items
        const quotesByLineItem = new Map();
        projectQuotes.filter(q => q.status === 'accepted').forEach(quote => {
          if (quote.estimate_line_item_id) {
            quotesByLineItem.set(quote.estimate_line_item_id, quote.total_amount || 0);
          }
        });
        
        // Calculate external costs: use QUOTE COST if available, else ESTIMATE COST (never use price)
        externalCostsWithQuotes = externalItems.reduce((sum, item) => {
          const quoteAmount = quotesByLineItem.get(item.id);
          const itemCost = quoteAmount !== undefined ? quoteAmount : 
            (item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0));
          return sum + itemCost;
        }, 0);
      } else {
        // Fallback to estimated external costs
        externalCostsWithQuotes = approvedEstimateExternalCosts;
      }
      
      projectedCosts = internalLaborCost + externalCostsWithQuotes + changeOrderCostImpact;
      
      // Validate: projectedCosts should NEVER exceed the full contract value (indicates price/cost confusion)
      const fullContractAmount = originalContractAmount + changeOrderRevenue;
      projectedCosts = validateCostNotPrice(projectedCosts, 'Projected Costs', fullContractAmount);
    }

    // Calculate actual expenses for this project
    const actualExpenses = expenses
      .filter(e => e.project_id === project.id)
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate projected margin (revenue minus all projected costs including internal labor)
    const validatedAdjustedCosts = validateCostNotPrice(
      project.adjusted_est_costs || projectedCosts,
      'Adjusted Costs',
      projectedRevenue
    );
    const projectedMargin = projectedRevenue - validatedAdjustedCosts;

    // Calculate current margin (revenue - actual expenses so far)
    const currentMargin = projectedRevenue - actualExpenses;

    // Calculate variance metrics (including change order impacts)
    const originalBudget = estimatedCost + approvedEstimateExternalCosts;
    const actualVsEstimatedVariance = actualExpenses - (originalBudget + changeOrderCosts);
    const actualVsQuotedVariance = actualExpenses - (estimatedCost + totalAcceptedQuoteAmount);
    const budgetBurnRate = projectedRevenue > 0 ? (actualExpenses / projectedRevenue) * 100 : 0;
    const changeOrderImpactOnMargin = changeOrderNetMargin;

    // Calculate total estimated costs: internal labor + external costs (projectedCosts already includes internal labor)
    const totalEstimatedCosts = projectedCosts;

    // Use contingency_remaining from the project record (calculated by database functions)
    const contingencyRemaining = project.contingency_remaining || 0;

    // Calculate three-tier margins
    const originalMargin = originalContractAmount - (approvedEstimateInternalLaborCost + approvedEstimateExternalCosts);
    const projectedMarginValue = currentContractAmount - projectedCosts;
    const actualMargin = currentContractAmount - actualExpenses;

    // Add margin percentage validation
    if (projectedMargin < 0) {
      console.error('CRITICAL: Negative margin detected - costs may be using prices');
    }
    if (projectedMarginValue < 0) {
      console.error('CRITICAL: Negative projected margin detected - costs may be using prices');
    }
    if (actualMargin < 0) {
      console.error('CRITICAL: Negative actual margin detected - costs may be using prices');
    }

    return {
      ...project,
      // Three-tier margin analysis
      original_margin: originalMargin,
      projected_margin: projectedMarginValue,
      actual_margin: actualMargin,
      
      // Original approved estimate measurements
      estimatedCost,
      approvedEstimateTotal,
      approvedEstimateInternalLaborCost,
      approvedEstimateExternalCosts,
      approvedEstimateContingency,
      approvedEstimateMargin,
      
      // Contract breakdown (base + change orders)
      originalContractAmount,
      changeOrderRevenue,
      changeOrderCount,
      currentContractAmount,
      changeOrderCosts,
      changeOrderNetMargin,
      
      // Quote analysis measurements (updated for change orders)
      totalAcceptedQuoteAmount,
      
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
      changeOrderImpactOnMargin,
      
      // Legacy/compatibility fields
      nonInternalLineItemCount,
      totalLineItemCount,
      originalEstimatedCosts,
      totalEstimatedCosts,
      
      // Enhanced cost analysis with validation
      adjustedEstCosts: validatedAdjustedCosts,
      originalEstCosts: validateCostNotPrice(
        project.original_est_costs || originalEstimatedCosts,
        'Original Costs',
        originalContractAmount
      ),
      costVariance: validatedAdjustedCosts - (project.original_est_costs || originalEstimatedCosts),
    };
  });
}