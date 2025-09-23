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
  
  // Contract Breakdown (Base + Change Orders)
  originalContractAmount: number; // Base approved estimate total
  changeOrderRevenue: number; // Revenue added from approved change orders
  changeOrderCount: number; // Number of approved change orders
  currentContractAmount: number; // Original + change order revenue
  changeOrderCosts: number; // Cost impact from approved change orders
  changeOrderNetMargin: number; // Net margin impact from change orders (revenue - costs)
  
  // Quote Analysis Measurements (Updated for Change Orders)
  totalAcceptedQuoteAmount: number; // Sum of all accepted quotes
  quotedOriginalScope: number; // External costs covered by quotes (original scope only)
  quotedChangeOrderScope: number; // External costs covered by quotes (change order scope)
  unquotedOriginalScope: number; // Original external costs not yet quoted
  unquotedChangeOrderScope: number; // Change order external costs not yet quoted
  quotedVsEstimatedVariance: number; // Difference between quotes and estimate for external costs
  quoteCoveragePercentage: number; // Percentage of total scope covered by quotes
  originalScopeCoveragePercentage: number; // Percentage of original scope covered by quotes
  changeOrderScopeCoveragePercentage: number; // Percentage of change order scope covered by quotes
  quoteBasedMargin: number; // Expected margin using quote costs instead of estimates
  
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
  let quotedOriginalScope = 0;
  let quotedChangeOrderScope = 0;
  let unquotedOriginalScope = 0;
  let unquotedChangeOrderScope = 0;
  let quotedVsEstimatedVariance = 0;
  let quoteCoveragePercentage = 0;
  let originalScopeCoveragePercentage = 0;
  let changeOrderScopeCoveragePercentage = 0;
  let quoteBasedMargin = 0;

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
        const categoryQuotes = new Map(); // Maps estimate_line_item_id to quote price
        const categoryQuoteCosts = new Map(); // Maps estimate_line_item_id to actual quote costs
        const changeOrderQuotes = new Map(); // Track quotes specifically for change order items
        
        if (acceptedQuotes) {
          totalAcceptedQuoteAmount = acceptedQuotes.reduce((sum, quote) => sum + (quote.total_amount || 0), 0);
          
          acceptedQuotes.forEach(quote => {
            if (quote.estimate_line_item_id) {
              categoryQuotes.set(quote.estimate_line_item_id, quote.total_amount);
            }
          });
        }

        // Map quote line item costs to estimate line items (for external categories)
        if (quoteLineItems) {
          quoteLineItems.forEach(qli => {
            if (qli.estimate_line_item_id) {
              // For external categories, use the actual cost from quote line items
              categoryQuoteCosts.set(qli.estimate_line_item_id, qli.total_cost || 0);
            }
          });
        }

        // Fallback: if all accepted quotes are unlinked to estimate line items, treat their total as projected external costs
        const allQuotesUnlinked = (acceptedQuotes || []).length > 0 && (acceptedQuotes || []).every(q => !q.estimate_line_item_id);

        if (allQuotesUnlinked) {
          quotedOriginalScope = totalAcceptedQuoteAmount;
          unquotedOriginalScope = Math.max(approvedEstimateExternalCosts - quotedOriginalScope, 0);
        } else {
          // Calculate quoted vs unquoted costs for original scope using linked quotes
          quotedOriginalScope = externalItems.reduce((sum, item) => {
            const quotedAmount = categoryQuotes.get(item.id);
            return quotedAmount !== undefined ? sum + quotedAmount : sum;
          }, 0);
          
          unquotedOriginalScope = externalItems.reduce((sum, item) => {
            const quotedAmount = categoryQuotes.get(item.id);
            if (quotedAmount === undefined) {
              const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
              return sum + itemCost;
            }
            return sum;
          }, 0);
        }
        
        // For now, assume change order scope is unquoted unless we have specific data
        quotedChangeOrderScope = 0;
        unquotedChangeOrderScope = changeOrderCosts;
        
        // Calculate coverage percentages
        const totalOriginalScope = approvedEstimateExternalCosts;
        const totalChangeOrderScope = changeOrderCosts;
        const totalScope = totalOriginalScope + totalChangeOrderScope;
        const totalQuoted = quotedOriginalScope + quotedChangeOrderScope;
        
        originalScopeCoveragePercentage = totalOriginalScope > 0 
          ? (quotedOriginalScope / totalOriginalScope) * 100 
          : 0;
        changeOrderScopeCoveragePercentage = totalChangeOrderScope > 0 
          ? (quotedChangeOrderScope / totalChangeOrderScope) * 100 
          : 0;
        quoteCoveragePercentage = totalScope > 0 
          ? (totalQuoted / totalScope) * 100 
          : 0;
        
        // Calculate variances and projections
        quotedVsEstimatedVariance = quotedOriginalScope - approvedEstimateExternalCosts;
        
        // Calculate projected costs using actual quote costs when available
        const projectedOriginalCosts = allQuotesUnlinked
          ? totalAcceptedQuoteAmount
          : externalItems.reduce((sum, item) => {
              // Use actual quote line item cost if available (this is the real cost to us)
              const quotedCost = categoryQuoteCosts.get(item.id);
              if (quotedCost !== undefined) {
                return sum + quotedCost;
              }
              // Fallback to estimated cost if no quote available
              const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
              return sum + itemCost;
            }, 0);
        
        // Add change order costs to projected costs
        projectedCosts = projectedOriginalCosts + changeOrderCosts;
        
        // Calculate quote-based margin (uses quoted costs where available)
        quoteBasedMargin = currentContractAmount - (approvedEstimateInternalLaborCost + projectedCosts);
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
  // Uses quoted prices for external costs when available, estimated costs for internal labor
  const projectedMargin = projectedRevenue - (projectedCosts + approvedEstimateInternalLaborCost);

  // Calculate current margin (revenue - actual expenses so far)
  const currentMargin = projectedRevenue - actualExpenses;

  // Calculate variance metrics (including change order impacts)
  const originalBudget = estimatedCost + approvedEstimateExternalCosts;
  const actualVsEstimatedVariance = actualExpenses - (originalBudget + changeOrderCosts);
  const actualVsQuotedVariance = actualExpenses - (estimatedCost + quotedOriginalScope + quotedChangeOrderScope);
  const budgetBurnRate = projectedRevenue > 0 ? (actualExpenses / projectedRevenue) * 100 : 0;
  const changeOrderImpactOnMargin = changeOrderNetMargin;

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
    
    // Contract breakdown (base + change orders)
    originalContractAmount,
    changeOrderRevenue,
    changeOrderCount,
    currentContractAmount,
    changeOrderCosts,
    changeOrderNetMargin,
    
    // Quote analysis measurements (updated for change orders)
    totalAcceptedQuoteAmount,
    quotedOriginalScope,
    quotedChangeOrderScope,
    unquotedOriginalScope,
    unquotedChangeOrderScope,
    quotedVsEstimatedVariance,
    quoteCoveragePercentage,
    originalScopeCoveragePercentage,
    changeOrderScopeCoveragePercentage,
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
    changeOrderImpactOnMargin,
    
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
    let quotedOriginalScope = 0;
    let quotedChangeOrderScope = 0;
    let unquotedOriginalScope = 0;
    let unquotedChangeOrderScope = 0;
    let quotedVsEstimatedVariance = 0;
    let quoteCoveragePercentage = 0;
    let originalScopeCoveragePercentage = 0;
    let changeOrderScopeCoveragePercentage = 0;
    let quoteBasedMargin = 0;

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
      const categoryQuotes = new Map(); // Maps estimate_line_item_id to quote price
      const categoryQuoteCosts = new Map(); // Maps estimate_line_item_id to actual quote costs
      const changeOrderQuotes = new Map(); // Track quotes specifically for change order items
      
      if (projectQuotes.length > 0) {
        totalAcceptedQuoteAmount = projectQuotes.reduce((sum, quote) => sum + (quote.total_amount || 0), 0);
        
        projectQuotes.forEach(quote => {
          if (quote.estimate_line_item_id) {
            categoryQuotes.set(quote.estimate_line_item_id, quote.total_amount);
          }
        });
      }

      // Map quote line item costs to estimate line items (for external categories)
      const projectQuoteLineItems = allQuoteLineItems.filter(qli => 
        projectQuotes.some(q => q.id === qli.quote_id)
      );
      
      if (projectQuoteLineItems.length > 0) {
        projectQuoteLineItems.forEach(qli => {
          if (qli.estimate_line_item_id) {
            // For external categories, use the actual cost from quote line items
            categoryQuoteCosts.set(qli.estimate_line_item_id, qli.total_cost || 0);
          }
        });
      }

      // Determine if quotes are actually linked by checking quote line items
      const hasLinkedQuoteLineItems = projectQuoteLineItems.some(qli => qli.estimate_line_item_id);

      // Calculate quoted vs unquoted costs for original scope
      quotedOriginalScope = externalItems.reduce((sum, item) => {
        const quotedAmount = categoryQuotes.get(item.id);
        return quotedAmount !== undefined ? sum + quotedAmount : sum;
      }, 0);
      
      unquotedOriginalScope = externalItems.reduce((sum, item) => {
        const quotedAmount = categoryQuotes.get(item.id);
        if (quotedAmount === undefined) {
          const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
          return sum + itemCost;
        }
        return sum;
      }, 0);
      
      // For now, assume change order scope is unquoted unless we have specific data
      quotedChangeOrderScope = 0;
      unquotedChangeOrderScope = changeOrderCosts;
      
      // Calculate coverage percentages
      const totalOriginalScope = approvedEstimateExternalCosts;
      const totalChangeOrderScope = changeOrderCosts;
      const totalScope = totalOriginalScope + totalChangeOrderScope;
      const totalQuoted = quotedOriginalScope + quotedChangeOrderScope;
      
      originalScopeCoveragePercentage = totalOriginalScope > 0 
        ? (quotedOriginalScope / totalOriginalScope) * 100 
        : 0;
      changeOrderScopeCoveragePercentage = totalChangeOrderScope > 0 
        ? (quotedChangeOrderScope / totalChangeOrderScope) * 100 
        : 0;
      quoteCoveragePercentage = totalScope > 0 
        ? (totalQuoted / totalScope) * 100 
        : 0;
      
      // Calculate variances and projections
      quotedVsEstimatedVariance = quotedOriginalScope - approvedEstimateExternalCosts;
      
      // Calculate projected external costs using actual quote line item costs
      const projectedOriginalCosts = externalItems.reduce((sum, item) => {
        // Use actual quote line item cost if available (this is the real cost to us)
        const quotedCost = categoryQuoteCosts.get(item.id);
        if (quotedCost !== undefined) {
          return sum + quotedCost;
        }
        // Fallback to estimated cost if no quote available
        const itemCost = item.total_cost || (item.cost_per_unit || 0) * (item.quantity || 0);
        return sum + itemCost;
      }, 0);
      
      // Add change order costs to projected costs
      projectedCosts = projectedOriginalCosts + changeOrderCosts;
      
      // Calculate quote-based margin (uses quoted costs where available)
      quoteBasedMargin = currentContractAmount - (approvedEstimateInternalLaborCost + projectedCosts);
    }

    // Calculate actual expenses for this project
    const actualExpenses = expenses
      .filter(e => e.project_id === project.id)
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate projected margin (revenue minus both external costs and internal labor costs)
    const projectedMargin = projectedRevenue - (projectedCosts + approvedEstimateInternalLaborCost);

    // Calculate current margin (revenue - actual expenses so far)
    const currentMargin = projectedRevenue - actualExpenses;

    // Calculate variance metrics (including change order impacts)
    const originalBudget = estimatedCost + approvedEstimateExternalCosts;
    const actualVsEstimatedVariance = actualExpenses - (originalBudget + changeOrderCosts);
    const actualVsQuotedVariance = actualExpenses - (estimatedCost + quotedOriginalScope + quotedChangeOrderScope);
    const budgetBurnRate = projectedRevenue > 0 ? (actualExpenses / projectedRevenue) * 100 : 0;
    const changeOrderImpactOnMargin = changeOrderNetMargin;

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
      
      // Contract breakdown (base + change orders)
      originalContractAmount,
      changeOrderRevenue,
      changeOrderCount,
      currentContractAmount,
      changeOrderCosts,
      changeOrderNetMargin,
      
      // Quote analysis measurements (updated for change orders)
      totalAcceptedQuoteAmount,
      quotedOriginalScope,
      quotedChangeOrderScope,
      unquotedOriginalScope,
      unquotedChangeOrderScope,
      quotedVsEstimatedVariance,
      quoteCoveragePercentage,
      originalScopeCoveragePercentage,
      changeOrderScopeCoveragePercentage,
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
      changeOrderImpactOnMargin,
      
      // Legacy/compatibility fields
      nonInternalLineItemCount,
      totalLineItemCount,
      originalEstimatedCosts,
      totalEstimatedCosts,
    };
  });
}