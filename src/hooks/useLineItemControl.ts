import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineItem, LineItemCategory } from '@/types/estimate';
import { Expense, ExpenseCategory } from '@/types/expense';
import { Project } from '@/types/project';

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
  // Change Order tracking
  source?: 'estimate' | 'change_order';
  change_order_number?: string;
  change_order_id?: string;
}

export interface LineItemControlSummary {
  totalContractValue: number;      // from project.contracted_amount
  totalQuotedWithInternal: number; // quoted costs + internal labor costs
  totalEstimatedCost: number;      // all estimated costs
  totalActual: number;             // actual expenses (all category-matched)
  totalAllocated: number;          // explicitly allocated expenses only
  totalUnallocated: number;        // assigned but not allocated
  totalVariance: number;           // totalQuotedWithInternal - totalEstimatedCost
  lineItemsWithQuotes: number;
  lineItemsOverBudget: number;
  lineItemsUnderBudget: number;
  completionPercentage: number;
}

interface UseLineItemControlReturn {
  lineItems: LineItemControlData[];
  summary: LineItemControlSummary;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLineItemControl(projectId: string, project: Project): UseLineItemControlReturn {
  const [lineItems, setLineItems] = useState<LineItemControlData[]>([]);
  const [summary, setSummary] = useState<LineItemControlSummary>({
    totalContractValue: 0,
    totalQuotedWithInternal: 0,
    totalEstimatedCost: 0,
    totalActual: 0,
    totalAllocated: 0,
    totalUnallocated: 0,
    totalVariance: 0,
    lineItemsWithQuotes: 0,
    lineItemsOverBudget: 0,
    lineItemsUnderBudget: 0,
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
            change_order_line_item_id,
            cost_per_unit,
            total_cost
          ),
          payees (
            payee_name
          )
        `)
        .eq('project_id', projectId);

      if (quotesError) throw quotesError;

      // Fetch approved change orders with line items
      const { data: changeOrders, error: changeOrdersError } = await supabase
        .from('change_orders')
        .select(`
          id,
          change_order_number,
          description,
          status,
          client_amount,
          cost_impact,
          change_order_line_items (
            id,
            category,
            description,
            quantity,
            cost_per_unit,
            price_per_unit,
            total_cost,
            total_price,
            payee_id
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'approved');

      if (changeOrdersError) {
        console.warn('[LineItemControl] Error fetching change orders:', changeOrdersError);
      }

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

      // Fetch expense correlations for ALL types (estimate, quote, change order)
      // Get all expense IDs from this project
      const expenseIds = (expenses || []).map((exp: any) => exp.id);
      
      let correlationData: any[] = [];
      if (expenseIds.length > 0) {
        const { data, error: correlationsError } = await supabase
          .from('expense_line_item_correlations')
          .select(`
            *,
            expenses (
              id,
              amount,
              description,
              expense_date,
              category,
              payees (payee_name)
            )
          `)
          .in('expense_id', expenseIds);

        if (correlationsError) {
          console.warn('[LineItemControl] Error fetching correlations:', correlationsError);
        } else {
          correlationData = data || [];
        }
      }

      // Build quote-to-estimate mapping from quotes
      const quoteToEstimate = new Map<string, Array<{ estimate_line_item_id: string, total_cost: number }>>();
      for (const quote of (quotes || [])) {
        const { data: qliData } = await supabase
          .from('quote_line_items')
          .select('estimate_line_item_id, total_cost')
          .eq('quote_id', quote.id)
          .not('estimate_line_item_id', 'is', null);
        
        if (qliData && qliData.length > 0) {
          quoteToEstimate.set(quote.id, qliData as any[]);
        }
      }

      // Build correlation map by line item (supporting estimate, quote, and change order allocations)
      const correlationsByLineItem = new Map<string, any[]>();
      const seenExpenses = new Map<string, Set<string>>(); // Track expense_id per line_item to avoid dupes
      
      if (correlationData) {
        for (const corr of correlationData) {
          let targetLineItemIds: string[] = [];
          
          // Direct estimate line item allocation
          if (corr.estimate_line_item_id) {
            targetLineItemIds.push(corr.estimate_line_item_id);
          }
          
          // Direct change order line item allocation
          if (corr.change_order_line_item_id) {
            targetLineItemIds.push(corr.change_order_line_item_id);
          }
          
          // Quote allocation - map to estimate line items
          if (corr.quote_id && quoteToEstimate.has(corr.quote_id)) {
            const candidates = quoteToEstimate.get(corr.quote_id)!;
            
            if (candidates.length === 1) {
              // Single candidate - straightforward mapping
              targetLineItemIds.push(candidates[0].estimate_line_item_id);
            } else if (candidates.length > 1) {
              // Multiple candidates - use heuristic
              const expenseAmount = corr.expenses?.amount || 0;
              
              if (expenseAmount > 0) {
                // Find closest match by cost
                let closestCandidate = candidates[0];
                let smallestDiff = Math.abs(candidates[0].total_cost - expenseAmount);
                
                for (let i = 1; i < candidates.length; i++) {
                  const diff = Math.abs(candidates[i].total_cost - expenseAmount);
                  if (diff < smallestDiff) {
                    smallestDiff = diff;
                    closestCandidate = candidates[i];
                  }
                }
                
                targetLineItemIds.push(closestCandidate.estimate_line_item_id);
                console.warn(`[LineItemControl] Quote ${corr.quote_id} has ${candidates.length} estimate line items. Mapped expense $${expenseAmount} to closest match (cost diff: $${smallestDiff.toFixed(2)})`);
              } else {
                // No expense amount - use first candidate
                targetLineItemIds.push(candidates[0].estimate_line_item_id);
                console.warn(`[LineItemControl] Quote ${corr.quote_id} has ${candidates.length} estimate line items. Using first candidate (no expense amount available).`);
              }
            }
          }
          
          // Add to map with deduplication
          for (const lineItemId of targetLineItemIds) {
            if (!seenExpenses.has(lineItemId)) {
              seenExpenses.set(lineItemId, new Set());
            }
            
            const expenseId = corr.expense_id;
            if (!seenExpenses.get(lineItemId)!.has(expenseId)) {
              const existing = correlationsByLineItem.get(lineItemId) || [];
              const expenseData = corr.expenses;
              if (expenseData) {
                correlationsByLineItem.set(lineItemId, [...existing, expenseData]);
                seenExpenses.get(lineItemId)!.add(expenseId);
              }
            }
          }
        }
      }
      
      console.log(`[LineItemControl] Loaded ${correlationData?.length || 0} correlations, mapped to ${correlationsByLineItem.size} line items`);

      // Process and match data
      const processedLineItems = processLineItemData(
        estimates?.estimate_line_items || [],
        quotes || [],
        expenses || [],
        correlationsByLineItem,
        changeOrders || []
      );

      setLineItems(processedLineItems);
      setSummary(calculateSummary(processedLineItems, project, expenses || []));

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
  correlationsByLineItem: Map<string, any[]>,
  changeOrders: any[]
): LineItemControlData[] {
  // Combine estimate line items with change order line items
  const allLineItems = [
    ...estimateLineItems.map(item => ({ ...item, source: 'estimate' as const })),
    ...changeOrders.flatMap(co => 
      (co.change_order_line_items || []).map((item: any) => ({
        ...item,
        source: 'change_order' as const,
        change_order_number: co.change_order_number,
        change_order_id: co.id,
        // Map change order fields to estimate line item structure
        rate: item.price_per_unit || 0,
        total: item.total_price || 0,
        cost_per_unit: item.cost_per_unit || 0,
      }))
    )
  ];

  return allLineItems.map(lineItem => {
    const qty = Number(lineItem.quantity ?? 0);
    const rate = Number(lineItem.rate ?? 0);
    const total = Number(lineItem.total ?? 0);
    const costPerUnit = Number(lineItem.cost_per_unit ?? 0);

    // Pricing (client-facing)
    const estimatedPrice = total || (qty * rate) || 0;
    // Cost (internal)
    const estimatedCost = qty * costPerUnit;

    // Quotes strictly linked to this estimate or change order line item
    const relatedQuotes = (quotes || []).filter((q: any) => {
      return (q.quote_line_items || []).some((qli: any) => {
        if (lineItem.source === 'change_order') {
          return qli.change_order_line_item_id === lineItem.id;
        } else {
          return qli.estimate_line_item_id === lineItem.id;
        }
      });
    });

    // Build per-quote data limited to this line item only
    const quoteRowsForUi: QuoteData[] = relatedQuotes.map((q: any) => {
      const itemsForLine = (q.quote_line_items || []).filter((qli: any) => {
        if (lineItem.source === 'change_order') {
          return qli.change_order_line_item_id === lineItem.id;
        } else {
          return qli.estimate_line_item_id === lineItem.id;
        }
      });
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
      const itemsForLine = (q.quote_line_items || []).filter((qli: any) => {
        if (lineItem.source === 'change_order') {
          return qli.change_order_line_item_id === lineItem.id;
        } else {
          return qli.estimate_line_item_id === lineItem.id;
        }
      });
      const cost = itemsForLine.reduce((s: number, li: any) => s + (Number(li.cost_per_unit ?? 0) * Number(li.quantity ?? 0)), 0);
      return sum + cost;
    }, 0);

    const quotedPrice = acceptedQuotes.reduce((sum: number, q: any) => {
      const itemsForLine = (q.quote_line_items || []).filter((qli: any) => {
        if (lineItem.source === 'change_order') {
          return qli.change_order_line_item_id === lineItem.id;
        } else {
          return qli.estimate_line_item_id === lineItem.id;
        }
      });
      const price = itemsForLine.reduce((s: number, li: any) => s + Number(li.total ?? (Number(li.rate ?? 0) * Number(li.quantity ?? 0))), 0);
      return sum + price;
    }, 0);

    // Calculate expense allocation status (explicit correlations only)
    const correlatedExpenses = correlationsByLineItem.get(lineItem.id) || [];
    const allocatedAmount = correlatedExpenses.reduce(
      (sum: number, exp: any) => sum + Number(exp.amount ?? 0), 
      0
    );

    // Actual amount = explicitly allocated expenses only (no category matching)
    const actualAmount = allocatedAmount;

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
      expenses: correlatedExpenses,
      estimateLineItemId: lineItem.id,
      // Change order tracking
      source: lineItem.source,
      change_order_number: lineItem.change_order_number,
      change_order_id: lineItem.change_order_id,
    } as LineItemControlData;
  });
}

function calculateSummary(lineItems: LineItemControlData[], project: Project, allProjectExpenses: any[]): LineItemControlSummary {
  // Total Estimated Cost: sum of all estimated costs (internal + external)
  const totalEstimatedCost = lineItems.reduce((sum, item) => sum + item.estimatedCost, 0);
  
  // Total Quoted + Internal Labor: 
  // - For internal categories: use estimated cost
  // - For external categories: use quoted cost
  const totalQuotedWithInternal = lineItems.reduce((sum, item) => {
    if (isInternalCategory(item.category)) {
      return sum + item.estimatedCost; // Use estimate for internal
    } else {
      return sum + item.quotedCost; // Use quote for external
    }
  }, 0);
  
  // Calculate total project expenses
  const totalProjectExpenses = allProjectExpenses.reduce(
    (sum: number, exp: any) => sum + Number(exp.amount ?? 0),
    0
  );
  
  // Total Actual = ALL expenses assigned to this project (allocated + unallocated)
  const totalActual = totalProjectExpenses;
  
  // Total Allocated = same as totalActual (explicitly correlated expenses)
  const totalAllocated = lineItems.reduce((sum, item) => sum + item.allocatedAmount, 0);
  
  // Unallocated = project expenses not yet matched to any line item
  const totalUnallocated = Math.max(0, totalProjectExpenses - totalAllocated);
  
  // Total Variance: (Quoted + Internal) vs Estimated Cost
  // Positive = over budget (quotes came in higher than estimated)
  // Negative = under budget (quotes came in lower than estimated)
  const totalVariance = totalQuotedWithInternal - totalEstimatedCost;
  
  // Contract Value: from project table
  const totalContractValue = project.contracted_amount || 0;
  
  const lineItemsWithQuotes = lineItems.filter(item => 
    item.quotes.filter(q => q.status === 'accepted').length > 0
  ).length;
  
  // Items over budget: where quoted cost > estimated cost (for external items)
  const lineItemsOverBudget = lineItems.filter(item => 
    !isInternalCategory(item.category) && item.costVariance > 0
  ).length;
  
  // Items under budget: where quoted cost < estimated cost (for external items)
  const lineItemsUnderBudget = lineItems.filter(item => 
    !isInternalCategory(item.category) && item.costVariance < 0
  ).length;
  
  // Completion %: actual vs quoted+internal (more meaningful baseline)
  const completionPercentage = totalQuotedWithInternal > 0 
    ? Math.min((totalActual / totalQuotedWithInternal) * 100, 100) 
    : 0;

  console.log('[LineItemControl] Summary:', {
    totalEstimatedCost,
    totalQuotedWithInternal,
    totalProjectExpenses,
    totalAllocated,
    totalUnallocated
  });
  
  // Debug first 3 line items
  if (lineItems.length > 0) {
    console.log('[LineItemControl] First 3 line items allocated/actual:', 
      lineItems.slice(0, 3).map(li => ({
        desc: li.description.substring(0, 30),
        allocated: li.allocatedAmount,
        actual: li.actualAmount
      }))
    );
  }

  return {
    totalContractValue,
    totalQuotedWithInternal,
    totalEstimatedCost,
    totalActual,
    totalAllocated,
    totalUnallocated,
    totalVariance,
    lineItemsWithQuotes,
    lineItemsOverBudget,
    lineItemsUnderBudget,
    completionPercentage
  };
}