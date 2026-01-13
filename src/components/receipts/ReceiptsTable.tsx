import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableRow } from '@/components/ui/table';
import { CompletePagination } from '@/components/ui/complete-pagination';
import { cn, formatCurrency } from '@/lib/utils';
import { UnifiedReceipt } from '@/hooks/useReceiptsData';
import { ReceiptsTableHeader } from './ReceiptsTableHeader';
import { ReceiptsTableRow } from './ReceiptsTableRow';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface ReceiptsTableProps {
  receipts: UnifiedReceipt[];
  visibleColumns: string[];
  displayColumns: string[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  selectedIds: string[];
  onSort: (columnKey: string) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onViewReceipt: (receipt: UnifiedReceipt) => void;
  onApprove: (receiptId: string) => void;
  onReject: (receiptId: string) => void;
  onEdit: (receipt: UnifiedReceipt) => void;
  onDelete: (receiptId: string, receiptType: 'time_entry' | 'standalone') => void;
  onSendToQuickBooks?: (receipt: UnifiedReceipt) => void;
  showQuickBooksOption?: boolean;
  onDownload: (receipt: UnifiedReceipt) => void;
  totalCount: number;
  loading: boolean;
  pageSize: number;
  setPageSize: (size: number) => void;
  pagination: {
    currentPage: number;
    totalPages: number;
    goToPage: (page: number) => void;
  };
  renderSortIcon: (columnKey: string) => React.ReactNode;
}

export const ReceiptsTable: React.FC<ReceiptsTableProps> = ({
  receipts,
  visibleColumns,
  displayColumns,
  sortColumn,
  sortDirection,
  selectedIds,
  onSort,
  onSelectAll,
  onSelectOne,
  onViewReceipt,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onSendToQuickBooks,
  showQuickBooksOption,
  onDownload,
  totalCount,
  loading,
  pageSize,
  setPageSize,
  pagination,
  renderSortIcon,
}) => {
  const standaloneReceipts = receipts.filter(r => r.type === 'standalone');
  const allSelected = selectedIds.length === standaloneReceipts.length && standaloneReceipts.length > 0;

  // Calculate total amount
  const totalAmount = receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);

  return (
    <Card className="overflow-hidden w-full max-w-full">
      <CardContent className="p-0">
        <div className="overflow-auto w-full" style={{ maxHeight: 'calc(100vh - 400px)' }}>
          <Table className="text-xs w-full">
            <ReceiptsTableHeader
              visibleColumns={visibleColumns}
              displayColumns={displayColumns}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
              onSelectAll={onSelectAll}
              allSelected={allSelected}
              renderSortIcon={renderSortIcon}
            />
            <TableBody>
              {receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} className="text-center py-6 text-xs text-muted-foreground">
                    No receipts found
                  </TableCell>
                </TableRow>
              ) : (
                receipts.map((receipt) => (
                  <ReceiptsTableRow
                    key={receipt.id}
                    receipt={receipt}
                    visibleColumns={visibleColumns}
                    displayColumns={displayColumns}
                    selected={selectedIds.includes(receipt.id)}
                    onSelect={(checked) => onSelectOne(receipt.id, checked)}
                    onViewReceipt={onViewReceipt}
                    onApprove={onApprove}
                    onReject={onReject}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onSendToQuickBooks={onSendToQuickBooks}
                    showQuickBooksOption={showQuickBooksOption}
                  />
                ))
              )}
            </TableBody>
            
            {/* Footer with totals */}
            <TableFooter className="border-t bg-muted/30">
              <TableRow>
                {/* Checkbox column - matches header structure */}
                <TableCell className="p-1.5"></TableCell>
                
                {displayColumns.map((colKey) => {
                  if (!visibleColumns.includes(colKey)) return null;
                  
                  const alignments: Record<string, string> = {
                    amount: 'text-right',
                    actions: 'text-right'
                  };
                  
                  const alignmentClass = alignments[colKey] || '';
                  
                  if (colKey === 'project') {
                    return (
                      <TableCell key={colKey} className={cn("p-1.5 font-medium text-xs", alignmentClass)}>
                        Total ({totalCount} {totalCount === 1 ? 'receipt' : 'receipts'}):
                      </TableCell>
                    );
                  } else if (colKey === 'amount') {
                    return (
                      <TableCell key={colKey} className={cn("p-1.5 font-mono font-medium text-xs", alignmentClass)}>
                        {formatCurrency(totalAmount, { showCents: true })}
                      </TableCell>
                    );
                  } else {
                    return <TableCell key={colKey} className={cn("p-1.5", alignmentClass)}></TableCell>;
                  }
                })}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalCount > 0 && (
          <div className="p-3 border-t flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
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
              
              {/* QuickBooks Status Legend */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground border-l pl-4">
                <span className="font-medium">QuickBooks:</span>
                <div className="flex items-center gap-1" title="Synced to QuickBooks">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  <span>Synced</span>
                </div>
                <div className="flex items-center gap-1" title="QuickBooks sync failed">
                  <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                  <span>Failed</span>
                </div>
                <div className="flex items-center gap-1" title="QuickBooks sync pending">
                  <Clock className="h-3.5 w-3.5 text-yellow-600" />
                  <span>Pending</span>
                </div>
              </div>
            </div>
            
            {totalCount > pageSize && (
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
  );
};

