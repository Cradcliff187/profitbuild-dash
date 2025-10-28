import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Image, Download, Trash2, FileImage, MoreHorizontal, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ReceiptFiltersComponent, ReceiptFilters } from '@/components/ReceiptFilters';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ReceiptPreviewModal } from '@/components/ReceiptPreviewModal';
import { downloadSingleReceipt, downloadReceiptsAsZip } from '@/utils/receiptDownloadUtils';
import { RejectTimeEntryDialog } from '@/components/RejectTimeEntryDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { usePagination } from '@/hooks/usePagination';
import { CompletePagination } from '@/components/ui/complete-pagination';
import { exportReceiptsToCSV } from '@/utils/receiptExport';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UnifiedReceipt {
  id: string;
  type: 'time_entry' | 'standalone';
  image_url: string;
  payee_id: string;
  payee_name: string;
  project_id: string;
  project_number: string;
  project_name: string;
  date: string;
  amount: number;
  description?: string;
  hours?: number;
  approval_status?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  submitted_for_approval_at?: string;
}

export const ReceiptsManagement: React.FC = () => {
  const [allReceipts, setAllReceipts] = useState<UnifiedReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReceiptFilters>({
    dateFrom: null,
    dateTo: null,
    status: 'all',
    payeeId: null,
    projectId: null,
    amountMin: null,
    amountMax: null,
  });
  
  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [previewDetails, setPreviewDetails] = useState<any>(null);
  
  // Approval state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [receiptToReject, setReceiptToReject] = useState<string | null>(null);
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    loadReceipts();
  }, []);

  // Real-time updates for receipts
  useEffect(() => {
    const channel = supabase
      .channel('receipts-realtime-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: 'category=eq.labor_internal'
      }, () => {
        console.log('Time entry receipt updated');
        loadReceipts();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'receipts'
      }, () => {
        console.log('Standalone receipt updated');
        loadReceipts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      // Fetch both types in parallel
      const [timeEntryResult, standaloneResult] = await Promise.all([
        supabase
          .from('expenses')
          .select(`
            id,
            expense_date,
            amount,
            attachment_url,
            start_time,
            end_time,
            payee_id,
            project_id,
            payees!inner(payee_name),
            projects!inner(project_number, project_name)
          `)
          .eq('category', 'labor_internal')
          .not('attachment_url', 'is', null)
          .order('expense_date', { ascending: false }),
        
        supabase
          .from('receipts')
          .select(`
            id,
            image_url,
            amount,
            description,
            captured_at,
            approval_status,
            approved_by,
            approved_at,
            submitted_for_approval_at,
            rejection_reason,
            payee_id,
            project_id,
            payees(payee_name),
            projects(project_number, project_name)
          `)
          .order('captured_at', { ascending: false })
      ]);

      if (timeEntryResult.error) throw timeEntryResult.error;
      if (standaloneResult.error) throw standaloneResult.error;

      // Transform time entry receipts
      const timeEntryReceipts: UnifiedReceipt[] = (timeEntryResult.data || []).map((expense: any) => {
        const hours = expense.start_time && expense.end_time
          ? (new Date(expense.end_time).getTime() - new Date(expense.start_time).getTime()) / (1000 * 60 * 60)
          : 0;

        return {
          id: expense.id,
          type: 'time_entry' as const,
          image_url: expense.attachment_url,
          payee_id: expense.payee_id || '',
          payee_name: expense.payees?.payee_name || 'Unknown',
          project_id: expense.project_id || '',
          project_number: expense.projects?.project_number || '',
          project_name: expense.projects?.project_name || '',
          date: expense.expense_date,
          amount: expense.amount,
          hours,
        };
      });

      // Transform standalone receipts
      const standaloneReceipts: UnifiedReceipt[] = (standaloneResult.data || []).map((receipt: any) => ({
        id: receipt.id,
        type: 'standalone' as const,
        image_url: receipt.image_url,
        payee_id: receipt.payee_id || '',
        payee_name: receipt.payees?.payee_name || 'Unknown',
        project_id: receipt.project_id || '',
        project_number: receipt.projects?.project_number || 'SYS-000',
        project_name: receipt.projects?.project_name || 'Unassigned',
        date: receipt.captured_at,
        amount: receipt.amount,
        description: receipt.description || '',
        approval_status: receipt.approval_status,
        approved_by: receipt.approved_by,
        approved_at: receipt.approved_at,
        rejection_reason: receipt.rejection_reason,
        submitted_for_approval_at: receipt.submitted_for_approval_at,
      }));

      // Merge and sort by date (most recent first)
      const unified = [...timeEntryReceipts, ...standaloneReceipts]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllReceipts(unified);
    } catch (error) {
      console.error('Failed to load receipts:', error);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = (receipt: UnifiedReceipt) => {
    setSelectedReceiptUrl(receipt.image_url);
    setPreviewDetails({
      payee: receipt.payee_name,
      project: `${receipt.project_number} - ${receipt.project_name}`,
      date: format(new Date(receipt.date), 'MMM dd, yyyy'),
      amount: `$${receipt.amount.toFixed(2)}`,
      ...(receipt.hours !== undefined && { hours: `${receipt.hours.toFixed(2)} hrs` }),
    });
    setPreviewOpen(true);
  };

  const handleApproveReceipt = async (receiptId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('receipts')
        .update({
          approval_status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', receiptId);

      if (error) throw error;
      toast.success('Receipt approved');
      loadReceipts();
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve receipt');
    }
  };

  const handleRejectReceipt = async (receiptId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('receipts')
        .update({
          approval_status: 'rejected',
          rejection_reason: reason,
          approved_by: null,
          approved_at: null
        })
        .eq('id', receiptId);

      if (error) throw error;
      toast.success('Receipt rejected');
      setRejectDialogOpen(false);
      setReceiptToReject(null);
      loadReceipts();
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Failed to reject receipt');
    }
  };

  const handleDeleteReceipt = async (receiptId: string, receiptType: 'time_entry' | 'standalone') => {
    // Only allow deletion of standalone receipts
    if (receiptType !== 'standalone') {
      toast.error('Cannot delete time entry receipts');
      return;
    }

    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId);

      if (error) throw error;

      toast.success('Receipt deleted');
      loadReceipts();
    } catch (error) {
      toast.error('Failed to delete receipt');
    }
  };

  const getStatusBadge = (status?: string) => {
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

  const handleBulkDownload = async () => {
    try {
      if (filteredReceipts.length === 0) {
        toast.error('No receipts to download');
        return;
      }

      toast.success(`Downloading ${filteredReceipts.length} receipts...`);
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const filename = `all_receipts_${dateStr}.zip`;

      const receiptsToDownload = filteredReceipts.map(r => ({
        id: r.id,
        attachment_url: r.image_url,
        worker_name: r.payee_name,
        project_number: r.project_number,
        expense_date: r.date,
        hours: r.hours || 0,
      }));
      
      await downloadReceiptsAsZip(receiptsToDownload, filename);
      toast.success('Download complete');
    } catch (error) {
      toast.error('Failed to download receipts');
    }
  };

  // Filter receipts based on all filter criteria
  const filteredReceipts = allReceipts.filter(r => {
    // Date range filter
    if (filters.dateFrom && new Date(r.date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(r.date) > new Date(filters.dateTo)) return false;
    
    // Status filter
    const receiptStatus = r.approval_status || 'pending';
    if (filters.status !== 'all' && receiptStatus !== filters.status) return false;
    
    // Amount range filter
    if (filters.amountMin && r.amount < parseFloat(filters.amountMin)) return false;
    if (filters.amountMax && r.amount > parseFloat(filters.amountMax)) return false;
    
    // Payee filter
    if (filters.payeeId && r.payee_id !== filters.payeeId) return false;
    
    // Project filter
    if (filters.projectId && r.project_id !== filters.projectId) return false;
    
    return true;
  });

  // Statistics calculation
  const statistics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    return {
      pendingCount: allReceipts.filter(r => 
        !r.approval_status || r.approval_status === 'pending'
      ).length,
      approvedTodayCount: allReceipts.filter(r => 
        r.approval_status === 'approved' && 
        r.approved_at && 
        new Date(r.approved_at) >= todayStart
      ).length,
      rejectedCount: allReceipts.filter(r => 
        r.approval_status === 'rejected'
      ).length,
      totalThisWeekCount: allReceipts.filter(r => 
        new Date(r.date) >= weekStart
      ).length,
    };
  }, [allReceipts]);

  // Pagination
  const pagination = usePagination({
    totalItems: filteredReceipts.length,
    pageSize: 25,
    initialPage: 1,
  });

  const paginatedReceipts = filteredReceipts.slice(
    pagination.startIndex,
    pagination.endIndex
  );

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const standaloneIds = paginatedReceipts
        .filter(r => r.type === 'standalone')
        .map(r => r.id);
      setSelectedIds(standaloneIds);
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

  // Bulk action handlers
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('receipts')
        .update({
          approval_status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .in('id', selectedIds);

      if (error) throw error;
      toast.success(`${selectedIds.length} receipts approved`);
      setSelectedIds([]);
      loadReceipts();
    } catch (error) {
      console.error('Bulk approval error:', error);
      toast.error('Failed to approve receipts');
    }
  };

  const handleBulkReject = async (reason: string) => {
    if (selectedIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('receipts')
        .update({
          approval_status: 'rejected',
          rejection_reason: reason,
          approved_by: null,
          approved_at: null
        })
        .in('id', selectedIds);

      if (error) throw error;
      toast.success(`${selectedIds.length} receipts rejected`);
      setBulkRejectDialogOpen(false);
      setSelectedIds([]);
      loadReceipts();
    } catch (error) {
      console.error('Bulk rejection error:', error);
      toast.error('Failed to reject receipts');
    }
  };

  const handleBulkDownloadSelected = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const receiptsToDownload = allReceipts
        .filter(r => selectedIds.includes(r.id))
        .map(r => ({
          id: r.id,
          attachment_url: r.image_url,
          worker_name: r.payee_name,
          project_number: r.project_number,
          expense_date: r.date,
          hours: r.hours || 0,
        }));
      
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const filename = `selected_receipts_${dateStr}.zip`;
      
      toast.success(`Downloading ${selectedIds.length} receipts...`);
      await downloadReceiptsAsZip(receiptsToDownload, filename);
      toast.success('Download complete');
    } catch (error) {
      toast.error('Failed to download receipts');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner variant="spinner" size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Receipt Management</h3>
          <p className="text-xs text-muted-foreground">
            View and manage all receipts from time entries and standalone uploads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => exportReceiptsToCSV(filteredReceipts)}
            disabled={filteredReceipts.length === 0}
          >
            <Download className="h-3 w-3 mr-1" />
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
                <p className="text-xs text-muted-foreground">Approved Today</p>
                <p className="text-base font-bold">{statistics.approvedTodayCount}</p>
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
                <p className="text-xs text-muted-foreground">Total This Week</p>
                <p className="text-base font-bold">{statistics.totalThisWeekCount}</p>
              </div>
              <FileImage className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <ReceiptFiltersComponent filters={filters} onFiltersChange={setFilters} />

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-1.5 p-1.5 bg-muted border rounded-md">
          <span className="text-xs font-medium">
            {selectedIds.length} {selectedIds.length === 1 ? 'receipt' : 'receipts'} selected
          </span>
          <div className="flex gap-1.5 ml-auto">
            <Button size="sm" variant="default" onClick={handleBulkApprove}>
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkRejectDialogOpen(true)}>
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkDownloadSelected}>
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Single Unified Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="h-8">
                <TableHead className="w-10 p-2 text-xs">
                  <Checkbox
                    checked={selectedIds.length === paginatedReceipts.filter(r => r.type === 'standalone').length && paginatedReceipts.filter(r => r.type === 'standalone').length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-12 text-xs">Preview</TableHead>
                <TableHead className="w-24 text-xs">Type</TableHead>
                <TableHead className="text-xs">Payee/Worker</TableHead>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-right text-xs">Amount</TableHead>
                <TableHead className="text-xs w-24">Status</TableHead>
                <TableHead className="text-xs w-36">Submitted At</TableHead>
                <TableHead className="text-xs max-w-xs">Description</TableHead>
                <TableHead className="text-right text-xs w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-6 text-xs text-muted-foreground">
                    No receipts found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReceipts.map((receipt) => (
                  <TableRow key={receipt.id} className="h-9 hover:bg-muted/50 even:bg-muted/20">
                    {/* Selection Checkbox */}
                    <TableCell className="p-1.5">
                      {receipt.type === 'standalone' ? (
                        <Checkbox
                          checked={selectedIds.includes(receipt.id)}
                          onCheckedChange={(checked) => handleSelectOne(receipt.id, checked as boolean)}
                        />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </TableCell>

                    {/* Preview Button */}
                    <TableCell className="p-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleViewReceipt(receipt)}
                      >
                        <Image className="h-3 w-3 text-blue-600" />
                      </Button>
                    </TableCell>

                    {/* Type Badge */}
                    <TableCell className="p-1.5">
                      <Badge 
                        variant={receipt.type === 'time_entry' ? 'default' : 'secondary'}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {receipt.type === 'time_entry' ? 'Time Entry' : 'Standalone'}
                      </Badge>
                    </TableCell>

                    {/* Payee/Worker */}
                    <TableCell className="p-1.5 font-medium text-xs">
                      {receipt.payee_name}
                    </TableCell>

                    {/* Project */}
                    <TableCell className="p-1.5">
                      <div className="text-xs">
                        <div className="font-medium">{receipt.project_number}</div>
                        <div className="text-muted-foreground text-[10px]">{receipt.project_name}</div>
                      </div>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="p-1.5 text-xs">
                      {format(new Date(receipt.date), 'MMM dd, yyyy')}
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="p-1.5 text-right font-semibold text-xs">
                      ${receipt.amount.toFixed(2)}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="p-1.5">
                      {getStatusBadge(receipt.approval_status)}
                    </TableCell>

                    {/* Submitted At */}
                    <TableCell className="p-1.5 text-xs">
                      {receipt.submitted_for_approval_at 
                        ? format(new Date(receipt.submitted_for_approval_at), 'MMM dd, HH:mm')
                        : '-'}
                    </TableCell>

                    {/* Description */}
                    <TableCell className="p-1.5 text-xs text-muted-foreground max-w-xs truncate">
                      {receipt.type === 'time_entry' && receipt.hours !== undefined
                        ? `${receipt.hours.toFixed(2)} hrs`
                        : receipt.description || '-'}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="p-1.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewReceipt(receipt)}>
                            <Image className="h-3 w-3 mr-2" />
                            View Receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            const filename = `receipt_${receipt.payee_name}_${format(new Date(receipt.date), 'yyyy-MM-dd')}.jpg`;
                            try {
                              await downloadSingleReceipt(receipt.image_url, filename);
                              toast.success('Receipt downloaded');
                            } catch (error) {
                              toast.error('Failed to download receipt');
                            }
                          }}>
                            <Download className="h-3 w-3 mr-2" />
                            Download
                          </DropdownMenuItem>
                          
                          {/* Approve/Reject actions for standalone receipts only */}
                          {receipt.type === 'standalone' && (!receipt.approval_status || receipt.approval_status === 'pending') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleApproveReceipt(receipt.id)}>
                                <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setReceiptToReject(receipt.id);
                                setRejectDialogOpen(true);
                              }}>
                                <XCircle className="h-3 w-3 mr-2 text-red-600" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {/* Delete action for standalone receipts */}
                          {receipt.type === 'standalone' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteReceipt(receipt.id, receipt.type)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredReceipts.length > 0 && (
        <div className="flex items-center justify-between px-2 py-2">
          <div className="text-xs text-muted-foreground">
            Showing {pagination.startIndex + 1} to {Math.min(pagination.endIndex, filteredReceipts.length)} of {filteredReceipts.length} receipts
          </div>
          <CompletePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.goToPage}
          />
        </div>
      )}

      {/* Preview Modal */}
      <ReceiptPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        receiptUrl={selectedReceiptUrl}
        timeEntryDetails={previewDetails}
      />

      {/* Reject Dialog for Single Receipt */}
      <RejectTimeEntryDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={async (reason) => {
          if (receiptToReject) {
            await handleRejectReceipt(receiptToReject, reason);
          }
        }}
        entryCount={1}
      />

      {/* Bulk Reject Dialog */}
      <RejectTimeEntryDialog
        open={bulkRejectDialogOpen}
        onOpenChange={setBulkRejectDialogOpen}
        onConfirm={handleBulkReject}
        entryCount={selectedIds.length}
      />
    </div>
  );
};
