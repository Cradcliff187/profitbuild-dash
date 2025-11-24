import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Image, Download, Trash2, FileImage, MoreHorizontal, CheckCircle, XCircle, Clock, Edit } from 'lucide-react';
import { ReceiptSearchFilters, ReceiptFilters } from '@/components/ReceiptSearchFilters';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { ReceiptPreviewModal } from '@/components/ReceiptPreviewModal';
import { downloadSingleReceipt, downloadReceiptsAsZip } from '@/utils/receiptDownloadUtils';
import { RejectTimeEntryDialog } from '@/components/RejectTimeEntryDialog';
import { EditReceiptDialog } from '@/components/time-tracker/EditReceiptDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { usePagination } from '@/hooks/usePagination';
import { CompletePagination } from '@/components/ui/complete-pagination';
import { exportReceiptsToCSV } from '@/utils/receiptExport';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ColumnSelector } from '@/components/ui/column-selector';
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

const receiptColumnDefinitions = [
  { key: 'preview', label: 'Preview', required: true, hiddenOnMobile: false },
  { key: 'type', label: 'Type', required: false, hiddenOnMobile: true },
  { key: 'payee', label: 'Vendor', required: true, hiddenOnMobile: false },
  { key: 'project', label: 'Project', required: true, hiddenOnMobile: true },
  { key: 'date', label: 'Date', required: true, hiddenOnMobile: false },
  { key: 'amount', label: 'Amount', required: false, hiddenOnMobile: false },
  { key: 'status', label: 'Status', required: false, hiddenOnMobile: true },
  { key: 'submitted_at', label: 'Submitted At', required: false, hiddenOnMobile: true },
  { key: 'submitted_by', label: 'Submitted By', required: false, hiddenOnMobile: true },
  { key: 'description', label: 'Description', required: false, hiddenOnMobile: true },
  { key: 'actions', label: 'Actions', required: true, hiddenOnMobile: false },
];

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
  user_id?: string;
  captured_at?: string;
  submitted_by_name?: string;
}

export interface ReceiptsManagementRef {
  exportToCSV: () => void;
  getColumnState: () => {
    visibleColumns: string[];
    columnOrder: string[];
    setVisibleColumns: (cols: string[]) => void;
    setColumnOrder: (order: string[]) => void;
  };
  refresh: () => void;
}

export const ReceiptsManagement = forwardRef<ReceiptsManagementRef>((props, ref) => {
  const isMobile = useIsMobile();
  const [allReceipts, setAllReceipts] = useState<UnifiedReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReceiptFilters>({
    dateFrom: null,
    dateTo: null,
    status: [],
    payeeIds: [],
    projectIds: [],
    amount: null,
  });
  const [payees, setPayees] = useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; number: string; name: string }>>([]);
  const [pageSize, setPageSize] = useState(25);
  
  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [previewDetails, setPreviewDetails] = useState<any>(null);
  
  // Approval state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [receiptToReject, setReceiptToReject] = useState<string | null>(null);
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Edit modal state
  const [editingReceipt, setEditingReceipt] = useState<UnifiedReceipt | null>(null);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('receipts-visible-columns');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default visible columns
    return [
      'preview',
      'type',
      'payee',
      'project',
      'date',
      'amount',
      'status',
      'submitted_at',
      'submitted_by',
      'description',
      'actions'
    ];
  });

  // Column order state with localStorage persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('receipts-column-order');
    if (saved) {
      const savedOrder = JSON.parse(saved);
      // Filter out any invalid column keys
      const validOrder = savedOrder.filter((key: string) => 
        receiptColumnDefinitions.some(col => col.key === key)
      );
      // Add any new columns that aren't in saved order
      const newColumns = receiptColumnDefinitions
        .map(col => col.key)
        .filter(key => !validOrder.includes(key));
      
      return [...validOrder, ...newColumns];
    }
    // Default: use order from receiptColumnDefinitions
    return receiptColumnDefinitions.map(col => col.key);
  });

  // Filter columns for mobile - hide columns marked as hiddenOnMobile
  const displayColumns = useMemo(() => {
    if (!isMobile) return columnOrder;
    return columnOrder.filter(colKey => {
      const colDef = receiptColumnDefinitions.find(def => def.key === colKey);
      return colDef && !colDef.hiddenOnMobile;
    });
  }, [columnOrder, isMobile]);

  useEffect(() => {
    loadReceipts();
  }, []);

  // Fetch payees for filter
  useEffect(() => {
    const fetchPayees = async () => {
      const { data } = await supabase
        .from('payees')
        .select('id, payee_name')
        .eq('is_active', true)
        .order('payee_name');
      
      if (data) {
        setPayees(data.map(p => ({ id: p.id, name: p.payee_name })));
      }
    };
    fetchPayees();
  }, []);

  // Fetch projects for filter
  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, project_number, project_name')
        .neq('project_number', 'SYS-000')
        .neq('project_number', '000-UNASSIGNED')
        .order('project_number');
      
      if (data) {
        setProjects(data.map(p => ({ 
          id: p.id, 
          number: p.project_number, 
          name: p.project_name 
        })));
      }
    };
    fetchProjects();
  }, []);

  // Save visibility to localStorage
  useEffect(() => {
    localStorage.setItem('receipts-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save column order to localStorage
  useEffect(() => {
    localStorage.setItem('receipts-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Real-time updates for receipts
  useEffect(() => {
    const channel = supabase
      .channel('receipts-realtime-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'receipts'
      }, () => {
        console.log('Receipt updated');
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
      // Fetch only standalone receipts from receipts table
      const { data: receiptsData, error: receiptsError } = await supabase
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
          user_id,
          payees(payee_name),
          projects(project_number, project_name)
        `)
        .order('captured_at', { ascending: false });

      if (receiptsError) throw receiptsError;

      // Fetch user profiles for receipts
      const userIds = [...new Set((receiptsData || [])
        .filter((r: any) => r.user_id)
        .map((r: any) => r.user_id))];
      
      let profilesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        if (profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap.set(p.id, p.full_name || 'Unknown');
          });
        }
      }

      // Transform standalone receipts
      const standaloneReceipts: UnifiedReceipt[] = (receiptsData || []).map((receipt: any) => ({
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
        user_id: receipt.user_id,
        captured_at: receipt.captured_at,
        submitted_by_name: receipt.user_id ? profilesMap.get(receipt.user_id) : undefined,
      }));

      // Sort by date (most recent first)
      const unified = standaloneReceipts
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
    if (filters.status.length > 0 && !filters.status.includes(receiptStatus)) return false;
    
    // Amount filter - matches formatted currency string or numeric value
    if (filters.amount) {
      const amountStr = filters.amount.toLowerCase();
      const formattedAmount = formatCurrency(r.amount).toLowerCase();
      const numericAmount = r.amount.toString();
      const numericSearch = amountStr.replace(/[^0-9.]/g, '');
      
      if (!formattedAmount.includes(amountStr) && 
          !numericAmount.includes(numericSearch)) {
        return false;
      }
    }
    
    // Payee filter
    if (filters.payeeIds.length > 0 && !filters.payeeIds.includes(r.payee_id)) return false;
    
    // Project filter
    if (filters.projectIds.length > 0 && !filters.projectIds.includes(r.project_id)) return false;
    
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
    pageSize: pageSize,
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      // Only standalone receipts can be deleted (time entry receipts are part of expenses)
      const { error } = await supabase
        .from('receipts')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      toast.success(`${selectedIds.length} ${selectedIds.length === 1 ? 'receipt' : 'receipts'} deleted`);
      setDeleteDialogOpen(false);
      setSelectedIds([]);
      loadReceipts();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete receipts');
    }
  };

  const handleResetFilters = () => {
    setFilters({
      dateFrom: null,
      dateTo: null,
      status: [],
      payeeIds: [],
      projectIds: [],
      amount: null,
    });
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    exportToCSV: () => {
      exportReceiptsToCSV(filteredReceipts);
    },
    getColumnState: () => ({
      visibleColumns,
      columnOrder,
      setVisibleColumns,
      setColumnOrder,
    }),
    refresh: () => {
      loadReceipts();
    },
  }), [filteredReceipts, visibleColumns, columnOrder]);

  if (loading) {
    return <BrandedLoader message="Loading receipts..." />;
  }

  return (
    <div className="space-y-3">

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
      <ReceiptSearchFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        onReset={handleResetFilters}
        resultCount={filteredReceipts.length}
        payees={payees}
        projects={projects}
      />

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
            <Button size="sm" variant="outline" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Single Unified Table */}
      {isMobile && (
        <div className="px-3 py-2 text-xs text-center text-muted-foreground bg-muted/30 border-b">
          ← Swipe to see all columns →
        </div>
      )}
      <div className="overflow-x-auto">
        <div className={isMobile ? "min-w-[900px]" : ""}>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                <Table className="text-xs">
                  <TableHeader className="sticky top-0 bg-muted z-20 border-b">
                  <TableRow className="h-8">
                    <TableHead className="w-10 p-2 text-xs">
                      <Checkbox
                        checked={selectedIds.length === paginatedReceipts.filter(r => r.type === 'standalone').length && paginatedReceipts.filter(r => r.type === 'standalone').length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    {displayColumns.map(colKey => {
                      if (!visibleColumns.includes(colKey)) return null;
                  
                  const widths: Record<string, string> = {
                    preview: 'w-12',
                    type: 'w-24',
                    payee: 'w-40',
                    project: 'w-48',
                    date: 'w-28',
                    amount: 'w-24',
                    status: 'w-24',
                    submitted_at: 'w-36',
                    submitted_by: 'w-32',
                    description: 'max-w-xs',
                    actions: 'w-20'
                  };
                  
                  const alignments: Record<string, string> = {
                    amount: 'text-right',
                    actions: 'text-right'
                  };
                  
                  const labels: Record<string, string> = {
                    preview: 'Preview',
                    type: 'Type',
                    payee: 'Vendor',
                    project: 'Project',
                    date: 'Date',
                    amount: 'Amount',
                    status: 'Status',
                    submitted_at: 'Submitted At',
                    submitted_by: 'Submitted By',
                    description: 'Description',
                    actions: 'Actions'
                  };
                  
                  return (
                    <TableHead 
                      key={colKey} 
                      className={`p-2 text-xs font-medium h-8 ${widths[colKey]} ${alignments[colKey] || ''}`}
                    >
                      {labels[colKey]}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} className="text-center py-6 text-xs text-muted-foreground">
                    No receipts found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReceipts.map((receipt) => (
                  <TableRow key={receipt.id} className="h-9 hover:bg-muted/50 even:bg-muted/20">
                    {/* Selection Checkbox - always visible */}
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

                    {/* Dynamic columns based on columnOrder and visibleColumns */}
                    {displayColumns.map(colKey => {
                      if (!visibleColumns.includes(colKey)) return null;
                      
                      switch (colKey) {
                        case 'preview':
                          return (
                            <TableCell key={colKey} className="p-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleViewReceipt(receipt)}
                              >
                                <Image className="h-3 w-3 text-blue-600" />
                              </Button>
                            </TableCell>
                          );
                        
                        case 'type':
                          return (
                            <TableCell key={colKey} className="p-1.5">
                              <Badge 
                                variant="secondary"
                                className="text-[10px] h-4 px-1.5"
                              >
                                Standalone
                              </Badge>
                            </TableCell>
                          );
                        
                        case 'payee':
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs font-medium">
                              {receipt.payee_name}
                            </TableCell>
                          );
                        
                        case 'project':
                          return (
                            <TableCell key={colKey} className="p-1.5">
                              <div className="text-xs">
                                <div className="font-medium">{receipt.project_number}</div>
                                <div className="text-muted-foreground text-[10px] truncate max-w-[200px]">
                                  {receipt.project_name}
                                </div>
                              </div>
                            </TableCell>
                          );
                        
                        case 'date':
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs">
                              {format(new Date(receipt.date), 'MMM dd, yyyy')}
                            </TableCell>
                          );
                        
                        case 'amount':
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs text-right font-semibold">
                              ${receipt.amount.toFixed(2)}
                            </TableCell>
                          );
                        
                        case 'status':
                          return (
                            <TableCell key={colKey} className="p-1.5">
                              {getStatusBadge(receipt.approval_status)}
                            </TableCell>
                          );
                        
                        case 'submitted_at':
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs">
                              {receipt.submitted_for_approval_at 
                                ? format(new Date(receipt.submitted_for_approval_at), 'MMM dd, HH:mm')
                                : '-'}
                            </TableCell>
                          );
                        
                        case 'submitted_by':
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs">
                              {receipt.submitted_by_name || '-'}
                            </TableCell>
                          );
                        
                        case 'description':
                          return (
                            <TableCell key={colKey} className="p-1.5 text-xs text-muted-foreground">
                              <div className="truncate max-w-[300px]">
                                {receipt.description || '-'}
                              </div>
                            </TableCell>
                          );
                        
                        case 'actions':
                          return (
                            <TableCell key={colKey} className="p-1.5 text-right">
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
                                  
                                  {receipt.type === 'standalone' && (
                                    <DropdownMenuItem onClick={() => setEditingReceipt(receipt)}>
                                      <Edit className="h-3 w-3 mr-2" />
                                      Edit Receipt
                                    </DropdownMenuItem>
                                  )}
                                  
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
              {filteredReceipts.length > 0 && (
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
              <option value="200">200</option>
            </select>
          </div>
          {filteredReceipts.length > pageSize && (
            <CompletePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.goToPage}
            />
          )}
        </div>
      )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      <ReceiptPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        receiptUrl={selectedReceiptUrl}
        timeEntryDetails={previewDetails}
      />

      {/* Edit Receipt Dialog */}
      {editingReceipt && (
        <EditReceiptDialog
          receipt={editingReceipt}
          open={!!editingReceipt}
          onOpenChange={(open) => !open && setEditingReceipt(null)}
          onSaved={() => {
            setEditingReceipt(null);
            loadReceipts();
          }}
        />
      )}

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} {selectedIds.length === 1 ? 'receipt' : 'receipts'}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

ReceiptsManagement.displayName = 'ReceiptsManagement';
