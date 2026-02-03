import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { ProjectStatusBadge } from '@/components/ui/status-badge';
import { formatCurrency } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { getBudgetUtilizationColor, getCostVarianceColor, getContingencyColor } from '@/utils/financialColors';
import type { ProfitAnalysisProject } from '@/types/profitAnalysis';

interface Props {
  data: ProfitAnalysisProject[] | undefined;
  isLoading: boolean;
  onSelectProject: (projectId: string) => void;
}

export function BudgetHealthTable({ data, isLoading, onSelectProject }: Props) {
  const isMobile = useIsMobile();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const sortedData = useMemo(() => {
    if (!data) return [];
    // Sort by budget utilization descending — most consumed first (needs attention)
    return [...data].sort((a, b) =>
      (b.budget_utilization_percent ?? 0) - (a.budget_utilization_percent ?? 0)
    );
  }, [data]);

  const toggleCard = (projectId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-muted-foreground text-center py-8">No projects found</p>
      </Card>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-2">
        {sortedData.map((project) => {
          const budget = project.adjusted_est_costs ?? 0;
          const spent = project.total_expenses ?? 0;
          const remaining = budget - spent;
          const utilPct = project.budget_utilization_percent ?? 0;
          const variancePct = project.cost_variance_percent ?? 0;
          const contingencyAmt = project.contingency_amount ?? 0;
          const contingencyRemPct = contingencyAmt > 0
            ? ((project.contingency_remaining ?? 0) / contingencyAmt) * 100
            : null;

          return (
            <Card 
              key={project.id} 
              className="hover:bg-muted/50 transition-colors"
              onClick={() => onSelectProject(project.id)}
            >
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <CardTitle className="text-sm font-semibold truncate">{project.project_number}</CardTitle>
                      <ProjectStatusBadge 
                        status={project.status} 
                        size="xs" 
                        className="whitespace-nowrap leading-tight font-normal rounded-md"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{project.project_name}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {/* Always visible key metrics */}
                <div className="flex items-center justify-between px-3 py-2 border-t">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Budget</div>
                    <div className="text-sm font-semibold font-mono">{formatCurrency(budget)}</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-xs text-muted-foreground">Spent</div>
                    <div className="text-sm font-semibold font-mono">{formatCurrency(spent)}</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-xs text-muted-foreground">Util.</div>
                    <div className={`text-sm font-semibold font-mono ${getBudgetUtilizationColor(utilPct)}`}>
                      {utilPct.toFixed(0)}%
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCard(project.id);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${
                      expandedCards.has(project.id) ? 'rotate-180' : ''
                    }`} />
                  </Button>
                </div>
                
                {/* Collapsible content */}
                <Collapsible open={expandedCards.has(project.id)}>
                  <CollapsibleContent>
                    <div className="space-y-2 pt-2">
                      <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2 rounded mx-3">
                        <div>
                          <div className="text-muted-foreground">Remaining</div>
                          <div className={`font-semibold font-mono ${remaining < 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(remaining)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Variance</div>
                          <div className={`font-semibold font-mono ${getCostVarianceColor(variancePct)}`}>
                            {variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%
                          </div>
                        </div>
                        {contingencyAmt > 0 && (
                          <div className="col-span-2">
                            <div className="text-muted-foreground">Contingency</div>
                            <div className={`font-semibold font-mono ${getContingencyColor(contingencyRemPct)}`}>
                              {formatCurrency(project.contingency_remaining ?? 0)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Desktop table view
  return (
    <Card className="p-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Project</TableHead>
              <TableHead className="text-xs text-right">Budget</TableHead>
              <TableHead className="text-xs text-right">Spent</TableHead>
              <TableHead className="text-xs text-right">Remaining</TableHead>
              <TableHead className="text-xs w-[140px]">Utilization</TableHead>
              <TableHead className="text-xs text-right">Variance</TableHead>
              <TableHead className="text-xs text-right">Contingency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((project) => {
              const budget = project.adjusted_est_costs ?? 0;
              const spent = project.total_expenses ?? 0;
              const remaining = budget - spent;
              const utilPct = project.budget_utilization_percent ?? 0;
              const variancePct = project.cost_variance_percent ?? 0;
              const contingencyAmt = project.contingency_amount ?? 0;
              const contingencyRemPct = contingencyAmt > 0
                ? ((project.contingency_remaining ?? 0) / contingencyAmt) * 100
                : null;

              return (
                <TableRow
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectProject(project.id)}
                >
                  <TableCell>
                    <div className="text-xs leading-tight">
                      <div className="font-medium">{project.project_number}</div>
                      <div className="text-muted-foreground text-[10px]">{project.project_name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(budget)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(spent)}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-xs ${remaining < 0 ? 'text-red-600' : ''}`}>
                    {formatCurrency(remaining)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(utilPct, 100)} className="h-2 flex-1" />
                      <span className={`text-xs font-mono whitespace-nowrap ${getBudgetUtilizationColor(utilPct)}`}>
                        {utilPct.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-mono text-xs ${getCostVarianceColor(variancePct)}`}>
                    {variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {contingencyAmt > 0 ? (
                      <span className={`font-mono text-xs ${getContingencyColor(contingencyRemPct)}`}>
                        {formatCurrency(project.contingency_remaining ?? 0)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
