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
  estimatedAmount: number;
  quotedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  quoteStatus: 'none' | 'partial' | 'full' | 'over';
  quotes: QuoteData[];
  expenses: Expense[];
  estimateLineItemId?: string;
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
            estimate_line_item_id
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
    // Find quotes that match this line item by category (most common approach)
    // and also check for direct line item linking as fallback
    const matchingQuotes = quotes.filter(quote => 
      quote.estimate_line_item_id === lineItem.id ||
      quote.quote_line_items?.some((qli: any) => 
        qli.estimate_line_item_id === lineItem.id ||
        qli.category === lineItem.category
      )
    ).map(quote => ({
      id: quote.id,
      quoteNumber: quote.quote_number,
      quotedBy: quote.payees?.payee_name || 'Unknown Vendor',
      total: quote.total_amount || 0,
      status: quote.status,
      includes_labor: quote.includes_labor,
      includes_materials: quote.includes_materials
    }));

    // Calculate quoted amount - only count accepted quotes for accurate totals
    const acceptedQuotes = matchingQuotes.filter(quote => quote.status === 'accepted');
    const quotedAmount = acceptedQuotes.reduce((sum, quote) => sum + quote.total, 0);

    // Find expenses by category matching with enhanced data
    const matchingExpenses = expenses.filter(expense => 
      expense.category === lineItem.category
    ).map(expense => ({
      ...expense,
      payee_name: expense.payees?.payee_name
    }));

    // Calculate actual amount from matching expenses
    const actualAmount = matchingExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    const estimatedAmount = lineItem.total || 0;
    const variance = actualAmount - estimatedAmount;
    const variancePercent = estimatedAmount > 0 ? (variance / estimatedAmount) * 100 : 0;

    // Determine quote status based on ALL quotes (not just accepted)
    const allQuotesAmount = matchingQuotes.reduce((sum, quote) => sum + quote.total, 0);
    let quoteStatus: 'none' | 'partial' | 'full' | 'over' = 'none';
    
    if (matchingQuotes.length === 0) {
      quoteStatus = 'none';
    } else if (allQuotesAmount < estimatedAmount * 0.8) {
      quoteStatus = 'partial';
    } else if (allQuotesAmount > estimatedAmount * 1.2) {
      quoteStatus = 'over';
    } else {
      quoteStatus = 'full';
    }

    return {
      id: lineItem.id,
      category: lineItem.category,
      description: lineItem.description,
      estimatedAmount,
      quotedAmount, // Only accepted quotes counted here
      actualAmount,
      variance,
      variancePercent,
      quoteStatus,
      quotes: matchingQuotes, // All quotes for display
      expenses: matchingExpenses,
      estimateLineItemId: lineItem.id
    };
  });
}

function calculateSummary(lineItems: LineItemControlData[]): LineItemControlSummary {
  const totalEstimated = lineItems.reduce((sum, item) => sum + item.estimatedAmount, 0);
  const totalQuoted = lineItems.reduce((sum, item) => sum + item.quotedAmount, 0);
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