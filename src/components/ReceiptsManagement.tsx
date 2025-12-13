import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { format } from 'date-fns';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { ReceiptPreviewModal } from '@/components/ReceiptPreviewModal';
import { RejectTimeEntryDialog } from '@/components/RejectTimeEntryDialog';
import { EditReceiptDialog } from '@/components/time-tracker/EditReceiptDialog';
import { usePagination } from '@/hooks/usePagination';
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
import { receiptColumnDefinitions } from '@/config/receiptColumns';
import { ReceiptFilters } from '@/components/ReceiptSearchFilters';
import { useReceiptsData, UnifiedReceipt } from '@/hooks/useReceiptsData';
import { useReceiptFiltering } from '@/hooks/useReceiptFiltering';
import { useReceiptSorting } from '@/hooks/useReceiptSorting';
import { useReceiptActions } from '@/hooks/useReceiptActions';
import { useReceiptBulkActions } from '@/hooks/useReceiptBulkActions';
import { ReceiptsTable } from '@/components/receipts/ReceiptsTable';
import { ReceiptsCardView } from '@/components/receipts/ReceiptsCardView';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Download, Trash2 } from 'lucide-react';
import { downloadSingleReceipt } from '@/utils/receiptDownloadUtils';
import { toast } from 'sonner';

export interface ReceiptsManagementRef {
  exportToCSV: () => void;
  getColumnState: () => {
    visibleColumns: string[];
    columnOrder: string[];
    setVisibleColumns: (cols: string[]) => void;
    setColumnOrder: (order: string[]) => void;
  };
  refresh: () => void;
  getStatistics: () => {
    pendingCount: number;
    approvedTodayCount: number;
    rejectedCount: number;
    totalThisWeekCount: number;
  };
  getFilters: () => ReceiptFilters;
  setFilters: (filters: ReceiptFilters) => void;
  getPayees: () => Array<{ id: string; name: string }>;
  getProjects: () => Array<{ id: string; number: string; name: string }>;
  getFilteredCount: () => number;
  resetFilters: () => void;
}

export const ReceiptsManagement = forwardRef<ReceiptsManagementRef>((props, ref) => {
  const isMobile = useIsMobile();
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState<ReceiptFilters>({
    dateFrom: null,
    dateTo: null,
    status: [],
    payeeIds: [],
    projectIds: [],
    amount: null,
  });
  
  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [previewDetails, setPreviewDetails] = useState<any>(null);
  
  // Approval state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [receiptToReject, setReceiptToReject] = useState<string | null>(null);
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  
  // Edit modal state
  const [editingReceipt, setEditingReceipt] = useState<UnifiedReceipt | null>(null);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Use extracted hooks
  const receiptsData = useReceiptsData();
  const { filteredReceipts } = useReceiptFiltering(receiptsData.allReceipts, filters);
  const sorting = useReceiptSorting(filteredReceipts);
  const actions = useReceiptActions({
    loadReceipts: receiptsData.loadReceipts,
    setRejectDialogOpen,
    setReceiptToReject,
  });
  const bulkActions = useReceiptBulkActions({
    selectedIds,
    allReceipts: receiptsData.allReceipts,
    loadReceipts: receiptsData.loadReceipts,
    setSelectedIds,
    setBulkRejectDialogOpen,
    setDeleteDialogOpen,
  });

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('receipts-visible-columns');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default visible columns
    return receiptColumnDefinitions.map(col => col.key);
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

  // Save visibility to localStorage
  useEffect(() => {
    localStorage.setItem('receipts-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save column order to localStorage
  useEffect(() => {
    localStorage.setItem('receipts-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Pagination
  const pagination = usePagination({
    totalItems: filteredReceipts.length,
    pageSize: pageSize,
    initialPage: 1,
  });

  const paginatedReceipts = sorting.sortedReceipts.slice(
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

  const handleReject = (receiptId: string) => {
    setReceiptToReject(receiptId);
    setRejectDialogOpen(true);
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

  const toggleCard = (receiptId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(receiptId)) {
        next.delete(receiptId);
      } else {
        next.add(receiptId);
      }
      return next;
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
      receiptsData.loadReceipts();
    },
    getStatistics: () => receiptsData.statistics,
    getFilters: () => filters,
    setFilters: (newFilters: ReceiptFilters) => setFilters(newFilters),
    getPayees: () => receiptsData.payees,
    getProjects: () => receiptsData.projects,
    getFilteredCount: () => filteredReceipts.length,
    resetFilters: handleResetFilters,
  }), [filteredReceipts, visibleColumns, columnOrder, receiptsData.statistics, receiptsData.payees, receiptsData.projects, filters]);

  if (receiptsData.loading) {
    return <BrandedLoader message="Loading receipts..." />;
  }

  return (
    <>
      {/* Mobile Card View */}
      {isMobile ? (
        <ReceiptsCardView
          receipts={paginatedReceipts}
          selectedIds={selectedIds}
          onSelectOne={handleSelectOne}
          onViewReceipt={handleViewReceipt}
          onApprove={actions.handleApproveReceipt}
          onReject={handleReject}
          onEdit={setEditingReceipt}
          onDelete={actions.handleDeleteReceipt}
          expandedCards={expandedCards}
          onToggleCard={toggleCard}
          loading={receiptsData.loading}
          pageSize={pageSize}
          setPageSize={setPageSize}
          pagination={pagination}
          totalCount={filteredReceipts.length}
          onBulkApprove={bulkActions.handleBulkApprove}
          onBulkReject={() => setBulkRejectDialogOpen(true)}
          onBulkDownload={bulkActions.handleBulkDownloadSelected}
          onBulkDelete={() => setDeleteDialogOpen(true)}
          onClearSelection={() => setSelectedIds([])}
        />
      ) : (
        /* Desktop Table View */
        <div className="space-y-2 w-full max-w-full min-w-0">
          {/* Bulk Actions Bar - Desktop */}
          {selectedIds.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-muted border rounded-md">
              <span className="text-xs font-medium flex-shrink-0">
                {selectedIds.length} {selectedIds.length === 1 ? 'receipt' : 'receipts'} selected
              </span>
              <div className="flex flex-wrap gap-1.5 sm:ml-auto">
                <Button size="sm" variant="default" onClick={bulkActions.handleBulkApprove} className="flex-1 sm:flex-initial">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setBulkRejectDialogOpen(true)} className="flex-1 sm:flex-initial">
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
                <Button size="sm" variant="outline" onClick={bulkActions.handleBulkDownloadSelected} className="flex-1 sm:flex-initial">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteDialogOpen(true)} className="flex-1 sm:flex-initial">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="flex-1 sm:flex-initial">
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          <ReceiptsTable
            receipts={paginatedReceipts}
            visibleColumns={visibleColumns}
            displayColumns={displayColumns}
            sortColumn={sorting.sortColumn}
            sortDirection={sorting.sortDirection}
            selectedIds={selectedIds}
            onSort={sorting.handleSort}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            onViewReceipt={handleViewReceipt}
            onApprove={actions.handleApproveReceipt}
            onReject={handleReject}
            onEdit={setEditingReceipt}
            onDelete={actions.handleDeleteReceipt}
            onDownload={async (receipt) => {
              const filename = `receipt_${receipt.payee_name}_${format(new Date(receipt.date), 'yyyy-MM-dd')}.jpg`;
              try {
                await downloadSingleReceipt(receipt.image_url, filename);
                toast.success('Receipt downloaded');
              } catch (error) {
                toast.error('Failed to download receipt');
              }
            }}
            totalCount={filteredReceipts.length}
            loading={receiptsData.loading}
            pageSize={pageSize}
            setPageSize={setPageSize}
            pagination={pagination}
            renderSortIcon={sorting.renderSortIcon}
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

    {/* Edit Receipt Dialog */}
    {editingReceipt && (
      <EditReceiptDialog
        receipt={editingReceipt}
        open={!!editingReceipt}
        onOpenChange={(open) => !open && setEditingReceipt(null)}
        onSaved={() => {
          setEditingReceipt(null);
          receiptsData.loadReceipts();
        }}
      />
    )}

    {/* Reject Dialog for Single Receipt */}
    <RejectTimeEntryDialog
      open={rejectDialogOpen}
      onOpenChange={setRejectDialogOpen}
      onConfirm={async (reason) => {
        if (receiptToReject) {
          await actions.handleRejectReceipt(receiptToReject, reason);
        }
      }}
      entryCount={1}
    />

    {/* Bulk Reject Dialog */}
    <RejectTimeEntryDialog
      open={bulkRejectDialogOpen}
      onOpenChange={setBulkRejectDialogOpen}
      onConfirm={bulkActions.handleBulkReject}
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
          <AlertDialogAction onClick={bulkActions.handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
});

ReceiptsManagement.displayName = 'ReceiptsManagement';
