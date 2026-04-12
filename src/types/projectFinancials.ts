import { Project } from "./project";

/**
 * Extended project type with computed financial fields.
 *
 * These fields are populated by the data-loading code in Projects.tsx and
 * useProjectData.tsx — NOT by the now-deleted calculateProjectFinancials()
 * utility. The values come from database triggers/views and from lightweight
 * client-side aggregation of change-order and estimate data.
 */
export interface ProjectWithFinancials extends Project {
  // Three-Tier Margin Analysis
  original_margin: number; // Revenue from approved estimate minus estimated costs only
  projected_margin: number; // Current contract amount minus projected costs (quotes/estimates + change orders)

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
