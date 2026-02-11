import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import {
  suggestLineItemAllocation,
  calculateMatchConfidence,
  type LineItemForMatching,
  type EnhancedExpense,
} from '@/utils/expenseAllocation';
import { canCorrelateExpense } from '@/utils/expenseValidation';
import { ExpenseCategory, EXPENSE_CATEGORY_DISPLAY } from '@/types/expense';
import { LineItemCategory, CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { type ProjectCategory } from '@/types/project';
import { format } from 'date-fns';
import { parseDateOnly } from '@/utils/dateUtils';

interface BulkExpenseAllocationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface BulkSuggestion {
  expense: EnhancedExpense;
  lineItem: LineItemForMatching;
  confidence: number;
  selected: boolean;
}

export const BulkExpenseAllocationSheet: React.FC<BulkExpenseAllocationSheetProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [suggestions, setSuggestions] = useState<BulkSuggestion[]>([]);

  const allSelected = suggestions.length > 0 && suggestions.every(s => s.selected);
  const someSelected = suggestions.some(s => s.selected) && !allSelected;
  const selectedCount = suggestions.filter(s => s.selected).length;

  useEffect(() => {
    if (open) {
      loadBulkData();
    } else {
      setSuggestions([]);
    }
  }, [open]);

  const loadBulkData = async () => {
    setIsLoading(true);
    try {
      // Step 1: Parallel Supabase queries
      const [
        expensesResult,
        estimatesResult,
        quotesResult,
        changeOrdersResult,
        correlationsResult,
      ] = await Promise.all([
        supabase.from('expenses').select(`
          *,
          payees(payee_name),
          projects(project_name, project_number, category)
        `),
        supabase.from('estimates').select(`
          id, project_id,
          projects(project_name),
          estimate_line_items(*)
        `).eq('is_current_version', true),
        supabase.from('quotes').select(`
          id, project_id, status,
          projects(project_name),
          payees(payee_name),
          quote_line_items(
            id, estimate_line_item_id, category, description,
            total_cost, quantity, cost_per_unit
          )
        `).eq('status', 'accepted'),
        supabase.from('change_orders').select(`
          id, change_order_number, status, project_id,
          projects(project_name),
          change_order_line_items(
            id, category, description, total_cost
          )
        `).eq('status', 'approved'),
        supabase.from('expense_line_item_correlations').select('expense_id'),
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (estimatesResult.error) throw estimatesResult.error;
      if (quotesResult.error) throw quotesResult.error;
      if (changeOrdersResult.error) throw changeOrdersResult.error;

      const expenses = expensesResult.data || [];
      const estimates = estimatesResult.data || [];
      const acceptedQuotes = quotesResult.data || [];
      const changeOrders = changeOrdersResult.data || [];
      const existingCorrelationExpenseIds = new Set(
        (correlationsResult.data || []).map(c => c.expense_id).filter(Boolean)
      );

      // Step 2: Build LineItemForMatching[]
      // Build set of estimate line item IDs that have accepted quote line items
      const estimateLineItemsWithQuotes = new Set<string>();
      acceptedQuotes.forEach(quote => {
        (quote.quote_line_items || []).forEach((qli: any) => {
          if (qli.estimate_line_item_id) {
            estimateLineItemsWithQuotes.add(qli.estimate_line_item_id);
          }
        });
      });

      // Estimate line items (excluding those with accepted quotes)
      const estimateLineItems: LineItemForMatching[] = [];
      estimates.forEach(est => {
        (est.estimate_line_items || []).forEach((item: any) => {
          if (!estimateLineItemsWithQuotes.has(item.id)) {
            estimateLineItems.push({
              id: item.id,
              type: 'estimate',
              source_id: est.id,
              project_id: est.project_id,
              project_name: (est as any).projects?.project_name || '',
              category: item.category,
              description: item.description,
              total: item.total_cost || (item.cost_per_unit * item.quantity) || 0,
              allocated_amount: 0,
            });
          }
        });
      });

      // Quote line items (from accepted quotes)
      const quoteLineItems: LineItemForMatching[] = acceptedQuotes.flatMap(quote =>
        (quote.quote_line_items || []).map((item: any) => ({
          id: item.id,
          type: 'quote' as const,
          source_id: quote.id,
          project_id: quote.project_id,
          project_name: (quote as any).projects?.project_name || '',
          category: item.category as LineItemCategory,
          description: item.description,
          total: item.total_cost || (item.cost_per_unit * item.quantity) || 0,
          allocated_amount: 0,
          payee_name: (quote as any).payees?.payee_name,
        }))
      );

      // Change order line items
      const changeOrderLineItems: LineItemForMatching[] = [];
      changeOrders.forEach(co => {
        (co.change_order_line_items || []).forEach((item: any) => {
          changeOrderLineItems.push({
            id: item.id,
            type: 'change_order',
            source_id: co.id,
            project_id: co.project_id,
            project_name: (co as any).projects?.project_name || '',
            category: item.category,
            description: item.description,
            total: item.total_cost || 0,
            allocated_amount: 0,
            change_order_number: co.change_order_number,
            change_order_status: co.status,
          });
        });
      });

      const allLineItems = [...estimateLineItems, ...quoteLineItems, ...changeOrderLineItems];

      // Step 3: Filter expenses and run matching
      const bulkSuggestions: BulkSuggestion[] = [];

      for (const expense of expenses) {
        // Skip split parents
        if (expense.is_split) continue;

        // Skip already-allocated expenses
        if (existingCorrelationExpenseIds.has(expense.id)) continue;

        // Validate expense can be correlated
        const validation = canCorrelateExpense({
          is_split: expense.is_split || false,
          project_id: expense.project_id,
          project_number: (expense as any).projects?.project_number,
          category: (expense as any).projects?.category as ProjectCategory | undefined,
        });
        if (!validation.isValid) continue;

        // Build EnhancedExpense
        const enhanced: EnhancedExpense = {
          id: expense.id,
          amount: expense.amount,
          expense_date: parseDateOnly(expense.expense_date),
          description: expense.description || undefined,
          category: expense.category as ExpenseCategory,
          payee_id: expense.payee_id || undefined,
          payee_name: (expense as any).payees?.payee_name,
          project_id: expense.project_id,
          project_name: (expense as any).projects?.project_name,
          project_number: (expense as any).projects?.project_number,
          project_category: (expense as any).projects?.category as ProjectCategory | undefined,
          match_status: 'unallocated',
          is_split: expense.is_split || false,
        };

        // Run suggestion and confidence
        const suggestedId = suggestLineItemAllocation(enhanced, allLineItems);
        const confidence = calculateMatchConfidence(enhanced, allLineItems);

        if (suggestedId && confidence > 0) {
          const lineItem = allLineItems.find(li => li.id === suggestedId);
          if (lineItem) {
            bulkSuggestions.push({
              expense: enhanced,
              lineItem,
              confidence,
              selected: confidence >= 75,
            });
          }
        }
      }

      // Sort by confidence descending
      bulkSuggestions.sort((a, b) => b.confidence - a.confidence);
      setSuggestions(bulkSuggestions);
    } catch (error) {
      console.error('[BulkAllocate] Error loading data:', error);
      toast.error('Failed to load expense data for bulk allocation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRow = (index: number) => {
    setSuggestions(prev => prev.map((s, i) =>
      i === index ? { ...s, selected: !s.selected } : s
    ));
  };

  const handleSelectAll = () => {
    const newVal = !allSelected;
    setSuggestions(prev => prev.map(s => ({ ...s, selected: newVal })));
  };

  const handleBulkAllocate = async () => {
    const selected = suggestions.filter(s => s.selected);
    if (selected.length === 0) return;

    setIsAllocating(true);
    try {
      // Build correlation records
      const correlations = selected.map(({ expense, lineItem, confidence }) => ({
        expense_id: expense.id,
        expense_split_id: null,
        estimate_line_item_id: lineItem.type === 'estimate' ? lineItem.id : null,
        quote_id: lineItem.type === 'quote' ? lineItem.source_id : null,
        change_order_line_item_id: lineItem.type === 'change_order' ? lineItem.id : null,
        correlation_type: lineItem.type === 'estimate' ? 'estimated'
          : lineItem.type === 'quote' ? 'quoted'
          : 'change_order',
        auto_correlated: true,
        confidence_score: confidence,
        notes: 'Bulk allocated via Bulk Expense Allocation',
      }));

      const { error: correlationError } = await supabase
        .from('expense_line_item_correlations')
        .insert(correlations);

      if (correlationError) throw correlationError;

      // Mark expenses as planned
      const expenseIds = selected.map(s => s.expense.id);
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ is_planned: true })
        .in('id', expenseIds);

      if (updateError) throw updateError;

      toast.success('Bulk Allocation Complete', {
        description: `Successfully allocated ${selected.length} expense${selected.length === 1 ? '' : 's'} to line items.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('[BulkAllocate] Error:', error);
      toast.error('Bulk Allocation Failed', {
        description: 'Some allocations may have failed. Please check and retry.',
      });
    } finally {
      setIsAllocating(false);
    }
  };

  const getCategoryBadgeVariant = (category: ExpenseCategory): "default" | "secondary" | "outline" => {
    switch (category) {
      case ExpenseCategory.LABOR:
        return "default";
      case ExpenseCategory.SUBCONTRACTOR:
        return "secondary";
      case ExpenseCategory.MATERIALS:
        return "outline";
      case ExpenseCategory.EQUIPMENT:
        return "default";
      case ExpenseCategory.PERMITS:
        return "secondary";
      case ExpenseCategory.MANAGEMENT:
        return "outline";
      default:
        return "secondary";
    }
  };

  const getConfidenceBadgeClass = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-100 text-green-800 hover:bg-green-100';
    if (confidence >= 75) return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
  };

  const getSourceBadgeClass = (type: string) => {
    if (type === 'estimate') return 'bg-blue-50 text-blue-700 hover:bg-blue-50';
    if (type === 'quote') return 'bg-purple-50 text-purple-700 hover:bg-purple-50';
    return 'bg-orange-50 text-orange-700 hover:bg-orange-50';
  };

  const getSourceLabel = (type: string) => {
    if (type === 'estimate') return 'Estimate';
    if (type === 'quote') return 'Quote';
    return 'Change Order';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[900px] flex flex-col p-0 overflow-hidden">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>Bulk Expense Allocation</SheetTitle>
          <SheetDescription>
            {isLoading
              ? 'Analyzing expenses and finding matches...'
              : suggestions.length === 0
                ? 'No suggestions found'
                : `${suggestions.length} unallocated expense${suggestions.length === 1 ? '' : 's'} with suggested matches`
            }
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <BrandedLoader message="Analyzing expenses..." size="md" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                All Caught Up
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                All construction project expenses are either already allocated or
                no matching line items were found. Create estimates, quotes, or
                change orders to enable matching.
              </p>
            </div>
          ) : (
            <div className="px-2 py-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px] px-3">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Expense</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Suggested Line Item</TableHead>
                    <TableHead className="w-[100px] text-right">Est. Cost</TableHead>
                    <TableHead className="w-[90px] text-center">Confidence</TableHead>
                    <TableHead className="w-[90px] text-center">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map((suggestion, index) => (
                    <TableRow
                      key={suggestion.expense.id}
                      className={cn(
                        'cursor-pointer',
                        suggestion.selected && 'bg-muted/50'
                      )}
                      onClick={() => handleToggleRow(index)}
                    >
                      <TableCell className="px-3 align-middle" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={suggestion.selected}
                          onCheckedChange={() => handleToggleRow(index)}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-0.5">
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(suggestion.expense.expense_date), 'MMM d, yyyy')}
                          </div>
                          <div className="font-medium text-sm">
                            {suggestion.expense.payee_name || 'No Payee'}
                          </div>
                          <div className="text-sm font-semibold tabular-nums">
                            {formatCurrency(suggestion.expense.amount)}
                          </div>
                          <Badge variant={getCategoryBadgeVariant(suggestion.expense.category)} className="text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap">
                            {EXPENSE_CATEGORY_DISPLAY[suggestion.expense.category] || suggestion.expense.category}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-xs">
                          <span className="font-medium">{suggestion.expense.project_number}</span>
                          <br />
                          <span className="text-muted-foreground">{suggestion.expense.project_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium">
                            {CATEGORY_DISPLAY_MAP[suggestion.lineItem.category as LineItemCategory] || suggestion.lineItem.category}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {suggestion.lineItem.description}
                          </div>
                          {suggestion.lineItem.payee_name && (
                            <div className="text-xs text-muted-foreground italic">
                              {suggestion.lineItem.payee_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="text-sm font-medium tabular-nums">
                          {formatCurrency(suggestion.lineItem.total)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap', getConfidenceBadgeClass(suggestion.confidence))}>
                          {suggestion.confidence}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 leading-none whitespace-nowrap', getSourceBadgeClass(suggestion.lineItem.type))}>
                          {getSourceLabel(suggestion.lineItem.type)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ScrollArea>

        {suggestions.length > 0 && (
          <div className="border-t bg-background px-6 py-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedCount} of {suggestions.length} selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAllocating}>
                  Cancel
                </Button>
                <Button onClick={handleBulkAllocate} disabled={selectedCount === 0 || isAllocating}>
                  {isAllocating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Allocating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Allocate Selected ({selectedCount})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
