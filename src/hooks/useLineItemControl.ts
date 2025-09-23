import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineItem } from '@/types/estimate';
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
  // Variances
  costVariance: number; // quotedCost - estimatedCost (positive = worse)
  costVariancePercent: number;
  variance: number; // legacy: actualAmount - estimatedPrice
  variancePercent: number; // legacy percent
  // Quotes/Expenses
  quoteStatus: 'none' | 'partial' | 'full' | 'over';
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

      // Fetch current estimate with line items
      const { data: estimates, error: estimateError } = await supabase
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
        .maybeSingle();

      if (estimateError) throw estimateError;

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
          estimate_line_item_id,
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

      // Process and match data
      const processedLineItems = processLineItemData(
        estimates?.estimate_line_items || [],
        quotes || [],
        expenses || []
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

function processLineItemData(
  estimateLineItems: any[],
  quotes: any[],
  expenses: any[]
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

    // Expenses currently matched by category (no direct link available in schema)
    const matchingExpenses = (expenses || []).filter((expense: any) => 
      expense.category === lineItem.category
    ).map((expense: any) => ({
      ...expense,
      payee_name: expense.payees?.payee_name
    }));

    const actualAmount = matchingExpenses.reduce((sum: number, e: any) => sum + Number(e.amount ?? 0), 0);

    // Legacy variance (price-based actual vs estimate)
    const variance = actualAmount - estimatedPrice;
    const variancePercent = estimatedPrice > 0 ? (variance / estimatedPrice) * 100 : 0;

    // Cost variance (quoted vs estimated cost)
    const costVariance = quotedCost - estimatedCost;
    const costVariancePercent = estimatedCost > 0 ? (costVariance / estimatedCost) * 100 : 0;

    // Quote status based on all quotes amounts for THIS line only
    const allQuotesAmountForLine = relatedQuotes.reduce((sum: number, q: any) => {
      const itemsForLine = (q.quote_line_items || []).filter((qli: any) => qli.estimate_line_item_id === lineItem.id);
      const price = itemsForLine.reduce((s: number, li: any) => s + Number(li.total ?? (Number(li.rate ?? 0) * Number(li.quantity ?? 0))), 0);
      return sum + price;
    }, 0);

    let quoteStatus: 'none' | 'partial' | 'full' | 'over' = 'none';
    if (relatedQuotes.length === 0) {
      quoteStatus = 'none';
    } else if (allQuotesAmountForLine === 0) {
      quoteStatus = 'partial';
    } else if (allQuotesAmountForLine > estimatedPrice * 1.2) {
      quoteStatus = 'over';
    } else if (allQuotesAmountForLine < estimatedPrice * 0.8) {
      quoteStatus = 'partial';
    } else {
      quoteStatus = 'full';
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
      actualAmount,
      costVariance,
      costVariancePercent,
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