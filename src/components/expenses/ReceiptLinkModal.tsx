import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Search,
  Receipt,
  Building2,
  User,
  CheckCircle2,
  Sparkles,
  X,
  ImageIcon,
  Link2,
} from 'lucide-react';
import {
  ReceiptForLinking,
  fetchReceiptsForLinking,
  calculateMatchScore,
  linkReceiptToExpense,
} from '@/utils/receiptLinking';
import { Expense } from '@/types/expense';

interface ReceiptLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onSuccess: () => void;
}

export const ReceiptLinkModal: React.FC<ReceiptLinkModalProps> = ({
  open,
  onOpenChange,
  expense,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<ReceiptForLinking[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch receipts when modal opens
  useEffect(() => {
    if (open && expense) {
      loadReceipts();
    }
  }, [open, expense]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSelectedReceiptId(null);
      setPreviewUrl(null);
    }
  }, [open]);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const data = await fetchReceiptsForLinking();
      setReceipts(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load receipts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate match scores and sort by relevance
  const scoredReceipts = useMemo(() => {
    if (!expense) return [];

    // Handle both Date and string for expense_date
    const expenseDate = expense.expense_date instanceof Date 
      ? expense.expense_date.toISOString() 
      : expense.expense_date;

    return receipts
      .map((receipt) => {
        const { score, reasons } = calculateMatchScore(receipt, {
          amount: expense.amount,
          expense_date: expenseDate,
          payee_id: expense.payee_id,
          project_id: expense.project_id,
        });
        return {
          ...receipt,
          match_score: score,
          match_reasons: reasons,
        };
      })
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  }, [receipts, expense]);

  // Filter by search query
  const filteredReceipts = useMemo(() => {
    if (!searchQuery.trim()) return scoredReceipts;

    const query = searchQuery.toLowerCase();
    return scoredReceipts.filter(
      (r) =>
        r.payee_name?.toLowerCase().includes(query) ||
        r.project_number?.toLowerCase().includes(query) ||
        r.project_name?.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.amount.toString().includes(query)
    );
  }, [scoredReceipts, searchQuery]);

  // Separate suggested and other receipts
  const suggestedReceipts = filteredReceipts.filter((r) => (r.match_score || 0) >= 40);
  const otherReceipts = filteredReceipts.filter((r) => (r.match_score || 0) < 40);

  const handleLink = async () => {
    if (!expense || !selectedReceiptId) return;

    setLinking(true);
    try {
      await linkReceiptToExpense({
        expenseId: expense.id,
        receiptId: selectedReceiptId,
      });
      toast({
        title: 'Receipt Linked',
        description: 'The receipt has been linked to this expense.',
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to link receipt',
        variant: 'destructive',
      });
    } finally {
      setLinking(false);
    }
  };

  const ReceiptCard = ({ receipt }: { receipt: ReceiptForLinking }) => {
    const isSelected = selectedReceiptId === receipt.id;
    const hasHighScore = (receipt.match_score || 0) >= 40;

    return (
      <div
        className={cn(
          'relative p-3 border rounded-lg cursor-pointer transition-all',
          'hover:border-primary/50 hover:bg-accent/50',
          isSelected && 'border-primary bg-primary/5 ring-2 ring-primary/20',
          hasHighScore && !isSelected && 'border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/20'
        )}
        onClick={() => setSelectedReceiptId(receipt.id)}
      >
        {/* Match badge */}
        {hasHighScore && (
          <Badge
            variant="outline"
            className="absolute -top-2 -right-2 bg-amber-100 text-amber-800 border-amber-300 text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {receipt.match_score}% match
          </Badge>
        )}

        <div className="flex gap-3">
          {/* Thumbnail */}
          <div
            className="w-16 h-16 rounded bg-muted flex-shrink-0 overflow-hidden cursor-zoom-in"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewUrl(receipt.image_url);
            }}
          >
            {receipt.image_url ? (
              <img
                src={receipt.image_url}
                alt="Receipt"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-base">
                {formatCurrency(receipt.amount)}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(receipt.captured_at), 'MMM d, yyyy')}
              </span>
            </div>

            {receipt.payee_name && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{receipt.payee_name}</span>
              </div>
            )}

            {receipt.project_number && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {receipt.project_number}
                  {receipt.project_name && ` - ${receipt.project_name}`}
                </span>
              </div>
            )}

            {/* Match reasons */}
            {receipt.match_reasons && receipt.match_reasons.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {receipt.match_reasons.map((reason, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs py-0">
                    {reason}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
          )}
        </div>
      </div>
    );
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Expense context */}
      {expense && (
        <div className="p-3 bg-muted/50 rounded-lg mb-4 space-y-1">
          <p className="text-sm font-medium">Linking receipt to expense:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {formatCurrency(expense.amount)}
            </span>
            <span>{format(new Date(expense.expense_date), 'MMM d, yyyy')}</span>
            {expense.payee_name && <span>{expense.payee_name}</span>}
            {expense.project_number && <span>{expense.project_number}</span>}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search receipts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Receipt list */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No receipts found</p>
            {searchQuery && (
              <p className="text-sm">Try a different search term</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Suggested section */}
            {suggestedReceipts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Suggested Matches
                </h4>
                <div className="space-y-2">
                  {suggestedReceipts.map((receipt) => (
                    <ReceiptCard key={receipt.id} receipt={receipt} />
                  ))}
                </div>
              </div>
            )}

            {/* Other receipts */}
            {otherReceipts.length > 0 && (
              <div>
                {suggestedReceipts.length > 0 && (
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    All Receipts
                  </h4>
                )}
                <div className="space-y-2">
                  {otherReceipts.map((receipt) => (
                    <ReceiptCard key={receipt.id} receipt={receipt} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Actions - Sticky footer */}
      <div className="flex gap-2 mt-4 pt-4 border-t shrink-0 bg-background">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={!selectedReceiptId || linking}
          onClick={handleLink}
        >
          {linking ? (
            'Linking...'
          ) : (
            <>
              <Link2 className="w-4 h-4 mr-2" />
              Link Receipt
            </>
          )}
        </Button>
      </div>

      {/* Image preview overlay */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={previewUrl}
            alt="Receipt preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );

  // Always use Sheet (slide-out) like ExpenseAllocationSheet
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[600px] flex flex-col p-0 overflow-hidden"
      >
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>Link Receipt</SheetTitle>
          <SheetDescription>
            Select a receipt to link to this expense
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-hidden px-6 py-4">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ReceiptLinkModal;

