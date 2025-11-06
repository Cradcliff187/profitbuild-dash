import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineItemCategory, CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { getExpenseSplits } from "@/utils/expenseSplits";

export interface LineItemDetail {
  description: string;
  estimated: number;
  quoted: number;
  actual: number;
  variance: number;
  variancePercentage: number;
}

export interface CategoryVariance {
  category: LineItemCategory;
  estimated: number;
  quoted: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  lineItems: LineItemDetail[];
}

interface UseVarianceCalculationReturn {
  variances: CategoryVariance[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  totals: {
    estimated: number;
    quoted: number;
    actual: number;
    variance: number;
  };
}

export const useVarianceCalculation = (projectId: string): UseVarianceCalculationReturn => {
  const [variances, setVariances] = useState<CategoryVariance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVarianceData = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel for better performance
      const [estimateResult, quoteResult, expenseResult, changeOrderResult] = await Promise.all([
        // Fetch current estimate line items with descriptions
        supabase
          .from('estimate_line_items')
          .select(`
            category,
            description,
            total,
            estimates!inner(
              project_id,
              is_current_version
            )
          `)
          .eq('estimates.project_id', projectId)
          .eq('estimates.is_current_version', true),

        // Fetch accepted quote line items with descriptions
        supabase
          .from('quote_line_items')
          .select(`
            category,
            description,
            total,
            quotes!inner(
              project_id,
              status
            )
          `)
          .eq('quotes.project_id', projectId)
          .eq('quotes.status', 'accepted'),

        // Fetch actual expenses with descriptions (include id and is_split for split handling)
        supabase
          .from('expenses')
          .select('id, category, description, amount, is_split, project_id')
          .eq('project_id', projectId),

        // Fetch approved change orders with line items
        supabase
          .from('change_orders')
          .select(`
            id,
            change_order_number,
            description,
            status,
            change_order_line_items (
              id,
              category,
              description,
              quantity,
              cost_per_unit,
              price_per_unit,
              total_cost,
              total_price
            )
          `)
          .eq('project_id', projectId)
          .eq('status', 'approved')
      ]);

      const { data: estimateData, error: estimateError } = estimateResult;
      const { data: quoteData, error: quoteError } = quoteResult;
      const { data: expenseData, error: expenseError } = expenseResult;
      const { data: changeOrderData, error: changeOrderError } = changeOrderResult;

      if (estimateError) throw estimateError;
      if (quoteError) throw quoteError;
      if (expenseError) throw expenseError;
      if (changeOrderError) console.warn('[VarianceCalculation] Error fetching change orders:', changeOrderError);

      // Process data to create category groups with line item details
      const categoryMap = new Map<LineItemCategory, {
        estimated: number;
        quoted: number;
        actual: number;
        lineItemsMap: Map<string, {
          estimated: number;
          quoted: number;
          actual: number;
        }>;
      }>();

      // Initialize categories
      const allCategories = new Set<LineItemCategory>();
      
      // Process estimates
      (estimateData || []).forEach(item => {
        const category = item.category as LineItemCategory;
        const description = item.description || 'Unnamed Item';
        const amount = Number(item.total) || 0;
        
        allCategories.add(category);
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            estimated: 0,
            quoted: 0,
            actual: 0,
            lineItemsMap: new Map()
          });
        }
        
        const categoryData = categoryMap.get(category)!;
        categoryData.estimated += amount;
        
        if (!categoryData.lineItemsMap.has(description)) {
          categoryData.lineItemsMap.set(description, { estimated: 0, quoted: 0, actual: 0 });
        }
        categoryData.lineItemsMap.get(description)!.estimated += amount;
      });

      // Process approved change orders as additional "estimated" amounts
      (changeOrderData || []).forEach(co => {
        (co.change_order_line_items || []).forEach((item: any) => {
          const category = item.category as LineItemCategory;
          const description = item.description || 'Unnamed Item';
          const amount = Number(item.total_price) || 0;
          
          allCategories.add(category);
          
          if (!categoryMap.has(category)) {
            categoryMap.set(category, {
              estimated: 0,
              quoted: 0,
              actual: 0,
              lineItemsMap: new Map()
            });
          }
          
          const categoryData = categoryMap.get(category)!;
          categoryData.estimated += amount;
          
          if (!categoryData.lineItemsMap.has(description)) {
            categoryData.lineItemsMap.set(description, { estimated: 0, quoted: 0, actual: 0 });
          }
          categoryData.lineItemsMap.get(description)!.estimated += amount;
        });
      });

      // Process quotes
      (quoteData || []).forEach(item => {
        const category = item.category as LineItemCategory;
        const description = item.description || 'Unnamed Item';
        const amount = Number(item.total) || 0;
        
        allCategories.add(category);
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            estimated: 0,
            quoted: 0,
            actual: 0,
            lineItemsMap: new Map()
          });
        }
        
        const categoryData = categoryMap.get(category)!;
        categoryData.quoted += amount;
        
        if (!categoryData.lineItemsMap.has(description)) {
          categoryData.lineItemsMap.set(description, { estimated: 0, quoted: 0, actual: 0 });
        }
        categoryData.lineItemsMap.get(description)!.quoted += amount;
      });

      // Process expenses (with split-aware calculation)
      for (const item of expenseData || []) {
        const category = item.category as LineItemCategory;
        const description = item.description || 'Unnamed Item';
        
        // Calculate split-aware amount
        let amount = 0;
        if (item.is_split && item.id) {
          // Get splits for this expense and sum only those for this project
          const splits = await getExpenseSplits(item.id);
          const projectSplits = splits.filter(s => s.project_id === projectId);
          amount = projectSplits.reduce((sum, split) => sum + split.split_amount, 0);
        } else {
          // Not split, use full amount
          amount = Number(item.amount) || 0;
        }
        
        allCategories.add(category);
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            estimated: 0,
            quoted: 0,
            actual: 0,
            lineItemsMap: new Map()
          });
        }
        
        const categoryData = categoryMap.get(category)!;
        categoryData.actual += amount;
        
        if (!categoryData.lineItemsMap.has(description)) {
          categoryData.lineItemsMap.set(description, { estimated: 0, quoted: 0, actual: 0 });
        }
        categoryData.lineItemsMap.get(description)!.actual += amount;
      }

      // Convert to CategoryVariance array
      const categoryVariances: CategoryVariance[] = Array.from(allCategories).map(category => {
        const categoryData = categoryMap.get(category) || {
          estimated: 0,
          quoted: 0,
          actual: 0,
          lineItemsMap: new Map()
        };

        const estimated = categoryData.estimated;
        const quoted = categoryData.quoted;
        const actual = categoryData.actual;
        const variance = actual - estimated;
        const variancePercentage = estimated > 0 ? (variance / estimated) * 100 : 0;

        // Create line items array
        const lineItems: LineItemDetail[] = Array.from(categoryData.lineItemsMap.entries()).map(([description, amounts]) => {
          const lineVariance = amounts.actual - amounts.estimated;
          const lineVariancePercentage = amounts.estimated > 0 ? (lineVariance / amounts.estimated) * 100 : 0;
          
          return {
            description,
            estimated: amounts.estimated,
            quoted: amounts.quoted,
            actual: amounts.actual,
            variance: lineVariance,
            variancePercentage: lineVariancePercentage
          };
        }).filter(item => item.estimated > 0 || item.quoted > 0 || item.actual > 0);

        return {
          category,
          estimated,
          quoted,
          actual,
          variance,
          variancePercentage,
          lineItems
        };
      }).filter(item => item.estimated > 0 || item.quoted > 0 || item.actual > 0);

      // Sort by category display name
      categoryVariances.sort((a, b) => 
        CATEGORY_DISPLAY_MAP[a.category].localeCompare(CATEGORY_DISPLAY_MAP[b.category])
      );

      setVariances(categoryVariances);
    } catch (err) {
      console.error('Error fetching variance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load variance data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchVarianceData();
  }, [fetchVarianceData]);

  const totals = {
    estimated: variances.reduce((sum, v) => sum + v.estimated, 0),
    quoted: variances.reduce((sum, v) => sum + v.quoted, 0),
    actual: variances.reduce((sum, v) => sum + v.actual, 0),
    variance: variances.reduce((sum, v) => sum + v.variance, 0),
  };

  return {
    variances,
    loading,
    error,
    refetch: fetchVarianceData,
    totals
  };
};