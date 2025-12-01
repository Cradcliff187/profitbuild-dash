import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProfitAnalysisProject, ProfitSummaryTotals } from '@/types/profitAnalysis';

export function useProfitAnalysisData(
  statusFilter: string[] = ['approved', 'in_progress', 'complete']
) {
  return useQuery({
    queryKey: ['profit-analysis', statusFilter],
    queryFn: async () => {
      // Use RPC function to get data from reporting.project_financials view
      const { data, error } = await supabase.rpc('get_profit_analysis_data', {
        status_filter: statusFilter
      });

      if (error) throw error;
      
      return data as ProfitAnalysisProject[];
    }
  });
}

/**
 * Calculate summary totals from project data
 * Note: Only aggregates database-provided values, no new calculations
 */
export function calculateSummaryTotals(projects: ProfitAnalysisProject[]): ProfitSummaryTotals {
  const totals = projects.reduce((acc, project) => {
    const remainingToBill = project.contracted_amount - project.total_invoiced;
    
    return {
      totalContractValue: acc.totalContractValue + project.contracted_amount,
      totalInvoiced: acc.totalInvoiced + project.total_invoiced,
      totalProjectedMargin: acc.totalProjectedMargin + project.projected_margin,
      totalActualMargin: acc.totalActualMargin + project.actual_margin,
      totalOriginalEstCosts: acc.totalOriginalEstCosts + project.original_est_costs,
      totalAdjustedEstCosts: acc.totalAdjustedEstCosts + project.adjusted_est_costs,
      totalActualExpenses: acc.totalActualExpenses + project.total_expenses,
      // Only count positive remaining amounts (projects that still need invoices)
      totalRemainingToBill: acc.totalRemainingToBill + (remainingToBill > 0 ? remainingToBill : 0),
    };
  }, {
    totalContractValue: 0,
    totalInvoiced: 0,
    totalProjectedMargin: 0,
    totalActualMargin: 0,
    totalOriginalEstCosts: 0,
    totalAdjustedEstCosts: 0,
    totalActualExpenses: 0,
    totalRemainingToBill: 0,
  });

  return {
    ...totals,
    // Weighted average from database values
    aggregateMarginPercent: totals.totalContractValue > 0 
      ? (totals.totalProjectedMargin / totals.totalContractValue) * 100 
      : 0,
    projectCount: projects.length,
  };
}

