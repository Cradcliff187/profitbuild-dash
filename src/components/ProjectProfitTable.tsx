import { useState } from 'react';
import { ProjectProfitData } from '@/types/profit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';

interface ProjectProfitTableProps {
  data: ProjectProfitData[];
}

type SortField = 'projectName' | 'actualProfit' | 'profitMargin' | 'profitVariance' | 'status';
type SortDirection = 'asc' | 'desc';

export default function ProjectProfitTable({ data }: ProjectProfitTableProps) {
  const [sortField, setSortField] = useState<SortField>('actualProfit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];
    
    if (sortField === 'projectName') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getStatusBadge = (status: ProjectProfitData['status']) => {
    const variants = {
      'Estimating': 'secondary',
      'In Progress': 'default',
      'Complete': 'outline'
    } as const;
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getProfitColor = (profit: number) => {
    return profit >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (variance < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-0 font-semibold text-foreground hover:text-primary"
    >
      {children}
      <ArrowUpDown className="ml-1 w-3 h-3" />
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Profitability</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton field="projectName">Project</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="status">Status</SortButton>
                </TableHead>
                <TableHead className="text-right">Quote Total</TableHead>
                <TableHead className="text-right">Actual Expenses</TableHead>
                <TableHead className="text-right">
                  <SortButton field="actualProfit">Actual Profit</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="profitMargin">Margin %</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="profitVariance">Variance</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No projects found
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((project) => (
                  <TableRow key={project.projectId}>
                     <TableCell>
                       <div>
                         <div className="font-medium">{project.projectName}</div>
                         <div className="text-sm text-muted-foreground">{project.client}</div>
                       </div>
                     </TableCell>
                    <TableCell>
                      {getStatusBadge(project.status)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${project.quoteTotal.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${project.actualExpenses.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${getProfitColor(project.actualProfit)}`}>
                      ${project.actualProfit.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${getProfitColor(project.profitMargin)}`}>
                      {project.profitMargin.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {getVarianceIcon(project.profitVariance)}
                        <span className={getProfitColor(project.profitVariance)}>
                          ${Math.abs(project.profitVariance).toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}