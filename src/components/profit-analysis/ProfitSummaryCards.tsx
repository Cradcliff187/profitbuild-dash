import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { calculateSummaryTotals } from './hooks/useProfitAnalysisData';
import type { ProfitAnalysisProject } from '@/types/profitAnalysis';

interface Props {
  data: ProfitAnalysisProject[] | undefined;
  isLoading: boolean;
}

export function ProfitSummaryCards({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totals = calculateSummaryTotals(data || []);
  
  const billingPercent = totals.totalContractValue > 0 
    ? ((totals.totalInvoiced / totals.totalContractValue) * 100).toFixed(1)
    : '0';
    
  const budgetUtilization = totals.totalAdjustedEstCosts > 0
    ? ((totals.totalActualExpenses / totals.totalAdjustedEstCosts) * 100).toFixed(1)
    : '0';

  const cards = [
    { 
      title: 'Total Contract Value', 
      value: formatCurrency(totals.totalContractValue),
      subtext: `${totals.projectCount} projects`
    },
    { 
      title: 'Total Invoiced', 
      value: formatCurrency(totals.totalInvoiced),
      subtext: `${billingPercent}% billed`
    },
    { 
      title: 'Remaining to Bill', 
      value: formatCurrency(totals.totalRemainingToBill),
      subtext: 'across all projects'
    },
    { 
      title: 'Projected Margin', 
      value: formatCurrency(totals.totalProjectedMargin),
      subtext: `${totals.aggregateMarginPercent.toFixed(1)}%`
    },
    { 
      title: 'Actual Margin', 
      value: formatCurrency(totals.totalActualMargin),
      subtext: 'invoiced - expenses'
    },
    { 
      title: 'Total Expenses', 
      value: formatCurrency(totals.totalActualExpenses),
      subtext: `${budgetUtilization}% of budget`
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-mono">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

