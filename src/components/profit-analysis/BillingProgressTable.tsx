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
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { ProfitAnalysisProject } from '@/types/profitAnalysis';

interface Props {
  data: ProfitAnalysisProject[] | undefined;
  isLoading: boolean;
  onSelectProject: (projectId: string) => void;
}

export function BillingProgressTable({ data, isLoading, onSelectProject }: Props) {
  const [sortColumn, setSortColumn] = useState<string>('contracted_amount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'estimating': 'text-[10px] h-4 px-1.5 bg-gray-50 text-gray-700 border-gray-300',
      'quoted': 'text-[10px] h-4 px-1.5 bg-blue-50 text-blue-700 border-blue-300',
      'approved': 'text-[10px] h-4 px-1.5 bg-green-50 text-green-700 border-green-300',
      'in_progress': 'text-[10px] h-4 px-1.5 bg-purple-50 text-purple-700 border-purple-300',
      'complete': 'text-[10px] h-4 px-1.5 bg-green-50 text-green-700 border-green-300',
      'on_hold': 'text-[10px] h-4 px-1.5 bg-yellow-50 text-yellow-700 border-yellow-300',
      'cancelled': 'text-[10px] h-4 px-1.5 bg-red-50 text-red-700 border-red-300',
    };

    return (
      <Badge 
        variant="outline" 
        className={cn(
          statusColors[status] || 'text-[10px] h-4 px-1.5 bg-gray-50 text-gray-700 border-gray-300',
          'whitespace-nowrap leading-tight font-normal rounded-md'
        )}
      >
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

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

      // Handle calculated fields
      if (sortColumn === 'remaining') {
        aValue = a.contracted_amount - a.total_invoiced;
        bValue = b.contracted_amount - b.total_invoiced;
      } else if (sortColumn === 'billed_percent') {
        aValue = a.contracted_amount > 0 ? (a.total_invoiced / a.contracted_amount) * 100 : 0;
        bValue = b.contracted_amount > 0 ? (b.total_invoiced / b.contracted_amount) * 100 : 0;
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
        remaining: 0,
        invoice_count: 0,
      };
    }

    return data.reduce((acc, project) => ({
      contracted_amount: acc.contracted_amount + project.contracted_amount,
      total_invoiced: acc.total_invoiced + project.total_invoiced,
      remaining: acc.remaining + (project.contracted_amount - project.total_invoiced),
      invoice_count: acc.invoice_count + project.invoice_count,
    }), {
      contracted_amount: 0,
      total_invoiced: 0,
      remaining: 0,
      invoice_count: 0,
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
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('client_name')}
              >
                <div className="flex items-center">
                  Client
                  {renderSortIcon('client_name')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  {renderSortIcon('status')}
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
                onClick={() => handleSort('total_invoiced')}
              >
                <div className="flex items-center justify-end">
                  Invoiced
                  {renderSortIcon('total_invoiced')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('remaining')}
              >
                <div className="flex items-center justify-end">
                  Remaining
                  {renderSortIcon('remaining')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('billed_percent')}
              >
                <div className="flex items-center justify-end">
                  Billed %
                  {renderSortIcon('billed_percent')}
                </div>
              </TableHead>
              <TableHead className="text-right">Invoices</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((project) => {
              const remaining = project.contracted_amount - project.total_invoiced;
              const billedPercent = project.contracted_amount > 0 
                ? (project.total_invoiced / project.contracted_amount) * 100 
                : 0;

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
                  <TableCell className="text-xs">
                    {project.client_name || '—'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(project.status)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(project.contracted_amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(project.total_invoiced)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(remaining)}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {billedPercent.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {project.invoice_count}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-medium">Total</TableCell>
              <TableCell className="text-right font-mono text-xs font-medium">
                {formatCurrency(totals.contracted_amount)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-medium">
                {formatCurrency(totals.total_invoiced)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-medium">
                {formatCurrency(totals.remaining)}
              </TableCell>
              <TableCell className="text-right text-xs font-medium">
                {totals.contracted_amount > 0 
                  ? ((totals.total_invoiced / totals.contracted_amount) * 100).toFixed(1)
                  : '0.0'}%
              </TableCell>
              <TableCell className="text-right text-xs font-medium">
                {totals.invoice_count}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </Card>
  );
}
