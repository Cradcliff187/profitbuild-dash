import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { ProfitAnalysisProject } from '@/types/profitAnalysis';

interface Props {
  data: ProfitAnalysisProject[] | undefined;
  isLoading: boolean;
  onSelectProject: (projectId: string) => void;
}

export function CostAnalysisTable({ data, isLoading, onSelectProject }: Props) {
  const [sortColumn, setSortColumn] = useState<string>('total_expenses');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedData = useMemo(() => {
    if (!data) return [];
    
    return [...data].sort((a, b) => {
      const aValue = a[sortColumn as keyof ProfitAnalysisProject] as number;
      const bValue = b[sortColumn as keyof ProfitAnalysisProject] as number;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [data, sortColumn, sortDirection]);

  const totals = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        original_est_costs: 0,
        adjusted_est_costs: 0,
        total_expenses: 0,
        cost_variance: 0,
      };
    }

    return data.reduce((acc, project) => ({
      original_est_costs: acc.original_est_costs + project.original_est_costs,
      adjusted_est_costs: acc.adjusted_est_costs + project.adjusted_est_costs,
      total_expenses: acc.total_expenses + project.total_expenses,
      cost_variance: acc.cost_variance + project.cost_variance,
    }), {
      original_est_costs: 0,
      adjusted_est_costs: 0,
      total_expenses: 0,
      cost_variance: 0,
    });
  }, [data]);

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />;
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

  return (
    <Card className="p-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('project_number')}
              >
                <div className="flex items-center">
                  Project
                  {renderSortIcon('project_number')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('original_est_costs')}
              >
                <div className="flex items-center justify-end">
                  Original Est.
                  {renderSortIcon('original_est_costs')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('adjusted_est_costs')}
              >
                <div className="flex items-center justify-end">
                  Adjusted Est.
                  {renderSortIcon('adjusted_est_costs')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('total_expenses')}
              >
                <div className="flex items-center justify-end">
                  Actual Expenses
                  {renderSortIcon('total_expenses')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('cost_variance')}
              >
                <div className="flex items-center justify-end">
                  Variance
                  {renderSortIcon('cost_variance')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('cost_variance_percent')}
              >
                <div className="flex items-center justify-end">
                  Variance %
                  {renderSortIcon('cost_variance_percent')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('budget_utilization_percent')}
              >
                <div className="flex items-center justify-end">
                  Budget Used
                  {renderSortIcon('budget_utilization_percent')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((project) => (
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
                  {formatCurrency(project.original_est_costs)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {formatCurrency(project.adjusted_est_costs)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {formatCurrency(project.total_expenses)}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-mono text-xs",
                  project.cost_variance > 0 ? "text-red-600" : "text-green-600"
                )}>
                  {formatCurrency(project.cost_variance)}
                </TableCell>
                <TableCell className={cn(
                  "text-right text-xs",
                  project.cost_variance > 0 ? "text-red-600" : "text-green-600"
                )}>
                  {project.cost_variance_percent.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right text-xs">
                  {project.budget_utilization_percent.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Total</TableCell>
              <TableCell className="text-right font-mono text-xs font-medium">
                {formatCurrency(totals.original_est_costs)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-medium">
                {formatCurrency(totals.adjusted_est_costs)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-medium">
                {formatCurrency(totals.total_expenses)}
              </TableCell>
              <TableCell className={cn(
                "text-right font-mono text-xs font-medium",
                totals.cost_variance > 0 ? "text-red-600" : "text-green-600"
              )}>
                {formatCurrency(totals.cost_variance)}
              </TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </Card>
  );
}
