import { useState, useEffect } from "react";
import { ClipboardCheck, Download, Edit, CheckCircle, XCircle, Clock } from "lucide-react";
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
import { EditTimeEntryModal } from "@/components/time-tracker/EditTimeEntryModal";
import { exportTimeEntriesToCSV } from "@/utils/timeEntryExport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { usePagination } from "@/hooks/usePagination";
import { CompletePagination } from "@/components/ui/complete-pagination";
import { useAuth } from "@/contexts/AuthContext";

const TimeEntries = () => {
  const { user } = useAuth();
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
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
    }
    if (status === 'approved') {
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Approved</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>;
    }
    return null;
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            Time Entry Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve time entries</p>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xl font-bold">{statistics.pendingCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Approved This Week
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xl font-bold">{statistics.approvedThisWeekHours.toFixed(1)}h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xl font-bold">{statistics.rejectedCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Total This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xl font-bold">{statistics.totalThisMonthHours.toFixed(1)}h</p>
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
                  <TableHead>Worker</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No time entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map(entry => (
                    <TableRow key={entry.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(entry.id)}
                          onCheckedChange={(checked) => handleSelectOne(entry.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{entry.worker_name}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div className="font-medium">{entry.project_number}</div>
                          <div className="text-muted-foreground">{entry.project_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(entry.expense_date), 'MMM dd')}</TableCell>
                      <TableCell>
                        {entry.start_time ? format(new Date(entry.start_time), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">{entry.hours.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">${entry.amount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(entry.approval_status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingEntry(entry)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {(!entry.approval_status || entry.approval_status === 'pending') && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleApprove([entry.id])}
                              >
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedIds([entry.id]);
                                  setRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="h-3 w-3 text-red-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
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
        <EditTimeEntryModal
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
