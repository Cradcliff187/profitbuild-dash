import { InternalLaborRates } from '@/types/companySettings';

export interface LaborCalculationInput {
  laborHours: number;
  billingRatePerHour: number;
  actualCostRatePerHour: number;
  markupPercent: number;
}

export interface LaborCalculationResult {
  // What client sees
  billingTotal: number;           // hours × billing rate
  clientPrice: number;            // billingTotal × (1 + markup%)
  
  // Internal reality
  actualCost: number;             // hours × actual cost rate
  laborCushion: number;           // billingTotal - actualCost
  standardMarkupAmount: number;   // billingTotal × markup%
  
  // True profit
  trueProfit: number;             // laborCushion + standardMarkupAmount
  trueProfitPercent: number;      // trueProfit / actualCost × 100
}

/**
 * Calculate all labor-related financial metrics
 */
export function calculateLaborMetrics(input: LaborCalculationInput): LaborCalculationResult {
  const { laborHours, billingRatePerHour, actualCostRatePerHour, markupPercent } = input;
  
  const billingTotal = laborHours * billingRatePerHour;
  const actualCost = laborHours * actualCostRatePerHour;
  const laborCushion = billingTotal - actualCost;
  const standardMarkupAmount = billingTotal * (markupPercent / 100);
  const clientPrice = billingTotal + standardMarkupAmount;
  const trueProfit = laborCushion + standardMarkupAmount;
  const trueProfitPercent = actualCost > 0 ? (trueProfit / actualCost) * 100 : 0;
  
  return {
    billingTotal,
    clientPrice,
    actualCost,
    laborCushion,
    standardMarkupAmount,
    trueProfit,
    trueProfitPercent,
  };
}

/**
 * Convert a dollar amount at billing rate to labor hours
 */
export function dollarAmountToLaborHours(
  dollarAmount: number, 
  billingRatePerHour: number
): number {
  if (billingRatePerHour <= 0) return 0;
  return dollarAmount / billingRatePerHour;
}

/**
 * Calculate labor cushion for a set of line items
 */
export function calculateTotalLaborCushion(
  lineItems: Array<{
    category: string;
    laborHours?: number | null;
    billingRatePerHour?: number | null;
    actualCostRatePerHour?: number | null;
  }>
): number {
  return lineItems
    .filter(item => item.category === 'labor_internal')
    .reduce((sum, item) => {
      if (!item.laborHours || !item.billingRatePerHour || !item.actualCostRatePerHour) {
        return sum;
      }
      const cushion = item.laborHours * (item.billingRatePerHour - item.actualCostRatePerHour);
      return sum + cushion;
    }, 0);
}

/**
 * Auto-populate labor fields from company settings
 * 
 * IMPORTANT: costPerUnit uses billing rate (not actual cost) because the billing rate
 * includes the "labor cushion" - the hidden profit opportunity built into the cost structure.
 * This way, the cushion is baked into the "Total Estimated Cost" shown to clients.
 */
export function createLaborLineItemDefaults(
  laborRates: InternalLaborRates,
  laborHours: number,
  markupPercent: number = 25
): {
  laborHours: number;
  billingRatePerHour: number;
  actualCostRatePerHour: number;
  costPerUnit: number;
  pricePerUnit: number;
  quantity: number;
  unit: string;
} {
  return {
    laborHours,
    billingRatePerHour: laborRates.billing_rate_per_hour,
    actualCostRatePerHour: laborRates.actual_cost_per_hour,
    costPerUnit: laborRates.billing_rate_per_hour, // Billing rate (includes cushion)
    pricePerUnit: laborRates.billing_rate_per_hour * (1 + markupPercent / 100), // Billing + markup
    quantity: laborHours,
    unit: 'hr',
  };
}
