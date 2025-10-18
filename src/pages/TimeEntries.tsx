import { useState, useEffect } from "react";
import { ClipboardCheck, Download, Edit, CheckCircle, XCircle, Clock, MoreHorizontal, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { TimeEntryFilters } from "@/types/timeEntry";
import { TimeEntryFiltersComponent } from "@/components/TimeEntryFilters";
import { TimeEntryBulkActions } from "@/components/TimeEntryBulkActions";
import { RejectTimeEntryDialog } from "@/components/RejectTimeEntryDialog";
import { EditTimeEntryDialog } from "@/components/time-tracker/EditTimeEntryDialog";
import { exportTimeEntriesToCSV } from "@/utils/timeEntryExport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { usePagination } from "@/hooks/usePagination";
import { CompletePagination } from "@/components/ui/complete-pagination";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { ColumnSelector } from "@/components/ui/column-selector";

const TimeEntries = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TimeEntryFilters>({
    dateFrom: null,
    dateTo: null,
    status: 'all',
    workerId: null,
    projectId: null,
  });
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('time-entries-visible-columns');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default visible columns
    return [
      'worker',
      'project',
      'date',
      'start',
      'end',
      'hours',
      'amount',
      'status',
      'submitted_at',
      'actions'
    ];
  });

  // Save visibility to localStorage
  useEffect(() => {
    localStorage.setItem('time-entries-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const pagination = usePagination({
    totalItems: 0,
    pageSize,
    initialPage: 1,
  });

  const { entries, statistics, loading, totalCount, refetch } = useTimeEntries(
    filters,
    pageSize,
    pagination.currentPage
  );

  // Update pagination when totalCount changes
  useEffect(() => {
    if (totalCount !== pagination.totalPages * pageSize) {
      pagination.goToPage(1);
    }
  }, [totalCount]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('time-entries-admin')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: 'category=eq.labor_internal'
      }, () => {
        refetch();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(entries.map(e => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  const handleApprove = async (entryIds: string[]) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          approval_status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .in('id', entryIds);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `${entryIds.length} ${entryIds.length === 1 ? 'entry' : 'entries'} approved`,
      });
      setSelectedIds([]);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve entries',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (reason: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          approval_status: 'rejected',
          rejection_reason: reason,
          approved_by: null,
          approved_at: null
        })
        .in('id', selectedIds);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `${selectedIds.length} ${selectedIds.length === 1 ? 'entry' : 'entries'} rejected`,
      });
      setSelectedIds([]);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject entries',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status || status === 'pending') {
      return <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
    }
    if (status === 'approved') {
      return <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">Approved</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">Rejected</Badge>;
    }
    return null;
  };

  // Define column metadata for selector
  const columnDefinitions = [
    { key: 'worker', label: 'Worker', required: true },
    { key: 'project', label: 'Project', required: true },
    { key: 'address', label: 'Project Address', required: false },
    { key: 'date', label: 'Date', required: true },
    { key: 'start', label: 'Start Time', required: false },
    { key: 'end', label: 'End Time', required: false },
    { key: 'hours', label: 'Hours', required: false },
    { key: 'amount', label: 'Amount', required: false },
    { key: 'status', label: 'Status', required: false },
    { key: 'submitted_at', label: 'Submitted At', required: false },
    { key: 'actions', label: 'Actions', required: true },
  ];

  return (
    <div className="container mx-auto py-2 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Entry Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Review and approve time entries</p>
        </div>
        <div className="flex items-center gap-2">
          <ColumnSelector
            columns={columnDefinitions}
            visibleColumns={visibleColumns}
            onVisibilityChange={setVisibleColumns}
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => exportTimeEntriesToCSV(entries)}
            disabled={entries.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Approval</p>
                <p className="text-lg font-bold">{statistics.pendingCount}</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Approved This Week</p>
                <p className="text-lg font-bold">{statistics.approvedThisWeekHours.toFixed(1)}h</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Rejected</p>
                <p className="text-lg font-bold">{statistics.rejectedCount}</p>
              </div>
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total This Month</p>
                <p className="text-lg font-bold">{statistics.totalThisMonthHours.toFixed(1)}h</p>
              </div>
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <TimeEntryFiltersComponent filters={filters} onFiltersChange={setFilters} />

      {/* Bulk Actions */}
      <TimeEntryBulkActions
        selectedCount={selectedIds.length}
        onApprove={() => handleApprove(selectedIds)}
        onReject={() => setRejectDialogOpen(true)}
        onCancel={() => setSelectedIds([])}
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === entries.length && entries.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  {visibleColumns.includes('worker') && <TableHead>Worker</TableHead>}
                  {visibleColumns.includes('project') && <TableHead>Project</TableHead>}
                  {visibleColumns.includes('address') && <TableHead>Address</TableHead>}
                  {visibleColumns.includes('date') && <TableHead>Date</TableHead>}
                  {visibleColumns.includes('start') && <TableHead>Start</TableHead>}
                  {visibleColumns.includes('end') && <TableHead>End</TableHead>}
                  {visibleColumns.includes('hours') && <TableHead className="text-right">Hours</TableHead>}
                  {visibleColumns.includes('amount') && <TableHead className="text-right">Amount</TableHead>}
                  {visibleColumns.includes('status') && <TableHead>Status</TableHead>}
                  {visibleColumns.includes('submitted_at') && <TableHead>Submitted At</TableHead>}
                  {visibleColumns.includes('actions') && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                      No time entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="w-12">
                        <Checkbox
                          checked={selectedIds.includes(entry.id)}
                          onCheckedChange={(checked) => handleSelectOne(entry.id, checked as boolean)}
                        />
                      </TableCell>
                      {visibleColumns.includes('worker') && (
                        <TableCell>
                          <div className="text-xs font-medium">{entry.worker_name}</div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('project') && (
                        <TableCell>
                          <div className="text-xs">
                            <div className="font-medium">{entry.project_number}</div>
                            <div className="text-muted-foreground">{entry.project_name}</div>
                            <div className="text-muted-foreground">{entry.client_name}</div>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('address') && (
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {entry.project_address || '-'}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('date') && (
                        <TableCell className="text-xs">{format(new Date(entry.expense_date), 'MMM dd, yyyy')}</TableCell>
                      )}
                      {visibleColumns.includes('start') && (
                        <TableCell className="font-mono text-xs">
                          {entry.start_time ? format(new Date(entry.start_time), 'HH:mm') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.includes('end') && (
                        <TableCell className="font-mono text-xs">
                          {entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.includes('hours') && (
                        <TableCell className="font-mono text-xs text-right">{entry.hours.toFixed(2)}</TableCell>
                      )}
                      {visibleColumns.includes('amount') && (
                        <TableCell className="font-mono text-xs text-right">${entry.amount.toFixed(2)}</TableCell>
                      )}
                      {visibleColumns.includes('status') && (
                        <TableCell>{getStatusBadge(entry.approval_status)}</TableCell>
                      )}
                      {visibleColumns.includes('submitted_at') && (
                        <TableCell className="text-xs">{format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                      )}
                      {visibleColumns.includes('actions') && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setEditingEntry(entry)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Time Entry
                              </DropdownMenuItem>
                              {(!entry.approval_status || entry.approval_status === 'pending') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleApprove([entry.id])}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedIds([entry.id]);
                                      setRejectDialogOpen(true);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => navigate(`/projects/${entry.project_id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="p-3 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    pagination.goToPage(1);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              
              <CompletePagination
                currentPage={pagination.currentPage}
                totalPages={Math.ceil(totalCount / pageSize)}
                onPageChange={pagination.goToPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <RejectTimeEntryDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={handleReject}
        entryCount={selectedIds.length}
      />

      {editingEntry && (
        <EditTimeEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          onSaved={() => {
            setEditingEntry(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default TimeEntries;
