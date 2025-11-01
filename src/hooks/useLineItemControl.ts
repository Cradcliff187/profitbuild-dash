import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineItem, LineItemCategory } from '@/types/estimate';
import { Expense, ExpenseCategory } from '@/types/expense';

export interface QuoteData {
  id: string;
  quoteNumber: string;
  quotedBy: string;
  total: number;
  status: string;
  includes_labor: boolean;
  includes_materials: boolean;
}

export interface LineItemControlData {
  id: string;
  category: string;
  description: string;
  // Pricing (client-facing)
  estimatedPrice: number; // from estimate line total/price_per_unit * qty
  quotedPrice: number; // sum of matching accepted quote line item totals (rate * qty)
  // Costs (vendor/internal)
  estimatedCost: number; // cost_per_unit * qty
  quotedCost: number; // sum of matching accepted quote line item costs (cost_per_unit * qty)
  marginImpact: number; // estimatedCost - quotedCost (positive = improves margin)
  // Actuals
  actualAmount: number; // actual expenses recorded (by category)
  // Expense Allocation (explicitly matched expenses)
  correlatedExpenses: any[]; // expenses explicitly matched via expense_line_item_correlations
  allocatedAmount: number; // sum of correlated expense amounts
  allocationStatus: 'full' | 'partial' | 'none' | 'internal' | 'not_quoted';
  remainingToAllocate: number; // quotedCost - allocatedAmount
  // Variances
  costVariance: number; // quotedCost - estimatedCost (positive = worse)
  costVariancePercent: number;
  variance: number; // legacy: actualAmount - estimatedPrice
  variancePercent: number; // legacy percent
  // Quotes/Expenses
  quoteStatus: 'none' | 'partial' | 'full' | 'over' | 'internal';
  quotes: QuoteData[];
  expenses: Expense[];
  estimateLineItemId?: string;
  // Legacy fields for backward compatibility
  estimatedAmount: number; // alias of estimatedPrice
  quotedAmount: number; // alias of quotedPrice
}

export interface LineItemControlSummary {
  totalEstimated: number;
  totalQuoted: number;
  totalActual: number;
  totalVariance: number;
  lineItemsWithQuotes: number;
  lineItemsOverBudget: number;
  completionPercentage: number;
}

interface UseLineItemControlReturn {
  lineItems: LineItemControlData[];
  summary: LineItemControlSummary;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLineItemControl(projectId: string): UseLineItemControlReturn {
  const [lineItems, setLineItems] = useState<LineItemControlData[]>([]);
  const [summary, setSummary] = useState<LineItemControlSummary>({
    totalEstimated: 0,
    totalQuoted: 0,
    totalActual: 0,
    totalVariance: 0,
    lineItemsWithQuotes: 0,
    lineItemsOverBudget: 0,
    completionPercentage: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch estimate with line items - prioritize approved, then current version, then latest
      let estimates: any = null;
      
      // 1. Try approved estimate first (latest by date)
      const { data: approvedEstimate, error: approvedError } = await supabase
        .from('estimates')
        .select(`
          id,
          estimate_line_items (
            id,
            category,
            description,
            quantity,
            rate,
            total,
            cost_per_unit,
            markup_percent,
            markup_amount
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .order('date_created', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (approvedError) console.warn('[LineItemControl] Error fetching approved estimate:', approvedError);
      
      if (approvedEstimate) {
        estimates = approvedEstimate;
        console.debug('[LineItemControl] Using approved estimate', estimates.id, 'items:', estimates.estimate_line_items?.length ?? 0);
      }

      // 2. Fallback to current version if no approved estimate
      if (!estimates) {
        const { data: currentEstimate, error: currentError } = await supabase
          .from('estimates')
          .select(`
            id,
            estimate_line_items (
              id,
              category,
              description,
              quantity,
              rate,
              total,
              cost_per_unit,
              markup_percent,
              markup_amount
            )
          `)
          .eq('project_id', projectId)
          .eq('is_current_version', true)
          .order('date_created', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (currentError) console.warn('[LineItemControl] Error fetching current estimate:', currentError);
        
        if (currentEstimate) {
          estimates = currentEstimate;
          console.debug('[LineItemControl] Using current version estimate', estimates.id, 'items:', estimates.estimate_line_items?.length ?? 0);
        }
      }

      // 3. Final fallback to latest estimate by date
      if (!estimates) {
        const { data: latestEstimate, error: latestError } = await supabase
          .from('estimates')
          .select(`
            id,
            estimate_line_items (
              id,
              category,
              description,
              quantity,
              rate,
              total,
              cost_per_unit,
              markup_percent,
              markup_amount
            )
          `)
          .eq('project_id', projectId)
          .order('date_created', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestError) console.warn('[LineItemControl] Error fetching latest estimate:', latestError);
        
        if (latestEstimate) {
          estimates = latestEstimate;
          console.debug('[LineItemControl] Using latest estimate', estimates.id, 'items:', estimates.estimate_line_items?.length ?? 0);
        }
      }

      if (!estimates) {
        console.debug('[LineItemControl] No estimate found for project', projectId);
      }

      // Fetch ALL quotes with line items and payee info
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          id,
          payee_id,
          quote_number,
          status,
          total_amount,
          includes_labor,
          includes_materials,
          quote_line_items (
            id,
            category,
            description,
            quantity,
            rate,
            total,
            estimate_line_item_id,
            cost_per_unit,
            total_cost
          ),
          payees (
            payee_name
          )
        `)
        .eq('project_id', projectId);

      if (quotesError) throw quotesError;

      // Fetch expenses grouped by category with payee info
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          payees (
            payee_name
          )
        `)
        .eq('project_id', projectId);

      if (expensesError) throw expensesError;

      // Fetch correlated expenses (explicitly matched)
      const estimateLineItemIds = (estimates?.estimate_line_items || []).map((li: any) => li.id);
      let correlatedExpensesData: any[] = [];
      
      // Only query correlations if we have line items
      if (estimateLineItemIds.length > 0) {
        const { data, error: correlationsError } = await supabase
          .from('expense_line_item_correlations')
          .select(`
            estimate_line_item_id,
            expense_id,
            expenses (
              id,
              amount,
              description,
              expense_date,
              category,
              payee_id,
              payees (payee_name)
            )
          `)
          .in('estimate_line_item_id', estimateLineItemIds);

        if (correlationsError) {
          console.warn('[LineItemControl] Error fetching correlations:', correlationsError);
        } else {
          correlatedExpensesData = data || [];
        }
      }

      // Group correlated expenses by line item
      const correlationsByLineItem = new Map();
      (correlatedExpensesData || []).forEach((corr: any) => {
        if (!correlationsByLineItem.has(corr.estimate_line_item_id)) {
          correlationsByLineItem.set(corr.estimate_line_item_id, []);
        }
        if (corr.expenses) {
          correlationsByLineItem.get(corr.estimate_line_item_id).push(corr.expenses);
        }
      });

      // Process and match data
      const processedLineItems = processLineItemData(
        estimates?.estimate_line_items || [],
        quotes || [],
        expenses || [],
        correlationsByLineItem
      );

      setLineItems(processedLineItems);
      setSummary(calculateSummary(processedLineItems));

    } catch (err) {
      console.error('Error fetching line item control data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    lineItems,
    summary,
    isLoading,
    error,
    refetch
  };
}

// Categories that are internal and should never have quotes
const INTERNAL_CATEGORIES = [LineItemCategory.LABOR, LineItemCategory.MANAGEMENT];

function isInternalCategory(category: string): boolean {
  return INTERNAL_CATEGORIES.includes(category as LineItemCategory);
}

function processLineItemData(
  estimateLineItems: any[],
  quotes: any[],
  expenses: any[],
  correlationsByLineItem: Map<string, any[]>
): LineItemControlData[] {
  return estimateLineItems.map(lineItem => {
    const qty = Number(lineItem.quantity ?? 0);
    const rate = Number(lineItem.rate ?? 0);
    const total = Number(lineItem.total ?? 0);
    const costPerUnit = Number(lineItem.cost_per_unit ?? 0);

    // Pricing (client-facing)
    const estimatedPrice = total || (qty * rate) || 0;
    // Cost (internal)
    const estimatedCost = qty * costPerUnit;

    // Quotes strictly linked to this estimate line item
    const relatedQuotes = (quotes || []).filter((q: any) =>
      q.estimate_line_item_id === lineItem.id ||
      (q.quote_line_items || []).some((qli: any) => qli.estimate_line_item_id === lineItem.id)
    );

    // Build per-quote data limited to this line item only
    const quoteRowsForUi: QuoteData[] = relatedQuotes.map((q: any) => {
      const itemsForLine = (q.quote_line_items || []).filter((qli: any) => qli.estimate_line_item_id === lineItem.id);
      const quoteTotalForThisLine = itemsForLine.reduce((s: number, li: any) => {
        const linePrice = Number(li.total ?? (Number(li.rate ?? 0) * Number(li.quantity ?? 0)));
        return s + linePrice;
      }, 0);
      return {
        id: q.id,
        quoteNumber: q.quote_number,
        quotedBy: q.payees?.payee_name || 'Unknown Vendor',
        total: quoteTotalForThisLine,
        status: q.status,
        includes_labor: q.includes_labor,
        includes_materials: q.includes_materials,
      } as QuoteData;
    });

    const acceptedQuotes = relatedQuotes.filter((q: any) => q.status === 'accepted');

    // Quoted costs and prices for this specific line item only
    const quotedCost = acceptedQuotes.reduce((sum: number, q: any) => {
      const itemsForLine = (q.quote_line_items || []).filter((qli: any) => qli.estimate_line_item_id === lineItem.id);
      const cost = itemsForLine.reduce((s: number, li: any) => s + (Number(li.cost_per_unit ?? 0) * Number(li.quantity ?? 0)), 0);
      return sum + cost;
    }, 0);

    const quotedPrice = acceptedQuotes.reduce((sum: number, q: any) => {
      const itemsForLine = (q.quote_line_items || []).filter((qli: any) => qli.estimate_line_item_id === lineItem.id);
      const price = itemsForLine.reduce((s: number, li: any) => s + Number(li.total ?? (Number(li.rate ?? 0) * Number(li.quantity ?? 0))), 0);
      return sum + price;
    }, 0);

    // Enhanced matching: payee + category matching with fallback to category only
    const acceptedQuotePayeeIds = new Set(
      acceptedQuotes.map((q: any) => q.payee_id).filter(Boolean)
    );

    const matchingExpenses = (expenses || []).filter((expense: any) => {
      // Primary match: Category + Payee (if expense has payee and matches accepted quote payee)
      if (expense.payee_id && acceptedQuotePayeeIds.has(expense.payee_id) && 
          expense.category === lineItem.category) {
        return true;
      }
      
      // Fallback match: Category only (for expenses without payee or unmatched payees)
      if (expense.category === lineItem.category && 
          (!expense.payee_id || !acceptedQuotePayeeIds.size)) {
        return true;
      }
      
      return false;
    }).map((expense: any) => ({
      ...expense,
      payee_name: expense.payees?.payee_name,
      matching_confidence: expense.payee_id && acceptedQuotePayeeIds.has(expense.payee_id) ? 'high' : 'category_only'
    }));

    const actualAmount = matchingExpenses.reduce((sum: number, e: any) => sum + Number(e.amount ?? 0), 0);

    // Legacy variance (price-based actual vs estimate)
    const variance = actualAmount - estimatedPrice;
    const variancePercent = estimatedPrice > 0 ? (variance / estimatedPrice) * 100 : 0;

    // Cost variance (quoted vs estimated cost)
    const costVariance = quotedCost - estimatedCost;
    const costVariancePercent = estimatedCost > 0 ? (costVariance / estimatedCost) * 100 : 0;
    
    // Margin impact (positive = improves margin)
    const marginImpact = estimatedCost - quotedCost;

    // Determine quote status based on category and accepted quotes
    let quoteStatus: 'none' | 'partial' | 'full' | 'over' | 'internal' = 'none';
    
    // Internal categories should never have quotes
    if (isInternalCategory(lineItem.category)) {
      quoteStatus = 'internal';
    } else {
      const acceptedQuoteCount = acceptedQuotes.length;
      
      if (acceptedQuoteCount === 0) {
        quoteStatus = 'none';
      } else if (acceptedQuoteCount === 1) {
        // One accepted quote = fully quoted (work is covered)
        quoteStatus = 'full';
      } else if (acceptedQuoteCount > 1) {
        // Multiple accepted quotes = over-quoted (might be split work)
        quoteStatus = 'over';
      }
    }

    // Calculate expense allocation status
    const correlatedExpenses = correlationsByLineItem.get(lineItem.id) || [];
    const allocatedAmount = correlatedExpenses.reduce(
      (sum: number, exp: any) => sum + Number(exp.amount ?? 0), 
      0
    );

    let allocationStatus: 'full' | 'partial' | 'none' | 'internal' | 'not_quoted' = 'none';
    let remainingToAllocate = 0;

    if (isInternalCategory(lineItem.category)) {
      allocationStatus = 'internal';
    } else if (acceptedQuotes.length === 0) {
      allocationStatus = 'not_quoted';
    } else {
      // Have accepted quotes - check if expenses are allocated
      remainingToAllocate = quotedCost - allocatedAmount;
      
      if (allocatedAmount >= quotedCost * 0.95) { // 95% threshold for "full"
        allocationStatus = 'full';
      } else if (allocatedAmount > 0) {
        allocationStatus = 'partial';
      } else {
        allocationStatus = 'none';
      }
    }

    return {
      id: lineItem.id,
      category: lineItem.category,
      description: lineItem.description,
      // New fields
      estimatedPrice,
      quotedPrice,
      estimatedCost,
      quotedCost,
      marginImpact,
      actualAmount,
      costVariance,
      costVariancePercent,
      // Expense allocation
      correlatedExpenses,
      allocatedAmount,
      allocationStatus,
      remainingToAllocate,
      // Legacy fields/aliases
      estimatedAmount: estimatedPrice,
      quotedAmount: quotedPrice,
      variance,
      variancePercent,
      // References
      quoteStatus,
      quotes: quoteRowsForUi,
      expenses: matchingExpenses,
      estimateLineItemId: lineItem.id,
    } as LineItemControlData;
  });
}

function calculateSummary(lineItems: LineItemControlData[]): LineItemControlSummary {
  const totalEstimated = lineItems.reduce((sum, item) => sum + item.estimatedAmount, 0);
  const totalQuoted = lineItems.reduce((sum, item) => sum + item.quotedCost, 0);
  const totalActual = lineItems.reduce((sum, item) => sum + item.actualAmount, 0);
  const totalVariance = totalActual - totalEstimated;
  
  const lineItemsWithQuotes = lineItems.filter(item => item.quotes.length > 0).length;
  const lineItemsOverBudget = lineItems.filter(item => item.variance > 0).length;
  
  const completionPercentage = totalEstimated > 0 ? Math.min((totalActual / totalEstimated) * 100, 100) : 0;

  return {
    totalEstimated,
    totalQuoted,
    totalActual,
    totalVariance,
    lineItemsWithQuotes,
    lineItemsOverBudget,
    completionPercentage
  };
}