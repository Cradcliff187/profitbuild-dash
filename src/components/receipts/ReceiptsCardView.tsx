/**
 * Receipts on a phone (admin / manager, /time-entries → Receipts).
 *
 * Dense rows under a date header: thumbnail, vendor, amount, project and who
 * submitted it are all visible without a tap. Tapping a row opens the photo;
 * a pending row carries its own Approve / Reject; Edit and Delete sit in the
 * row's overflow menu.
 */
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Edit, Trash2, Download, MoreVertical, Receipt, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CompletePagination } from '@/components/ui/complete-pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatCurrency, parseLocalDate } from '@/lib/utils';
import { UnifiedReceipt } from '@/hooks/useReceiptsData';

interface ReceiptsCardViewProps {
  receipts: UnifiedReceipt[];
  selectedIds: string[];
  onSelectOne: (id: string, checked: boolean) => void;
  onViewReceipt: (receipt: UnifiedReceipt) => void;
  onApprove: (receiptId: string) => void;
  onReject: (receiptId: string) => void;
  onEdit: (receipt: UnifiedReceipt) => void;
  onDelete: (receiptId: string, receiptType: 'time_entry' | 'standalone') => void;
  loading: boolean;
  pageSize: number;
  setPageSize: (size: number) => void;
  pagination: {
    currentPage: number;
    totalPages: number;
    goToPage: (page: number) => void;
  };
  totalCount: number;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onBulkDownload: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

const STATUS_STYLE = {
  pending: { label: 'Pending', className: 'bg-warning-bg text-warning-fg' },
  approved: { label: 'Approved', className: 'bg-success/10 text-success' },
  rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive' },
} as const;

const statusOf = (receipt: UnifiedReceipt): keyof typeof STATUS_STYLE =>
  receipt.approval_status === 'approved' || receipt.approval_status === 'rejected'
    ? receipt.approval_status
    : 'pending';

const dayKey = (receipt: UnifiedReceipt) => format(parseLocalDate(receipt.date), 'yyyy-MM-dd');

const ReceiptsCardViewComponent: React.FC<ReceiptsCardViewProps> = ({
  receipts,
  selectedIds,
  onSelectOne,
  onViewReceipt,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  loading,
  pageSize,
  setPageSize,
  pagination,
  totalCount,
  onBulkApprove,
  onBulkReject,
  onBulkDownload,
  onBulkDelete,
  onClearSelection,
}) => {
  // Group consecutive rows that share a date (the list arrives sorted).
  const groups = useMemo(() => {
    const out: { key: string; receipts: UnifiedReceipt[]; total: number }[] = [];
    for (const receipt of receipts) {
      const key = dayKey(receipt);
      const last = out[out.length - 1];
      if (last && last.key === key) {
        last.receipts.push(receipt);
        last.total += receipt.amount || 0;
      } else {
        out.push({ key, receipts: [receipt], total: receipt.amount || 0 });
      }
    }
    return out;
  }, [receipts]);

  return (
    <div className="min-w-0 max-w-full space-y-4">
      {selectedIds.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
            <Button size="sm" variant="ghost" className="h-9" onClick={onClearSelection}>
              Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={onBulkApprove} className="h-11 flex-1">
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Approve
            </Button>
            <Button variant="outline" onClick={onBulkReject} className="h-11 flex-1">
              <XCircle className="mr-1.5 h-4 w-4" />
              Reject
            </Button>
            <Button variant="outline" onClick={onBulkDownload} className="h-11 px-3" aria-label="Download selected">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onBulkDelete} className="h-11 px-3" aria-label="Delete selected">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {loading || receipts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Receipt className="mx-auto mb-2 h-10 w-10 opacity-50" />
            <p className="text-sm font-medium">{loading ? 'Loading receipts…' : 'No receipts found'}</p>
            {!loading && <p className="mt-1 text-xs">Try clearing a filter.</p>}
          </CardContent>
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.key}>
            <div className="mb-1.5 flex items-baseline justify-between px-1">
              <h3 className="text-sm font-semibold">{format(parseLocalDate(group.key), 'EEE, MMM d')}</h3>
              <span className="text-xs tabular-nums text-muted-foreground">
                {group.receipts.length} {group.receipts.length === 1 ? 'receipt' : 'receipts'} · {formatCurrency(group.total)}
              </span>
            </div>
            <ul className="divide-y overflow-hidden rounded-lg border bg-card">
              {group.receipts.map((receipt) => {
                const status = statusOf(receipt);
                const selectable = receipt.type === 'standalone';
                const selected = selectedIds.includes(receipt.id);
                return (
                  <li key={receipt.id} className={cn(selected && 'bg-primary/5')}>
                    <div className="flex items-stretch">
                      {selectable && (
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          aria-label={`Select ${receipt.payee_name}`}
                          onClick={() => onSelectOne(receipt.id, !selected)}
                          className="flex w-10 shrink-0 items-center justify-center focus-visible:bg-muted focus-visible:outline-none"
                        >
                          <span
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded border-2',
                              selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                            )}
                          >
                            {selected && <Check className="h-3.5 w-3.5" />}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onViewReceipt(receipt)}
                        className={cn(
                          'flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left focus-visible:bg-muted focus-visible:outline-none',
                          !selectable && 'pl-3'
                        )}
                      >
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                          {receipt.image_url ? (
                            <img
                              src={receipt.image_url}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Receipt className="h-5 w-5 text-muted-foreground" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{receipt.payee_name}</span>
                          <span className="block line-clamp-2 text-xs text-muted-foreground">
                            {receipt.project_number === 'SYS-000'
                              ? 'Unassigned'
                              : `${receipt.project_number} · ${receipt.project_name}`}
                          </span>
                          <span className="mt-0.5 flex items-center gap-2">
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                STATUS_STYLE[status].className
                              )}
                            >
                              {STATUS_STYLE[status].label}
                            </span>
                            {receipt.submitted_by_name && (
                              <span className="truncate text-xs text-muted-foreground">
                                {receipt.submitted_by_name}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 self-start pt-0.5 text-base font-bold tabular-nums leading-tight">
                          {formatCurrency(receipt.amount)}
                        </span>
                      </button>
                      {selectable ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`More actions for ${receipt.payee_name}`}
                              className="flex w-11 shrink-0 items-center justify-center text-muted-foreground focus-visible:bg-muted focus-visible:outline-none"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="min-h-[44px]" onClick={() => onEdit(receipt)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="min-h-[44px] text-destructive focus:text-destructive"
                              onClick={() => onDelete(receipt.id, receipt.type)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="w-3 shrink-0" aria-hidden />
                      )}
                    </div>
                    {receipt.description && (
                      <p className="line-clamp-2 px-3 pb-2 text-xs italic text-muted-foreground">{receipt.description}</p>
                    )}
                    {status === 'rejected' && receipt.rejection_reason && (
                      <p className="px-3 pb-2 text-xs text-destructive">Rejected: {receipt.rejection_reason}</p>
                    )}
                    {status === 'pending' && (
                      <div className="flex gap-2 px-3 pb-2.5">
                        <Button size="sm" className="h-10 flex-1" onClick={() => onApprove(receipt.id)}>
                          <CheckCircle className="mr-1.5 h-4 w-4" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-10 flex-1" onClick={() => onReject(receipt.id)}>
                          <XCircle className="mr-1.5 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {totalCount > 0 && (
        <div className="flex flex-col items-stretch gap-3 border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                pagination.goToPage(1);
              }}
              className="h-10 rounded-md border bg-background px-2"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
          {totalCount > pageSize && (
            <div className="flex w-full justify-center overflow-x-auto">
              <CompletePagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={pagination.goToPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ReceiptsCardView = React.memo(ReceiptsCardViewComponent, (prevProps, nextProps) => {
  return (
    prevProps.receipts === nextProps.receipts &&
    prevProps.selectedIds === nextProps.selectedIds &&
    prevProps.loading === nextProps.loading &&
    prevProps.pageSize === nextProps.pageSize &&
    prevProps.totalCount === nextProps.totalCount &&
    prevProps.pagination.currentPage === nextProps.pagination.currentPage &&
    prevProps.pagination.totalPages === nextProps.pagination.totalPages
  );
});
