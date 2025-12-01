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
import { ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ProfitAnalysisProject } from '@/types/profitAnalysis';

interface Props {
  data: ProfitAnalysisProject[] | undefined;
  isLoading: boolean;
  onSelectProject: (projectId: string) => void;
}

export function MarginAnalysisTable({ data, isLoading, onSelectProject }: Props) {
  const [sortColumn, setSortColumn] = useState<string>('contracted_amount');
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
      let aValue: any = a[sortColumn as keyof ProfitAnalysisProject];
      let bValue: any = b[sortColumn as keyof ProfitAnalysisProject];

      // Handle calculated field
      if (sortColumn === 'margin_change') {
        aValue = a.actual_margin - a.original_margin;
        bValue = b.actual_margin - b.original_margin;
      }

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
        contracted_amount: 0,
        total_invoiced: 0,
        original_margin: 0,
        projected_margin: 0,
        actual_margin: 0,
        margin_change: 0,
      };
    }

    return data.reduce((acc, project) => ({
      contracted_amount: acc.contracted_amount + project.contracted_amount,
      total_invoiced: acc.total_invoiced + project.total_invoiced,
      original_margin: acc.original_margin + project.original_margin,
      projected_margin: acc.projected_margin + project.projected_margin,
      actual_margin: acc.actual_margin + project.actual_margin,
      margin_change: acc.margin_change + (project.actual_margin - project.original_margin),
    }), {
      contracted_amount: 0,
      total_invoiced: 0,
      original_margin: 0,
      projected_margin: 0,
      actual_margin: 0,
      margin_change: 0,
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
                onClick={() => handleSort('contracted_amount')}
              >
                <div className="flex items-center justify-end">
                  Contract
                  {renderSortIcon('contracted_amount')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('original_margin')}
              >
                <div className="flex items-center justify-end">
                  Original Margin
                  {renderSortIcon('original_margin')}
                </div>
              </TableHead>
              <TableHead className="text-right text-xs text-muted-foreground">
                %
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('projected_margin')}
              >
                <div className="flex items-center justify-end">
                  Projected Margin
                  {renderSortIcon('projected_margin')}
                </div>
              </TableHead>
              <TableHead className="text-right text-xs text-muted-foreground">
                %
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('actual_margin')}
              >
                <div className="flex items-center justify-end">
                  Actual Margin
                  {renderSortIcon('actual_margin')}
                </div>
              </TableHead>
              <TableHead className="text-right text-xs text-muted-foreground">
                %
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('margin_change')}
              >
                <div className="flex items-center justify-end">
                  Margin Change
                  {renderSortIcon('margin_change')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((project) => {
              const marginChange = project.actual_margin - project.original_margin;

              return (
                <TableRow 
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectProject(project.id)}
                >
                  <TableCell>
                    <div className="text-xs leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{project.project_number}</span>
                        {project.total_invoiced === 0 && project.contracted_amount > 0 && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal">
                            <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                            No Invoice
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-[10px]">{project.project_name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(project.contracted_amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(project.original_margin)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {project.contracted_amount > 0 
                      ? ((project.original_margin / project.contracted_amount) * 100).toFixed(1)
                      : '0.0'}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(project.projected_margin)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {project.contracted_amount > 0 
                      ? ((project.projected_margin / project.contracted_amount) * 100).toFixed(1)
                      : '0.0'}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(project.actual_margin)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {project.total_invoiced > 0 
                      ? ((project.actual_margin / project.total_invoiced) * 100).toFixed(1)
                      : project.contracted_amount > 0
                      ? ((project.actual_margin / project.contracted_amount) * 100).toFixed(1)
                      : '0.0'}%
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-mono text-xs",
                    marginChange >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(marginChange)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Total</TableCell>
              <TableCell className="text-right font-mono text-xs font-medium">
                {formatCurrency(totals.contracted_amount)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-medium">
                {formatCurrency(totals.original_margin)}
              </TableCell>
              <TableCell className="text-right text-xs font-medium text-muted-foreground">
                {totals.contracted_amount > 0 
                  ? ((totals.original_margin / totals.contracted_amount) * 100).toFixed(1)
                  : '0.0'}%
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-medium">
                {formatCurrency(totals.projected_margin)}
              </TableCell>
              <TableCell className="text-right text-xs font-medium text-muted-foreground">
                {totals.contracted_amount > 0 
                  ? ((totals.projected_margin / totals.contracted_amount) * 100).toFixed(1)
                  : '0.0'}%
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-medium">
                {formatCurrency(totals.actual_margin)}
              </TableCell>
              <TableCell className="text-right text-xs font-medium text-muted-foreground">
                {totals.total_invoiced > 0 
                  ? ((totals.actual_margin / totals.total_invoiced) * 100).toFixed(1)
                  : totals.contracted_amount > 0
                  ? ((totals.actual_margin / totals.contracted_amount) * 100).toFixed(1)
                  : '0.0'}%
              </TableCell>
              <TableCell className={cn(
                "text-right font-mono text-xs font-medium",
                totals.margin_change >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(totals.margin_change)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </Card>
  );
}
