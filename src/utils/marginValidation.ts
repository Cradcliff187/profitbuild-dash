/**
 * Margin validation and warning utilities
 * 
 * These helpers detect common data quality issues in project financial data,
 * such as costs that are suspiciously close to sell prices (indicating price/cost confusion).
 */

/**
 * Check if quote line item costs look like they might be sell prices instead of costs
 * 
 * @param quoteLineItems - Array of quote line items with total_cost and total fields
 * @returns Warning message if issue detected, null otherwise
 */
export function detectQuotePriceCostIssue(
  quoteLineItems: Array<{ total_cost: number | null; total: number | null }>
): string | null {
  if (!quoteLineItems || quoteLineItems.length === 0) return null;
  
  let suspiciousCount = 0;
  let totalItems = 0;
  
  for (const item of quoteLineItems) {
    const cost = item.total_cost || 0;
    const price = item.total || 0;
    
    if (cost === 0 || price === 0) continue;
    
    totalItems++;
    
    // If cost is within 2% of price, it's suspicious (cost should be significantly less than price)
    const costToPriceRatio = cost / price;
    if (costToPriceRatio > 0.98) {
      suspiciousCount++;
    }
  }
  
  if (totalItems === 0) return null;
  
  // If more than 30% of items have suspicious cost/price ratios
  const suspiciousPercent = (suspiciousCount / totalItems) * 100;
  if (suspiciousPercent > 30) {
    return `⚠ ${suspiciousCount} of ${totalItems} quote line items have costs very close to sell prices. Verify that costs (not prices) were entered.`;
  }
  
  return null;
}

/**
 * Validate that adjusted costs haven't decreased inappropriately
 * 
 * @param adjustedCosts - Current adjusted estimated costs
 * @param originalCosts - Original estimated costs
 * @returns Warning message if issue detected, null otherwise
 */
export function detectCostDecreaseIssue(
  adjustedCosts: number,
  originalCosts: number
): string | null {
  if (adjustedCosts === 0 || originalCosts === 0) return null;
  
  // Adjusted costs should generally be >= original costs (quotes may come in higher)
  // Allow a small decrease (5%) for efficiency gains, but flag larger decreases
  const decreasePercent = ((originalCosts - adjustedCosts) / originalCosts) * 100;
  
  if (decreasePercent > 5) {
    return `⚠ Adjusted costs ($${adjustedCosts.toFixed(0)}) are ${decreasePercent.toFixed(1)}% lower than original costs ($${originalCosts.toFixed(0)}). Verify quote data.`;
  }
  
  return null;
}

/**
 * Validate that projected costs don't exceed contract value unreasonably
 * 
 * @param projectedCosts - Total projected costs
 * @param contractValue - Total contract value (revenue)
 * @returns Warning message if issue detected, null otherwise
 */
export function detectCostExceedsContractIssue(
  projectedCosts: number,
  contractValue: number
): string | null {
  if (projectedCosts === 0 || contractValue === 0) return null;
  
  // If costs exceed 95% of contract, margin is critically low or data is wrong
  const costToContractRatio = projectedCosts / contractValue;
  
  if (costToContractRatio > 0.95) {
    return `⚠ Projected costs ($${projectedCosts.toFixed(0)}) are ${(costToContractRatio * 100).toFixed(1)}% of contract value ($${contractValue.toFixed(0)}). This indicates either critical margin risk or data entry errors (e.g., using prices instead of costs).`;
  }
  
  return null;
}

/**
 * Run all margin validation checks and return any warnings
 * 
 * @param project - Project with financial data
 * @param quoteLineItems - Optional quote line items for detailed validation
 * @returns Array of warning messages (empty if no issues)
 */
export function validateProjectMargin(
  project: {
    adjusted_est_costs?: number | null;
    original_est_costs?: number | null;
    contracted_amount?: number | null;
    projected_margin?: number | null;
  },
  quoteLineItems?: Array<{ total_cost: number | null; total: number | null }>
): string[] {
  const warnings: string[] = [];
  
  // Check quote data quality
  if (quoteLineItems) {
    const quoteWarning = detectQuotePriceCostIssue(quoteLineItems);
    if (quoteWarning) warnings.push(quoteWarning);
  }
  
  // Check cost decrease
  const adjustedCosts = project.adjusted_est_costs || 0;
  const originalCosts = project.original_est_costs || 0;
  if (adjustedCosts > 0 && originalCosts > 0) {
    const costDecreaseWarning = detectCostDecreaseIssue(adjustedCosts, originalCosts);
    if (costDecreaseWarning) warnings.push(costDecreaseWarning);
  }
  
  // Check costs vs contract
  const contractValue = project.contracted_amount || 0;
  if (adjustedCosts > 0 && contractValue > 0) {
    const costExceedsWarning = detectCostExceedsContractIssue(adjustedCosts, contractValue);
    if (costExceedsWarning) warnings.push(costExceedsWarning);
  }
  
  // Check for negative margin
  const projectedMargin = project.projected_margin || 0;
  if (projectedMargin < 0) {
    warnings.push(`⚠ Negative projected margin ($${projectedMargin.toFixed(0)}). Costs exceed revenue.`);
  }
  
  return warnings;
}
