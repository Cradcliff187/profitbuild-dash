import React from 'react';
import { format } from 'date-fns';
import { Eye, CheckCircle, XCircle, Edit, Trash2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { CompletePagination } from '@/components/ui/complete-pagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatCurrency, parseLocalDate } from '@/lib/utils';
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
  expandedCards: Set<string>;
  onToggleCard: (receiptId: string) => void;
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

const getStatusBadge = (status: string | null | undefined) => {
  if (!status || status === "pending") {
    return (
      <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-yellow-50 text-yellow-700 border-yellow-300">
        Pending
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-green-50 text-green-700 border-green-300">
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-red-50 text-red-700 border-red-300">
        Rejected
      </Badge>
    );
  }
  return null;
};

const ReceiptsCardViewComponent: React.FC<ReceiptsCardViewProps> = ({
  receipts,
  selectedIds,
  onSelectOne,
  onViewReceipt,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  expandedCards,
  onToggleCard,
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
  return (
    <div className="dense-spacing min-w-0 max-w-full">
      <div className="space-y-2 min-w-0 max-w-full">
        {/* Bulk Actions Bar - Mobile */}
        {selectedIds.length > 0 && (
          <div className="flex flex-col items-stretch gap-2 p-2 bg-muted border rounded-md">
            <span className="text-xs font-medium">
              {selectedIds.length} {selectedIds.length === 1 ? 'receipt' : 'receipts'} selected
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="default" onClick={onBulkApprove} className="flex-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={onBulkReject} className="flex-1">
                <XCircle className="h-3 w-3 mr-1" />
                Reject
              </Button>
              <Button size="sm" variant="outline" onClick={onBulkDownload} className="flex-1">
                <Eye className="h-3 w-3 mr-1" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={onBulkDelete} className="flex-1">
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={onClearSelection} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        )}
        {loading ? (
          <Card>
            <CardContent className="p-4">
              <div className="text-center text-xs text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        ) : receipts.length === 0 ? (
          <Card>
            <CardContent className="p-4">
              <div className="text-center text-xs text-muted-foreground">No receipts found</div>
            </CardContent>
          </Card>
        ) : (
          receipts.map((receipt) => {
            const isExpanded = expandedCards.has(receipt.id);
            return (
              <Card key={receipt.id} className="compact-card border border-primary/10 hover:bg-muted/50 transition-colors min-w-0 max-w-full">
                <CardHeader className="p-3 pb-2 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 min-w-0">
                          <CardTitle className="text-sm font-medium truncate flex-1 min-w-0">{receipt.payee_name}</CardTitle>
                          <div className="flex-shrink-0">
                            {getStatusBadge(receipt.approval_status)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {receipt.project_number === 'SYS-000' ? 'Unassigned' : `${receipt.project_number} • ${receipt.project_name}`}
                        </div>
                      </div>
                      {receipt.type === 'standalone' && (
                        <div>
                          <Checkbox
                            checked={selectedIds.includes(receipt.id)}
                            onCheckedChange={(checked) => onSelectOne(receipt.id, checked as boolean)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-2 min-w-0 max-w-full">
                  {/* Always visible row with key info and chevron */}
                  <div className="flex items-center justify-between px-3 py-2 border-t">
                    <span className="text-sm font-medium">
                      {formatCurrency(receipt.amount)} • {format(parseLocalDate(receipt.date), "MMM dd, yyyy")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCard(receipt.id);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${
                        expandedCards.has(receipt.id) ? 'rotate-180' : ''
                      }`} />
                    </Button>
                  </div>
                  
                  {/* Collapsible content */}
                  <Collapsible open={isExpanded}>
                    <CollapsibleContent className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                      <div className="compact-card-section border border-primary/20 min-w-0">
                        <div className="space-y-2 min-w-0">
                          {/* Receipt Details */}
                          <div className="grid grid-cols-2 gap-2 text-xs min-w-0">
                            {receipt.description && (
                              <div className="col-span-2 min-w-0">
                                <div className="text-muted-foreground">Description</div>
                                <div className="font-medium text-xs break-words">{receipt.description}</div>
                              </div>
                            )}
                            {receipt.submitted_by_name && (
                              <div className="min-w-0">
                                <div className="text-muted-foreground">Submitted By</div>
                                <div className="font-medium break-words">{receipt.submitted_by_name}</div>
                              </div>
                            )}
                            {receipt.submitted_for_approval_at && (
                              <div className="min-w-0">
                                <div className="text-muted-foreground">Submitted At</div>
                                <div className="font-medium text-xs break-words">
                                  {format(new Date(receipt.submitted_for_approval_at), "MMM dd, yyyy HH:mm")}
                                </div>
                              </div>
                            )}
                            {receipt.approved_at && (
                              <div className="min-w-0">
                                <div className="text-muted-foreground">Approved At</div>
                                <div className="font-medium text-xs break-words">
                                  {format(new Date(receipt.approved_at), "MMM dd, yyyy HH:mm")}
                                </div>
                              </div>
                            )}
                            {receipt.rejection_reason && (
                              <div className="col-span-2 min-w-0">
                                <div className="text-muted-foreground">Rejection Reason</div>
                                <div className="font-medium text-xs text-red-600 break-words">{receipt.rejection_reason}</div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-1 pt-2 min-w-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewReceipt(receipt);
                              }}
                              className="flex-1 min-w-[80px] h-btn-compact text-xs border-primary/20 hover:bg-primary/5"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            {(!receipt.approval_status || receipt.approval_status === "pending") && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onApprove(receipt.id);
                                  }}
                                  className="flex-1 min-w-[80px] h-btn-compact text-xs border-primary/20 hover:bg-primary/5"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReject(receipt.id);
                                  }}
                                  className="flex-1 min-w-[80px] h-btn-compact text-xs border-primary/20 hover:bg-primary/5"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {receipt.type === 'standalone' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(receipt);
                                  }}
                                  className="flex-1 min-w-[80px] h-btn-compact text-xs border-primary/20 hover:bg-primary/5"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="flex-1 min-w-[80px] h-btn-compact text-xs border-primary/20 hover:bg-primary/5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this receipt? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => onDelete(receipt.id, receipt.type)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            );
          })
        )}
        
        {/* Mobile Pagination */}
        {totalCount > 0 && (
          <div className="p-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
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
            {totalCount > pageSize && (
              <div className="w-full sm:w-auto flex justify-center sm:justify-end overflow-x-auto">
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
    </div>
  );
};

export const ReceiptsCardView = React.memo(ReceiptsCardViewComponent, (prevProps, nextProps) => {
  const expandedCardsEqual = JSON.stringify(Array.from(prevProps.expandedCards).sort()) === JSON.stringify(Array.from(nextProps.expandedCards).sort());
  return (
    prevProps.receipts.length === nextProps.receipts.length &&
    prevProps.selectedIds.length === nextProps.selectedIds.length &&
    prevProps.loading === nextProps.loading &&
    prevProps.pageSize === nextProps.pageSize &&
    prevProps.totalCount === nextProps.totalCount &&
    prevProps.pagination.currentPage === nextProps.pagination.currentPage &&
    prevProps.pagination.totalPages === nextProps.pagination.totalPages &&
    JSON.stringify(prevProps.selectedIds) === JSON.stringify(nextProps.selectedIds) &&
    expandedCardsEqual
  );
});
