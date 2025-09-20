import { useState, useEffect } from 'react';
import { ProjectProfitData } from '@/types/profit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { markProjectAsSynced, resetProjectSyncStatus } from '@/utils/syncUtils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VarianceBadge } from '@/components/ui/variance-badge';
import { CompletePagination } from '@/components/ui/complete-pagination';
import { usePagination } from '@/hooks/usePagination';

interface ProjectProfitTableProps {
  data: ProjectProfitData[];
  enablePagination?: boolean;
  pageSize?: number;
}

interface ProjectSyncData {
  id: string;
  sync_status: 'success' | 'failed' | 'pending' | null;
  last_synced_at: string | null;
}

type SortField = 'projectName' | 'actualProfit' | 'profitMargin' | 'profitVariance' | 'status';
type SortDirection = 'asc' | 'desc';

export default function ProjectProfitTable({ 
  data, 
  enablePagination = false, 
  pageSize = 10 
}: ProjectProfitTableProps) {
  const [sortField, setSortField] = useState<SortField>('actualProfit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [projectSyncData, setProjectSyncData] = useState<Record<string, ProjectSyncData>>({});
  const { toast } = useToast();

  // Pagination
  const pagination = usePagination({
    totalItems: data.length,
    pageSize: pageSize,
    initialPage: 1,
  });

  // Fetch sync data for all projects
  useEffect(() => {
    const fetchProjectSyncData = async () => {
      if (data.length === 0) return;
      
      const projectIds = data.map(p => p.projectId);
      const { data: syncData, error } = await supabase
        .from('projects')
        .select('id, sync_status, last_synced_at')
        .in('id', projectIds);

      if (error) {
        console.error('Error fetching project sync data:', error);
        return;
      }

      const syncDataMap = syncData.reduce((acc, project) => {
        acc[project.id] = project;
        return acc;
      }, {} as Record<string, ProjectSyncData>);

      setProjectSyncData(syncDataMap);
    };

    fetchProjectSyncData();
  }, [data]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleMarkProjectAsSynced = async (projectId: string) => {
    try {
      const { error } = await markProjectAsSynced(projectId);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Project marked as synced",
      });

      // Refresh sync data
      const { data: syncData } = await supabase
        .from('projects')
        .select('id, sync_status, last_synced_at')
        .eq('id', projectId)
        .single();

      if (syncData) {
        setProjectSyncData(prev => ({ ...prev, [projectId]: syncData }));
      }
    } catch (error) {
      console.error("Error marking project as synced:", error);
      toast({
        title: "Error",
        description: "Failed to mark project as synced",
        variant: "destructive",
      });
    }
  };

  const handleResetProjectSync = async (projectId: string) => {
    try {
      const { error } = await resetProjectSyncStatus(projectId);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Project sync status reset",
      });

      // Refresh sync data
      const { data: syncData } = await supabase
        .from('projects')
        .select('id, sync_status, last_synced_at')
        .eq('id', projectId)
        .single();

      if (syncData) {
        setProjectSyncData(prev => ({ ...prev, [projectId]: syncData }));
      }
    } catch (error) {
      console.error("Error resetting project sync:", error);
      toast({
        title: "Error",
        description: "Failed to reset project sync status",
        variant: "destructive",
      });
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

  // Apply pagination to sorted data
  const paginatedData = enablePagination 
    ? sortedData.slice(
        (pagination.currentPage - 1) * pageSize,
        pagination.currentPage * pageSize
      )
    : sortedData;

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
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No projects found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((project) => (
                  <TableRow key={project.projectId}>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <div>
                           <div className="font-medium">{project.projectName}</div>
                           <div className="text-sm text-muted-foreground">{project.client}</div>
                         </div>
                         <SyncStatusBadge
                           status={projectSyncData[project.projectId]?.sync_status}
                           lastSyncedAt={projectSyncData[project.projectId]?.last_synced_at}
                           showActions={true}
                           onMarkAsSynced={() => handleMarkProjectAsSynced(project.projectId)}
                           onResetSync={() => handleResetProjectSync(project.projectId)}
                         />
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
                       <VarianceBadge 
                         variance={project.profitVariance}
                         percentage={(project.profitVariance / project.estimatedProfit) * 100}
                       />
                     </TableCell>
                   </TableRow>
                ))
              )}
            </TableBody>
            </Table>
        </div>
        
        {enablePagination && data.length > 0 && pagination.totalPages > 1 && (
          <div className="mt-4">
            <CompletePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.goToPage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}