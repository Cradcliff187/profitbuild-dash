import React from 'react';
import { format } from 'date-fns';
import { Image as ImageIcon, Edit, CheckCircle, XCircle, Download, Trash2, MoreHorizontal, Send, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UnifiedReceipt } from '@/hooks/useReceiptsData';
import { downloadSingleReceipt } from '@/utils/receiptDownloadUtils';
import { toast } from 'sonner';

interface ReceiptsTableRowProps {
  receipt: UnifiedReceipt;
  visibleColumns: string[];
  displayColumns: string[];
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onViewReceipt: (receipt: UnifiedReceipt) => void;
  onApprove: (receiptId: string) => void;
  onReject: (receiptId: string) => void;
  onEdit: (receipt: UnifiedReceipt) => void;
  onDelete: (receiptId: string, receiptType: 'time_entry' | 'standalone') => void;
  onSendToQuickBooks?: (receipt: UnifiedReceipt) => void;
  showQuickBooksOption?: boolean;
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

const ReceiptsTableRowComponent: React.FC<ReceiptsTableRowProps> = ({
  receipt,
  visibleColumns,
  displayColumns,
  selected,
  onSelect,
  onViewReceipt,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onSendToQuickBooks,
  showQuickBooksOption,
}) => {
  return (
    <TableRow className="h-9 hover:bg-muted/50 even:bg-muted/20">
      {/* Selection Checkbox - always visible */}
      <TableCell className="p-1.5">
        {receipt.type === 'standalone' ? (
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
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
                  onClick={() => onViewReceipt(receipt)}
                >
                  <ImageIcon className="h-3 w-3 text-blue-600" />
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
                  {receipt.project_number === 'SYS-000' ? (
                    <div className="font-medium text-muted-foreground">Unassigned</div>
                  ) : (
                    <>
                      <div className="font-medium">{receipt.project_number}</div>
                      <div className="text-muted-foreground text-[10px] truncate max-w-[200px]">
                        {receipt.project_name}
                      </div>
                    </>
                  )}
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
                <div className="flex items-center gap-1.5">
                  {getStatusBadge(receipt.approval_status)}
                  {receipt.quickbooks_sync_status === 'success' && (
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" title="Synced to QuickBooks" />
                  )}
                  {receipt.quickbooks_sync_status === 'failed' && (
                    <AlertCircle className="h-3.5 w-3.5 text-red-600" title="QuickBooks sync failed" />
                  )}
                  {receipt.quickbooks_sync_status === 'pending' && (
                    <Clock className="h-3.5 w-3.5 text-yellow-600" title="QuickBooks sync pending" />
                  )}
                </div>
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
                    <DropdownMenuItem onClick={() => onViewReceipt(receipt)}>
                      <ImageIcon className="h-3 w-3 mr-2" />
                      View Receipt
                    </DropdownMenuItem>
                    
                    {receipt.type === 'standalone' && (
                      <DropdownMenuItem onClick={() => onEdit(receipt)}>
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
                    
                    {showQuickBooksOption && receipt.type === 'standalone' && receipt.approval_status === 'approved' && onSendToQuickBooks && (
                      <>
                        <DropdownMenuSeparator />
                        {/* If already synced successfully - show disabled/grayed out option */}
                        {receipt.quickbooks_sync_status === 'success' ? (
                          <DropdownMenuItem disabled className="text-muted-foreground cursor-not-allowed">
                            <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                            Synced to QuickBooks
                          </DropdownMenuItem>
                        ) : receipt.quickbooks_sync_status === 'failed' ? (
                          /* If failed - allow retry with amber/warning color */
                          <DropdownMenuItem onClick={() => onSendToQuickBooks(receipt)}>
                            <Send className="h-3 w-3 mr-2 text-amber-600" />
                            Retry QuickBooks Sync
                          </DropdownMenuItem>
                        ) : (
                          /* Default - not synced yet */
                          <DropdownMenuItem onClick={() => onSendToQuickBooks(receipt)}>
                            <Send className="h-3 w-3 mr-2 text-blue-600" />
                            Send to QuickBooks
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    
                    {receipt.type === 'standalone' && (!receipt.approval_status || receipt.approval_status === 'pending') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onApprove(receipt.id)}>
                          <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onReject(receipt.id)}>
                          <XCircle className="h-3 w-3 mr-2 text-red-600" />
                          Reject
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {receipt.type === 'standalone' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDelete(receipt.id, receipt.type)}
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
  );
};

export const ReceiptsTableRow = React.memo(ReceiptsTableRowComponent, (prevProps, nextProps) => {
  return (
    prevProps.receipt.id === nextProps.receipt.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.visibleColumns.length === nextProps.visibleColumns.length &&
    prevProps.displayColumns.length === nextProps.displayColumns.length &&
    JSON.stringify(prevProps.visibleColumns) === JSON.stringify(nextProps.visibleColumns) &&
    JSON.stringify(prevProps.displayColumns) === JSON.stringify(nextProps.displayColumns)
  );
});

