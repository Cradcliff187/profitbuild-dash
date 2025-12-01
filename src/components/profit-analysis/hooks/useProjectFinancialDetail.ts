import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_DISPLAY_MAP, LineItemCategory } from '@/types/estimate';

export interface LineItemDetail {
  id: string;
  category: string;
  description: string;
  estimatedCost: number;
  quotedCost: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
  hasAcceptedQuote: boolean;
  quotePayee: string | null;
}

export interface CategorySummary {
  category: string;
  categoryLabel: string;
  estimatedCost: number;
  quotedCost: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
  lineItems: LineItemDetail[];
  isExpanded: boolean;
}

export interface AllocatedExpense {
  id: string;
  date: string;
  payee: string;
  description: string;
  amount: number;
  isSplit: boolean;
}

export interface LineItemAllocationDetail {
  id: string;
  source: 'estimate' | 'change_order';
  changeOrderNumber?: string;
  category: string;
  categoryLabel: string;
  description: string;
  estimatedCost: number;
  quotedCost: number;
  quotedBy: string | null;
  allocatedAmount: number;
  hasAllocation: boolean;
  allocationStatus: 'full' | 'partial' | 'none';
  expenses: AllocatedExpense[];
}

export interface AllocationSummary {
  totalExternalLineItems: number;
  allocatedCount: number;
  pendingCount: number;
  allocationPercent: number;
  lineItems: LineItemAllocationDetail[];
}

export interface ProjectFinancialDetail {
  // Line item level detail
  categories: CategorySummary[];
  
  // Computed stage transitions
  estimateToQuoteChange: number;
  estimateToQuotePercent: number;
  quoteToActualChange: number;
  quoteToActualPercent: number;
  
  // For in-progress: projected final
  projectedFinalCost: number | null;
  projectedFinalMargin: number | null;
  burnRate: number | null; // % of budget used vs % of project complete
  
  // Allocation tracking
  allocationSummary: AllocationSummary | null;
}

export function useProjectFinancialDetail(projectId: string | null) {
  return useQuery({
    queryKey: ['project-financial-detail', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      // Fetch estimate line items with linked quotes
      const { data: estimateData, error: estError } = await supabase
        .from('estimates')
        .select(`
          id,
          total_cost,
          contingency_amount,
          estimate_line_items (
            id,
            category,
            description,
            quantity,
            cost_per_unit,
            total_cost
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .eq('is_current_version', true)
        .single();
      
      if (estError && estError.code !== 'PGRST116') throw estError;
      
      // Fetch accepted quotes with line items
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          id,
          status,
          total_amount,
          payees (payee_name),
          quote_line_items (
            id,
            estimate_line_item_id,
            change_order_line_item_id,
            category,
            description,
            quantity,
            rate,
            cost_per_unit,
            total_cost
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'accepted');
      
      if (quotesError) throw quotesError;
      
      // Fetch approved change orders with line items
      const { data: changeOrdersData, error: changeOrdersError } = await supabase
        .from('change_orders')
        .select(`
          id,
          change_order_number,
          change_order_line_items (
            id,
            category,
            description,
            quantity,
            cost_per_unit,
            total_cost
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'approved');
      
      if (changeOrdersError) {
        console.warn('[ProjectFinancialDetail] Error fetching change orders:', changeOrdersError);
      }
      
      // Fetch expenses with correlations
      // Reference: src/hooks/useLineItemControl.ts for correlation logic
      // First, get all expenses for this project
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('id')
        .eq('project_id', projectId);
      
      if (expensesError) throw expensesError;
      
      // Get expense split IDs for this project
      const { data: projectSplits, error: splitsError } = await supabase
        .from('expense_splits')
        .select('id')
        .eq('project_id', projectId);
      
      if (splitsError) throw splitsError;
      
      const expenseIds = (expenses || []).map((exp: any) => exp.id);
      const splitIds = (projectSplits || []).map((split: any) => split.id);
      
      let expenseData: any[] = [];
      
      // Fetch correlations for both direct expenses AND expense splits
      if (expenseIds.length > 0 || splitIds.length > 0) {
        const queries = [];
        
        // Query 1: Direct expense correlations
        if (expenseIds.length > 0) {
          queries.push(
            supabase
              .from('expense_line_item_correlations')
              .select(`
                id,
                expense_id,
                expense_split_id,
                estimate_line_item_id,
                change_order_line_item_id,
                quote_id,
                expenses (
                  id,
                  amount,
                  category,
                  description,
                  expense_date,
                  payees (payee_name)
                ),
                expense_splits (
                  id,
                  split_amount,
                  projects (project_name)
                )
              `)
              .in('expense_id', expenseIds)
          );
        }
        
        // Query 2: Split expense correlations
        if (splitIds.length > 0) {
          queries.push(
            supabase
              .from('expense_line_item_correlations')
              .select(`
                id,
                expense_id,
                expense_split_id,
                estimate_line_item_id,
                change_order_line_item_id,
                quote_id,
                expense_splits!inner (
                  id,
                  split_amount,
                  project_id,
                  expense_id,
                  projects (
                    project_name
                  ),
                  expenses!inner (
                    id,
                    amount,
                    description,
                    expense_date,
                    category,
                    payees (payee_name)
                  )
                )
              `)
              .in('expense_split_id', splitIds)
          );
        }
        
        const results = await Promise.all(queries);
        expenseData = results.flatMap(r => r.data || []);
      }
      
      // Process and group by category
      const categories = processLineItemData(
        estimateData?.estimate_line_items || [],
        changeOrdersData || [],
        quotesData || [],
        expenseData || []
      );
      
      // Build allocation summary (external line items only)
      const allocationSummary = buildAllocationSummary(
        estimateData?.estimate_line_items || [],
        changeOrdersData || [],
        quotesData || [],
        expenseData || []
      );
      
      // Calculate stage transitions
      const totalEstimated = categories.reduce((sum, cat) => sum + cat.estimatedCost, 0);
      const totalQuoted = categories.reduce((sum, cat) => sum + cat.quotedCost, 0);
      const totalActual = categories.reduce((sum, cat) => sum + cat.actualCost, 0);
      
      const estimateToQuoteChange = totalQuoted - totalEstimated;
      const estimateToQuotePercent = totalEstimated > 0 
        ? (estimateToQuoteChange / totalEstimated) * 100 
        : 0;
      
      const quoteToActualChange = totalActual - totalQuoted;
      const quoteToActualPercent = totalQuoted > 0 
        ? (quoteToActualChange / totalQuoted) * 100 
        : 0;
      
      // Return the detail structure (project comes from parent component)
      return {
        categories,
        estimateToQuoteChange,
        estimateToQuotePercent,
        quoteToActualChange,
        quoteToActualPercent,
        projectedFinalCost: null,
        projectedFinalMargin: null,
        burnRate: null,
        allocationSummary
      };
    },
    enabled: !!projectId
  });
}

function processLineItemData(
  estimateLineItems: any[],
  changeOrders: any[],
  quotes: any[],
  correlations: any[]
): CategorySummary[] {
  // Build quote-to-estimate mapping
  const quoteToEstimate = new Map<string, Array<{ estimate_line_item_id: string, total_cost: number }>>();
  // Build quote-to-change-order mapping
  const quoteToChangeOrder = new Map<string, Array<{ change_order_line_item_id: string, total_cost: number }>>();
  for (const quote of quotes) {
    const quoteLineItems = quote.quote_line_items || [];
    for (const qli of quoteLineItems) {
      if (qli.estimate_line_item_id) {
        if (!quoteToEstimate.has(quote.id)) {
          quoteToEstimate.set(quote.id, []);
        }
        quoteToEstimate.get(quote.id)!.push({
          estimate_line_item_id: qli.estimate_line_item_id,
          total_cost: qli.total_cost || 0
        });
      }
      if (qli.change_order_line_item_id) {
        if (!quoteToChangeOrder.has(quote.id)) {
          quoteToChangeOrder.set(quote.id, []);
        }
        quoteToChangeOrder.get(quote.id)!.push({
          change_order_line_item_id: qli.change_order_line_item_id,
          total_cost: qli.total_cost || 0
        });
      }
    }
  }
  
  // Build correlation map by line item
  const correlationsByLineItem = new Map<string, any[]>();
  const seenExpenses = new Map<string, Set<string>>();
  
  for (const corr of correlations) {
    let targetLineItemIds: string[] = [];
    
    // Direct estimate line item allocation
    if (corr.estimate_line_item_id) {
      targetLineItemIds.push(corr.estimate_line_item_id);
    }
    
    // Quote allocation - map to estimate line items
    if (corr.quote_id && quoteToEstimate.has(corr.quote_id)) {
      const candidates = quoteToEstimate.get(corr.quote_id)!;
      if (candidates.length === 1) {
        targetLineItemIds.push(candidates[0].estimate_line_item_id);
      } else if (candidates.length > 1) {
        // Multiple candidates - use first (heuristic)
        targetLineItemIds.push(candidates[0].estimate_line_item_id);
      }
    }
    
    // Direct change order line item allocation
    if (corr.change_order_line_item_id) {
      targetLineItemIds.push(corr.change_order_line_item_id);
    }
    
    // Quote allocation - map to change order line items
    if (corr.quote_id && quoteToChangeOrder.has(corr.quote_id)) {
      const candidates = quoteToChangeOrder.get(corr.quote_id)!;
      if (candidates.length === 1) {
        targetLineItemIds.push(candidates[0].change_order_line_item_id);
      } else if (candidates.length > 1) {
        // Multiple candidates - use first (heuristic)
        targetLineItemIds.push(candidates[0].change_order_line_item_id);
      }
    }
    
    // Determine which expense data to use (split or parent)
    let expenseDataToUse: any;
    let trackingId: string;
    
    if (corr.expense_split_id && corr.expense_splits) {
      const parentExpense = corr.expense_splits?.expenses;
      expenseDataToUse = {
        id: corr.expense_splits.id,
        amount: corr.expense_splits.split_amount,
        description: `${parentExpense?.description || 'Split'} (${corr.expense_splits.projects?.project_name || 'Unknown'})`,
        expense_date: parentExpense?.expense_date,
        category: parentExpense?.category,
        payees: parentExpense?.payees,
        is_split: true
      };
      trackingId = corr.expense_split_id;
    } else if (corr.expenses) {
      expenseDataToUse = corr.expenses;
      trackingId = corr.expense_id;
    }
    
    // Add to map with deduplication
    for (const lineItemId of targetLineItemIds) {
      if (!seenExpenses.has(lineItemId)) {
        seenExpenses.set(lineItemId, new Set());
      }
      
      if (expenseDataToUse && !seenExpenses.get(lineItemId)!.has(trackingId)) {
        const existing = correlationsByLineItem.get(lineItemId) || [];
        correlationsByLineItem.set(lineItemId, [...existing, expenseDataToUse]);
        seenExpenses.get(lineItemId)!.add(trackingId);
      }
    }
  }
  
  // Process line items and group by category
  const categoryMap = new Map<string, CategorySummary>();
  
  // Process estimate line items
  for (const lineItem of estimateLineItems) {
    const category = lineItem.category;
    const categoryLabel = CATEGORY_DISPLAY_MAP[category as LineItemCategory] || category;
    
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        categoryLabel,
        estimatedCost: 0,
        quotedCost: 0,
        actualCost: 0,
        variance: 0,
        variancePercent: 0,
        lineItems: [],
        isExpanded: false
      });
    }
    
    const categoryData = categoryMap.get(category)!;
    
    // Estimated cost
    const estimatedCost = (lineItem.quantity || 0) * (lineItem.cost_per_unit || 0);
    categoryData.estimatedCost += estimatedCost;
    
    // Find related quotes
    const relatedQuotes = quotes.filter((q: any) => {
      return (q.quote_line_items || []).some((qli: any) => 
        qli.estimate_line_item_id === lineItem.id
      );
    });
    
    const acceptedQuotes = relatedQuotes.filter((q: any) => q.status === 'accepted');
    
    // Quoted cost for this line item
    const quotedCost = acceptedQuotes.reduce((sum: number, q: any) => {
      const itemsForLine = (q.quote_line_items || []).filter((qli: any) => 
        qli.estimate_line_item_id === lineItem.id
      );
      const cost = itemsForLine.reduce((s: number, li: any) => {
        // Calculate from cost_per_unit * quantity (primary method)
        // Fallback to total_cost if cost_per_unit calculation yields 0
        const calculatedCost = Number(li.cost_per_unit ?? 0) * Number(li.quantity ?? 0);
        const lineCost = calculatedCost > 0 ? calculatedCost : Number(li.total_cost || 0);
        return s + lineCost;
      }, 0);
      return sum + cost;
    }, 0);
    
    categoryData.quotedCost += quotedCost;
    
    // Actual cost from correlations
    const correlatedExpenses = correlationsByLineItem.get(lineItem.id) || [];
    const actualCost = correlatedExpenses.reduce(
      (sum: number, exp: any) => sum + Number(exp.amount || 0), 
      0
    );
    
    categoryData.actualCost += actualCost;
    
    // Calculate variance (actual vs quoted, or actual vs estimated if no quote)
    const baselineCost = quotedCost > 0 ? quotedCost : estimatedCost;
    const variance = actualCost - baselineCost;
    const variancePercent = baselineCost > 0 ? (variance / baselineCost) * 100 : 0;
    
    // Get quote payee info
    const quotePayee = acceptedQuotes.length > 0 
      ? acceptedQuotes[0].payees?.payee_name || null
      : null;
    
    // Add line item detail
    categoryData.lineItems.push({
      id: lineItem.id,
      category,
      description: lineItem.description,
      estimatedCost,
      quotedCost,
      actualCost,
      variance,
      variancePercent,
      hasAcceptedQuote: acceptedQuotes.length > 0,
      quotePayee
    });
  }
  
  // Process change order line items
  for (const co of changeOrders) {
    for (const lineItem of co.change_order_line_items || []) {
      const category = lineItem.category;
      const categoryLabel = CATEGORY_DISPLAY_MAP[category as LineItemCategory] || category;
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          categoryLabel,
          estimatedCost: 0,
          quotedCost: 0,
          actualCost: 0,
          variance: 0,
          variancePercent: 0,
          lineItems: [],
          isExpanded: false
        });
      }
      
      const categoryData = categoryMap.get(category)!;
      
      // Estimated cost (from change order line item)
      const estimatedCost = lineItem.total_cost || 0;
      categoryData.estimatedCost += estimatedCost;
      
      // Find related quotes
      const relatedQuotes = quotes.filter((q: any) => {
        return (q.quote_line_items || []).some((qli: any) => 
          qli.change_order_line_item_id === lineItem.id
        );
      });
      
      const acceptedQuotes = relatedQuotes.filter((q: any) => q.status === 'accepted');
      
      // Quoted cost for this change order line item
      const quotedCost = acceptedQuotes.reduce((sum: number, q: any) => {
        const itemsForLine = (q.quote_line_items || []).filter((qli: any) => 
          qli.change_order_line_item_id === lineItem.id
        );
        const cost = itemsForLine.reduce((s: number, li: any) => {
          // Calculate from cost_per_unit * quantity (primary method)
          // Fallback to total_cost if cost_per_unit calculation yields 0
          const calculatedCost = Number(li.cost_per_unit ?? 0) * Number(li.quantity ?? 0);
          const lineCost = calculatedCost > 0 ? calculatedCost : Number(li.total_cost || 0);
          return s + lineCost;
        }, 0);
        return sum + cost;
      }, 0);
      
      categoryData.quotedCost += quotedCost;
      
      // Actual cost from correlations
      const correlatedExpenses = correlationsByLineItem.get(lineItem.id) || [];
      const actualCost = correlatedExpenses.reduce(
        (sum: number, exp: any) => sum + Number(exp.amount || 0), 
        0
      );
      
      categoryData.actualCost += actualCost;
      
      // Calculate variance (actual vs quoted, or actual vs estimated if no quote)
      const baselineCost = quotedCost > 0 ? quotedCost : estimatedCost;
      const variance = actualCost - baselineCost;
      const variancePercent = baselineCost > 0 ? (variance / baselineCost) * 100 : 0;
      
      // Get quote payee info
      const quotePayee = acceptedQuotes.length > 0 
        ? acceptedQuotes[0].payees?.payee_name || null
        : null;
      
      // Add line item detail with change order reference
      categoryData.lineItems.push({
        id: lineItem.id,
        category,
        description: `${lineItem.description} (CO: ${co.change_order_number})`,
        estimatedCost,
        quotedCost,
        actualCost,
        variance,
        variancePercent,
        hasAcceptedQuote: acceptedQuotes.length > 0,
        quotePayee
      });
    }
  }
  
  // Calculate category-level variances
  const categories = Array.from(categoryMap.values()).map(cat => {
    const baselineCost = cat.quotedCost > 0 ? cat.quotedCost : cat.estimatedCost;
    const variance = cat.actualCost - baselineCost;
    const variancePercent = baselineCost > 0 ? (variance / baselineCost) * 100 : 0;
    
    return {
      ...cat,
      variance,
      variancePercent,
      isExpanded: false
    };
  });
  
  return categories;
}

// Internal categories that don't need expense allocation
const INTERNAL_CATEGORIES = ['labor_internal', 'management'];

function buildAllocationSummary(
  estimateLineItems: any[],
  changeOrders: any[],
  quotes: any[],
  correlations: any[]
): AllocationSummary {
  // Build quote-to-estimate and quote-to-change-order mappings
  const quoteToEstimate = new Map<string, Array<{ estimate_line_item_id: string, total_cost: number }>>();
  const quoteToChangeOrder = new Map<string, Array<{ change_order_line_item_id: string, total_cost: number }>>();
  
  for (const quote of quotes) {
    const quoteLineItems = quote.quote_line_items || [];
    for (const qli of quoteLineItems) {
      if (qli.estimate_line_item_id) {
        if (!quoteToEstimate.has(quote.id)) {
          quoteToEstimate.set(quote.id, []);
        }
        quoteToEstimate.get(quote.id)!.push({
          estimate_line_item_id: qli.estimate_line_item_id,
          total_cost: qli.total_cost || 0
        });
      }
      if (qli.change_order_line_item_id) {
        if (!quoteToChangeOrder.has(quote.id)) {
          quoteToChangeOrder.set(quote.id, []);
        }
        quoteToChangeOrder.get(quote.id)!.push({
          change_order_line_item_id: qli.change_order_line_item_id,
          total_cost: qli.total_cost || 0
        });
      }
    }
  }
  
  // Build correlation map by line item (estimate and change order)
  const correlationsByLineItem = new Map<string, any[]>();
  const seenExpenses = new Map<string, Set<string>>();
  
  for (const corr of correlations) {
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
        targetLineItemIds.push(candidates[0].estimate_line_item_id);
      } else if (candidates.length > 1) {
        targetLineItemIds.push(candidates[0].estimate_line_item_id);
      }
    }
    
    // Quote allocation - map to change order line items
    if (corr.quote_id && quoteToChangeOrder.has(corr.quote_id)) {
      const candidates = quoteToChangeOrder.get(corr.quote_id)!;
      if (candidates.length === 1) {
        targetLineItemIds.push(candidates[0].change_order_line_item_id);
      } else if (candidates.length > 1) {
        targetLineItemIds.push(candidates[0].change_order_line_item_id);
      }
    }
    
    // Determine which expense data to use (split or parent)
    let expenseDataToUse: any;
    let trackingId: string;
    
    if (corr.expense_split_id && corr.expense_splits) {
      const parentExpense = corr.expense_splits?.expenses;
      expenseDataToUse = {
        id: corr.expense_splits.id,
        amount: corr.expense_splits.split_amount,
        description: parentExpense?.description || 'Split',
        expense_date: parentExpense?.expense_date,
        category: parentExpense?.category,
        payees: parentExpense?.payees,
        is_split: true
      };
      trackingId = corr.expense_split_id;
    } else if (corr.expenses) {
      expenseDataToUse = corr.expenses;
      trackingId = corr.expense_id;
    }
    
    // Add to map with deduplication
    for (const lineItemId of targetLineItemIds) {
      if (!seenExpenses.has(lineItemId)) {
        seenExpenses.set(lineItemId, new Set());
      }
      
      if (expenseDataToUse && !seenExpenses.get(lineItemId)!.has(trackingId)) {
        const existing = correlationsByLineItem.get(lineItemId) || [];
        correlationsByLineItem.set(lineItemId, [...existing, expenseDataToUse]);
        seenExpenses.get(lineItemId)!.add(trackingId);
      }
    }
  }
  
  const lineItemDetails: LineItemAllocationDetail[] = [];
  
  // Process estimate line items (external only)
  for (const item of estimateLineItems) {
    if (INTERNAL_CATEGORIES.includes(item.category)) continue;
    
    // Find accepted quote for this line item
    const linkedQuote = quotes.find((q: any) => 
      (q.quote_line_items || []).some((qli: any) => qli.estimate_line_item_id === item.id)
    );
    const quoteLineItem = linkedQuote?.quote_line_items?.find(
      (qli: any) => qli.estimate_line_item_id === item.id
    );
    
    // Find correlated expenses using the mapped correlations
    const correlatedExpenses = correlationsByLineItem.get(item.id) || [];
    
    const allocatedAmount = correlatedExpenses.reduce((sum: number, exp: any) => {
      return sum + (exp.amount || 0);
    }, 0);
    
    const estimatedCost = (item.quantity || 0) * (item.cost_per_unit || 0);
    const quotedCost = quoteLineItem?.total_cost || 0;
    const baseline = quotedCost > 0 ? quotedCost : estimatedCost;
    
    // Determine allocation status
    let allocationStatus: 'full' | 'partial' | 'none' = 'none';
    if (allocatedAmount >= baseline * 0.95) {
      allocationStatus = 'full';
    } else if (allocatedAmount > 0) {
      allocationStatus = 'partial';
    }
    
    lineItemDetails.push({
      id: item.id,
      source: 'estimate',
      category: item.category,
      categoryLabel: CATEGORY_DISPLAY_MAP[item.category as LineItemCategory] || item.category,
      description: item.description,
      estimatedCost,
      quotedCost,
      quotedBy: linkedQuote?.payees?.payee_name || null,
      allocatedAmount,
      hasAllocation: correlatedExpenses.length > 0,
      allocationStatus,
      expenses: correlatedExpenses.map((exp: any) => ({
        id: exp.id,
        date: exp.expense_date || '',
        payee: exp.payees?.payee_name || 'Unknown',
        description: exp.description || '',
        amount: exp.amount || 0,
        isSplit: !!exp.is_split,
      })),
    });
  }
  
  // Process change order line items (external only)
  for (const co of changeOrders) {
    for (const item of co.change_order_line_items || []) {
      if (INTERNAL_CATEGORIES.includes(item.category)) continue;
      
      // Find accepted quote for this change order line item
      const linkedQuote = quotes.find((q: any) => 
        (q.quote_line_items || []).some((qli: any) => qli.change_order_line_item_id === item.id)
      );
      const quoteLineItem = linkedQuote?.quote_line_items?.find(
        (qli: any) => qli.change_order_line_item_id === item.id
      );
      
      // Find correlated expenses using the mapped correlations
      const correlatedExpenses = correlationsByLineItem.get(item.id) || [];
      
      const allocatedAmount = correlatedExpenses.reduce((sum: number, exp: any) => {
        return sum + (exp.amount || 0);
      }, 0);
      
      const estimatedCost = item.total_cost || 0;
      const quotedCost = quoteLineItem?.total_cost || 0;
      const baseline = quotedCost > 0 ? quotedCost : estimatedCost;
      
      // Determine allocation status
      let allocationStatus: 'full' | 'partial' | 'none' = 'none';
      if (allocatedAmount >= baseline * 0.95) {
        allocationStatus = 'full';
      } else if (allocatedAmount > 0) {
        allocationStatus = 'partial';
      }
      
      lineItemDetails.push({
        id: item.id,
        source: 'change_order',
        changeOrderNumber: co.change_order_number,
        category: item.category,
        categoryLabel: CATEGORY_DISPLAY_MAP[item.category as LineItemCategory] || item.category,
        description: item.description,
        estimatedCost,
        quotedCost,
        quotedBy: linkedQuote?.payees?.payee_name || null,
        allocatedAmount,
        hasAllocation: correlatedExpenses.length > 0,
        allocationStatus,
        expenses: correlatedExpenses.map((exp: any) => ({
          id: exp.id,
          date: exp.expense_date || '',
          payee: exp.payees?.payee_name || 'Unknown',
          description: exp.description || '',
          amount: exp.amount || 0,
          isSplit: !!exp.is_split,
        })),
      });
    }
  }
  
  // Calculate summary
  const totalExternal = lineItemDetails.length;
  const allocatedCount = lineItemDetails.filter(li => li.hasAllocation).length;
  const pendingCount = totalExternal - allocatedCount;
  
  return {
    totalExternalLineItems: totalExternal,
    allocatedCount,
    pendingCount,
    allocationPercent: totalExternal > 0 ? (allocatedCount / totalExternal) * 100 : 100,
    lineItems: lineItemDetails,
  };
}

