import { useState, useEffect } from "react";
import { ClipboardCheck, Download, Edit, CheckCircle, XCircle, Clock, MoreHorizontal, Eye, FileImage, Paperclip } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceiptsManagement } from "@/components/ReceiptsManagement";

// Define column metadata for selector (must be outside component for state initialization)
const columnDefinitions = [
  { key: 'worker', label: 'Worker', required: true },
  { key: 'project', label: 'Project', required: true },
  { key: 'address', label: 'Project Address', required: false },
  { key: 'date', label: 'Date', required: true },
  { key: 'start', label: 'Start Time', required: false },
  { key: 'end', label: 'End Time', required: false },
  { key: 'hours', label: 'Hours', required: false },
  { key: 'amount', label: 'Amount', required: false },
  { key: 'receipt', label: 'Receipt', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'submitted_at', label: 'Submitted At', required: false },
  { key: 'actions', label: 'Actions', required: true },
];

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
  const [receiptCount, setReceiptCount] = useState(0);

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
      'receipt',
      'status',
      'submitted_at',
      'actions'
    ];
  });

  // Column order state with localStorage persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('time-entries-column-order');
    if (saved) {
      const savedOrder = JSON.parse(saved);
      // Filter out any invalid column keys
      const validOrder = savedOrder.filter((key: string) => 
        columnDefinitions.some(col => col.key === key)
      );
      // Add any new columns that aren't in saved order
      const newColumns = columnDefinitions
        .map(col => col.key)
        .filter(key => !validOrder.includes(key));
      
      return [...validOrder, ...newColumns];
    }
    // Default: use order from columnDefinitions
    return columnDefinitions.map(col => col.key);
  });

  // Save visibility to localStorage
  useEffect(() => {
    localStorage.setItem('time-entries-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save column order to localStorage
  useEffect(() => {
    localStorage.setItem('time-entries-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Fetch receipt count
  const fetchReceiptCount = async () => {
    try {
      // Count only PENDING receipts from both sources
      const [{ count: timeEntryCount }, { count: standaloneCount }] = await Promise.all([
        supabase
          .from('expenses')
          .select('*', { count: 'exact', head: true })
          .eq('category', 'labor_internal')
          .not('attachment_url', 'is', null)
          .or('approval_status.is.null,approval_status.eq.pending'),
        supabase
          .from('receipts')
          .select('*', { count: 'exact', head: true })
          .or('approval_status.is.null,approval_status.eq.pending')
      ]);
      
      setReceiptCount((timeEntryCount || 0) + (standaloneCount || 0));
    } catch (error) {
      console.error('Failed to fetch receipt count:', error);
    }
  };

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

  // Fetch receipt count on mount
  useEffect(() => {
    fetchReceiptCount();
  }, []);

  // Real-time updates for time entries
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

  // Real-time updates for receipt count
  useEffect(() => {
    const channel = supabase
      .channel('receipt-count-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: 'category=eq.labor_internal'
      }, fetchReceiptCount)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'receipts'
      }, fetchReceiptCount)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
      return <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
    }
    if (status === 'approved') {
      return <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-green-50 text-green-700 border-green-300">Approved</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-red-50 text-red-700 border-red-300">Rejected</Badge>;
    }
    return null;
  };

  return (
    <div className="container mx-auto py-2 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Entry Management
          </h1>
          <p className="text-xs text-muted-foreground">Review time entries and manage receipts</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="mb-2 h-8">
          <TabsTrigger value="entries" className="text-xs h-7">
            <ClipboardCheck className="h-3 w-3 mr-1" />
            Time Entries
          </TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs h-7">
            <FileImage className="h-3 w-3 mr-1" />
            Receipts
            {receiptCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1.5">
                {receiptCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Time Entries Tab */}
        <TabsContent value="entries" className="space-y-2">
          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            <ColumnSelector
              columns={columnDefinitions}
              visibleColumns={visibleColumns}
              onVisibilityChange={setVisibleColumns}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
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

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Approval</p>
                    <p className="text-base font-bold">{statistics.pendingCount}</p>
                  </div>
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Approved This Week</p>
                    <p className="text-base font-bold">{statistics.approvedThisWeekHours.toFixed(1)}h</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                    <p className="text-base font-bold">{statistics.rejectedCount}</p>
                  </div>
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total This Month</p>
                    <p className="text-base font-bold">{statistics.totalThisMonthHours.toFixed(1)}h</p>
                  </div>
                  <Clock className="h-5 w-5 text-blue-500" />
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
                <TableRow className="h-8">
                  <TableHead className="w-10 p-2">
                    <Checkbox
                      checked={selectedIds.length === entries.length && entries.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  {columnOrder.map(colKey => {
                    if (!visibleColumns.includes(colKey)) return null;
                    
                    const widths: Record<string, string> = {
                      worker: 'w-32',
                      project: 'w-48',
                      address: 'w-40',
                      date: 'w-28',
                      start: 'w-20',
                      end: 'w-20',
                      hours: 'w-20',
                      amount: 'w-24',
                      receipt: 'w-16',
                      status: 'w-24',
                      submitted_at: 'w-36',
                      actions: 'w-20'
                    };
                    
                    switch (colKey) {
                      case 'worker':
                        return <TableHead key={colKey} className={`p-2 text-xs font-medium h-8 ${widths[colKey]}`}>Worker</TableHead>;
                      case 'project':
                        return <TableHead key={colKey} className={`p-2 text-xs font-medium h-8 ${widths[colKey]}`}>Project</TableHead>;
                      case 'address':
                        return <TableHead key={colKey} className={`p-2 text-xs font-medium h-8 ${widths[colKey]}`}>Address</TableHead>;
                      case 'date':
                        return <TableHead key={colKey} className={`p-2 text-xs font-medium h-8 ${widths[colKey]}`}>Date</TableHead>;
                      case 'start':
                        return <TableHead key={colKey} className={`p-2 text-xs font-medium h-8 ${widths[colKey]}`}>Start</TableHead>;
                      case 'end':
                        return <TableHead key={colKey} className={`p-2 text-xs font-medium h-8 ${widths[colKey]}`}>End</TableHead>;
                      case 'hours':
                        return <TableHead key={colKey} className={`p-2 text-xs font-medium h-8 text-right ${widths[colKey]}`}>Hours</TableHead>;
                      case 'amount':
                        return <TableHead key={colKey} className={`p-2 text-xs font-medium h-8 text-right ${widths[colKey]}`}>Amount</TableHead>;
                      case 'receipt':
                        return <TableHead key={colKey} className={`p-2 text-xs font-medium h-8 text-center ${widths[colKey]}`}>Receipt</TableHead>;
                      case 'status':
                        return <TableHead key={colKey} className={`p-2 text-xs font-medium h-8 ${widths[colKey]}`}>Status</TableHead>;
                      case 'submitted_at':
                        return <TableHead key={colKey} className={`p-2 text-xs font-medium h-8 ${widths[colKey]}`}>Submitted At</TableHead>;
                      case 'actions':
                        return <TableHead key={colKey} className={`p-2 text-xs font-medium h-8 text-right ${widths[colKey]}`}>Actions</TableHead>;
                      default:
                        return null;
                    }
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} className="text-center py-4 text-xs">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} className="text-center py-4 text-xs text-muted-foreground">
                      No time entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map(entry => (
                    <TableRow key={entry.id} className="h-9 hover:bg-muted/50 even:bg-muted/20">
                      <TableCell className="p-1.5">
                        <Checkbox
                          checked={selectedIds.includes(entry.id)}
                          onCheckedChange={(checked) => handleSelectOne(entry.id, checked as boolean)}
                        />
                      </TableCell>
                      {columnOrder.map(colKey => {
                        if (!visibleColumns.includes(colKey)) return null;
                        
                        switch (colKey) {
                          case 'worker':
                            return (
                              <TableCell key={colKey} className="p-1.5 text-xs font-medium">{entry.worker_name}</TableCell>
                            );
                          case 'project':
                            return (
                              <TableCell key={colKey} className="p-1.5">
                                <div className="text-xs leading-tight">
                                  <div className="font-medium">{entry.project_number}</div>
                                  <div className="text-muted-foreground text-[10px]">{entry.project_name}</div>
                                  <div className="text-muted-foreground text-[10px]">{entry.client_name}</div>
                                </div>
                              </TableCell>
                            );
                          case 'address':
                            return (
                              <TableCell key={colKey} className="p-1.5 text-xs text-muted-foreground">
                                {entry.project_address || '-'}
                              </TableCell>
                            );
                          case 'date':
                            return (
                              <TableCell key={colKey} className="p-1.5 text-xs">
                                {format(new Date(entry.expense_date), 'MMM dd, yyyy')}
                              </TableCell>
                            );
                          case 'start':
                            return (
                              <TableCell key={colKey} className="p-1.5 font-mono text-xs">
                                {entry.start_time ? format(new Date(entry.start_time), 'HH:mm') : '-'}
                              </TableCell>
                            );
                          case 'end':
                            return (
                              <TableCell key={colKey} className="p-1.5 font-mono text-xs">
                                {entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : '-'}
                              </TableCell>
                            );
                          case 'hours':
                            return (
                              <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right">
                                {entry.hours.toFixed(2)}
                              </TableCell>
                            );
                          case 'amount':
                            return (
                              <TableCell key={colKey} className="p-1.5 font-mono text-xs text-right font-semibold">
                                ${entry.amount.toFixed(2)}
                              </TableCell>
                            );
                          case 'receipt':
                            return (
                              <TableCell key={colKey} className="p-1.5 text-center">
                                {entry.attachment_url ? (
                                  <Paperclip className="h-3 w-3 text-blue-600 inline-block" />
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </TableCell>
                            );
                          case 'status':
                            return (
                              <TableCell key={colKey} className="p-1.5">
                                {getStatusBadge(entry.approval_status)}
                              </TableCell>
                            );
                          case 'submitted_at':
                            return (
                              <TableCell key={colKey} className="p-1.5 text-xs">
                                {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
                              </TableCell>
                            );
                          case 'actions':
                            return (
                              <TableCell key={colKey}>
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
                            );
                          default:
                            return null;
                        }
                      })}
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
        </TabsContent>

        {/* Receipts Tab */}
        <TabsContent value="receipts">
          <ReceiptsManagement />
        </TabsContent>
      </Tabs>

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
