import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building, CheckCircle, DollarSign, Zap, User, AlertTriangle, X } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { 
  suggestLineItemAllocation, 
  calculateMatchConfidence,
  LineItemForMatching,
  EnhancedExpense
} from '@/utils/expenseAllocation';
import { ExpenseCategory, EXPENSE_CATEGORY_DISPLAY } from '@/types/expense';
import { ProjectCategory } from '@/types/project';
import { LineItemCategory, CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { format } from 'date-fns';
import { parseDateOnly } from '@/utils/dateUtils';

interface ExpenseAllocationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string | null;
  onSuccess: () => void;
}

export const ExpenseAllocationSheet: React.FC<ExpenseAllocationSheetProps> = ({
  open,
  onOpenChange,
  expenseId,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [expense, setExpense] = useState<any>(null);
  const [lineItems, setLineItems] = useState<LineItemForMatching[]>([]);
  const [suggestedLineItemId, setSuggestedLineItemId] = useState<string | undefined>();
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLineItem, setSelectedLineItem] = useState<LineItemForMatching | null>(null);
  const [currentAllocation, setCurrentAllocation] = useState<{
    id: string;
    lineItem: LineItemForMatching;
    correlationType: string;
  } | null>(null);

  const loadExpenseData = async () => {
    if (!expenseId) return;
    
    setIsLoading(true);
    try {
      // 1. Load the expense
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select(`
          *,
          payees(payee_name),
          projects(project_name, project_number, category)
        `)
        .eq('id', expenseId)
        .single();
      
      if (expenseError) throw expenseError;
      
      // 2. Load line items for this project only
      const projectId = expenseData.project_id;
      
      // Load estimate line items
      const { data: estimates, error: estimatesError } = await supabase
        .from('estimates')
        .select(`
          id,
          estimate_number,
          project_id,
          projects(project_name),
          estimate_line_items(*)
        `)
        .eq('project_id', projectId)
        .eq('is_current_version', true);
      
      if (estimatesError) throw estimatesError;
      
      // Load quotes
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          project_id,
          status,
          projects(project_name),
          payees(payee_name),
          total_amount,
          quote_line_items(
            id,
            estimate_line_item_id,
            category,
            description,
            total_cost,
            quantity,
            cost_per_unit
          )
        `)
        .eq('project_id', projectId);
      
      if (quotesError) throw quotesError;
      
      // Load change orders
      const { data: changeOrders, error: coError } = await supabase
        .from('change_orders')
        .select(`
          id,
          change_order_number,
          project_id,
          status,
          projects(project_name),
          change_order_line_items(*)
        `)
        .eq('project_id', projectId)
        .eq('status', 'approved');
      
      if (coError) throw coError;
      
      // Load existing correlations to calculate allocated amounts
      const { data: correlations } = await supabase
        .from('expense_line_item_correlations')
        .select('*');
      
      // Filter to accepted quotes only
      const acceptedQuotes = quotes?.filter(q => q.status === 'accepted') || [];
      
      // Build a Set of estimate line item IDs that have accepted quotes
      // These estimate lines should NOT be shown because we have actual quoted costs
      const estimateLineItemsWithQuotes = new Set<string>();
      acceptedQuotes.forEach(quote => {
        (quote.quote_line_items || []).forEach((qli: any) => {
          if (qli.estimate_line_item_id) {
            estimateLineItemsWithQuotes.add(qli.estimate_line_item_id);
          }
        });
      });
      
      // Transform to LineItemForMatching format
      // Only include estimate line items that DON'T have accepted quotes
      // If a quote exists, we'll show the quote instead (actual committed cost)
      const estimateLineItems: LineItemForMatching[] = [];
      estimates?.forEach(est => {
        est.estimate_line_items?.forEach((item: any) => {
          if (!estimateLineItemsWithQuotes.has(item.id)) {
            estimateLineItems.push({
              id: item.id,
              type: 'estimate',
              source_id: est.id,
              project_id: est.project_id,
              project_name: est.projects?.project_name || '',
              category: item.category,
              description: item.description,
              total: item.total_cost || (item.cost_per_unit * item.quantity) || 0,
              allocated_amount: 0, // Will calculate below
            });
          }
        });
      });
      
      // Use accepted quotes only (these are the actual committed costs)
      const quoteLineItems: LineItemForMatching[] = acceptedQuotes.flatMap(quote => 
        (quote.quote_line_items || []).map((item: any) => ({
          id: item.id,
          type: 'quote' as const,
          source_id: quote.id,
          project_id: quote.project_id,
          project_name: quote.projects?.project_name || '',
          category: item.category as LineItemCategory,
          description: item.description,
          total: item.total_cost || (item.cost_per_unit * item.quantity) || 0,
          allocated_amount: 0,
          payee_name: quote.payees?.payee_name
        }))
      );
      
      const changeOrderLineItems: LineItemForMatching[] = [];
      changeOrders?.forEach(co => {
        co.change_order_line_items?.forEach((item: any) => {
          changeOrderLineItems.push({
            id: item.id,
            type: 'change_order',
            source_id: co.id,
            project_id: co.project_id,
            project_name: co.projects?.project_name || '',
            category: item.category,
            description: item.description,
            total: item.total_cost || 0,
            allocated_amount: 0,
            change_order_number: co.change_order_number,
            change_order_status: co.status
          });
        });
      });
      
      const allLineItems = [...estimateLineItems, ...quoteLineItems, ...changeOrderLineItems];
      
      // Calculate allocated amounts
      // Get all expense IDs and split IDs from correlations
      const expenseIds = [...new Set(correlations?.filter(c => c.expense_id).map(c => c.expense_id) || [])];
      const splitIds = [...new Set(correlations?.filter(c => c.expense_split_id).map(c => c.expense_split_id) || [])];
      
      // Batch load expenses and splits
      const [expensesResult, splitsResult] = await Promise.all([
        expenseIds.length > 0 
          ? supabase.from('expenses').select('id, amount').in('id', expenseIds)
          : Promise.resolve({ data: [], error: null }),
        splitIds.length > 0
          ? supabase.from('expense_splits').select('id, split_amount').in('id', splitIds)
          : Promise.resolve({ data: [], error: null })
      ]);
      
      const expensesMap = new Map((expensesResult.data || []).map(e => [e.id, e.amount]));
      const splitsMap = new Map((splitsResult.data || []).map(s => [s.id, s.split_amount]));
      
      correlations?.forEach(corr => {
        // Get the expense or split amount
        let allocatedAmount = 0;
        if (corr.expense_id) {
          allocatedAmount = expensesMap.get(corr.expense_id) || 0;
        } else if (corr.expense_split_id) {
          allocatedAmount = splitsMap.get(corr.expense_split_id) || 0;
        }
        
        const lineItem = allLineItems.find(li => 
          li.id === corr.estimate_line_item_id ||
          (corr.quote_id && li.source_id === corr.quote_id) ||
          li.id === corr.change_order_line_item_id
        );
        
        if (lineItem) {
          lineItem.allocated_amount += allocatedAmount;
        }
      });
      
      // Check if this expense is already allocated
      const existingCorrelation = correlations?.find(c => c.expense_id === expenseId);
      
      let matchStatus: 'unallocated' | 'allocated_to_estimate' | 'allocated_to_quote' | 'allocated_to_change_order' = 'unallocated';
      if (existingCorrelation) {
        if (existingCorrelation.estimate_line_item_id) {
          matchStatus = 'allocated_to_estimate';
        } else if (existingCorrelation.quote_id) {
          matchStatus = 'allocated_to_quote';
        } else if (existingCorrelation.change_order_line_item_id) {
          matchStatus = 'allocated_to_change_order';
        }
      }
      
      // Create EnhancedExpense object
      const enhancedExpense: EnhancedExpense = {
        id: expenseData.id,
        amount: expenseData.amount,
        expense_date: parseDateOnly(expenseData.expense_date),
        description: expenseData.description,
        category: expenseData.category as ExpenseCategory,
        payee_id: expenseData.payee_id,
        payee_name: expenseData.payees?.payee_name,
        project_id: expenseData.project_id,
        project_name: expenseData.projects?.project_name,
        project_number: expenseData.projects?.project_number,
        project_category: expenseData.projects?.category as ProjectCategory | undefined,
        match_status: matchStatus,
        is_split: expenseData.is_split || false
      };
      
      if (existingCorrelation) {
        // Find the line item this expense is allocated to
        const allocatedLineItem = allLineItems.find(li => 
          li.id === existingCorrelation.estimate_line_item_id ||
          (existingCorrelation.quote_id && li.source_id === existingCorrelation.quote_id && li.type === 'quote') ||
          li.id === existingCorrelation.change_order_line_item_id
        );
        
        if (allocatedLineItem) {
          setCurrentAllocation({
            id: existingCorrelation.id,
            lineItem: allocatedLineItem,
            correlationType: existingCorrelation.correlation_type
          });
        }
      } else {
        setCurrentAllocation(null);
      }
      
      setLineItems(allLineItems);
      setExpense(enhancedExpense);
      
      // 3. Calculate suggestions
      const suggested = suggestLineItemAllocation(enhancedExpense, allLineItems);
      const confidence = calculateMatchConfidence(enhancedExpense, allLineItems);
      
      setSuggestedLineItemId(suggested);
      setConfidenceScore(confidence);
      
    } catch (error) {
      console.error('Error loading expense data:', error);
      toast({
        title: "Error",
        description: "Failed to load expense data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && expenseId) {
      loadExpenseData();
    }
  }, [open, expenseId]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [open]);

  const handleLineItemClick = (lineItem: LineItemForMatching) => {
    setSelectedLineItem(lineItem);
    // Scroll to bottom to show confirmation bar
    setTimeout(() => {
      const sheetContent = document.querySelector('[data-sheet-content]');
      if (sheetContent) {
        sheetContent.scrollTop = sheetContent.scrollHeight;
      }
    }, 100);
  };

  const handleDeallocate = async () => {
    if (!currentAllocation || !expense || isLoading) return;
    
    setIsLoading(true);
    try {
      // Delete the correlation
      const { error: deleteError } = await supabase
        .from('expense_line_item_correlations')
        .delete()
        .eq('id', currentAllocation.id);
      
      if (deleteError) throw deleteError;
      
      // Update expense to mark as unplanned
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ is_planned: false })
        .eq('id', expense.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Allocation Removed",
        description: `Removed allocation from ${currentAllocation.lineItem.description}`
      });
      
      setCurrentAllocation(null);
      onSuccess();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error removing allocation:', error);
      toast({
        title: "Error",
        description: "Failed to remove allocation.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAllocation = async () => {
    if (!expense || !selectedLineItem || isLoading) return;
    
    setIsLoading(true);
    try {
      // Create correlation
      const correlation = {
        expense_id: expense.id,
        expense_split_id: null,
        estimate_line_item_id: selectedLineItem.type === 'estimate' ? selectedLineItem.id : null,
        quote_id: selectedLineItem.type === 'quote' ? selectedLineItem.source_id : null,
        change_order_line_item_id: selectedLineItem.type === 'change_order' ? selectedLineItem.id : null,
        correlation_type: selectedLineItem.type === 'estimate' ? 'estimated' : 
                         selectedLineItem.type === 'quote' ? 'quoted' : 'change_order',
        auto_correlated: false,
        notes: 'Manually assigned via inline allocation sheet'
      };
      
      const { error: correlationError } = await supabase
        .from('expense_line_item_correlations')
        .insert([correlation]);
      
      if (correlationError) throw correlationError;
      
      // Update expense to mark as planned
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ is_planned: true })
        .eq('id', expense.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Allocation Complete",
        description: `Allocated ${formatCurrency(expense.amount)} to ${selectedLineItem.type} line item.`
      });
      
      setSelectedLineItem(null);
      onSuccess();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error allocating expense:', error);
      toast({
        title: "Error",
        description: "Failed to allocate expense.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[900px] flex flex-col p-0 overflow-hidden">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>
            {currentAllocation ? 'Change Allocation' : 'Match Expense to Line Items'}
          </SheetTitle>
          <SheetDescription>
            {currentAllocation 
              ? 'Currently allocated - you can change or remove this allocation'
              : 'Select a line item to allocate this expense'}
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 px-6 py-4" data-sheet-content>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : expense ? (
            <div className="space-y-4">
              {/* Expense Details */}
              <div className="p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1">
                      {formatCurrency(expense.amount)} • {expense.payee_name || 'No Payee'}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {expense.project_number} • {expense.project_name}
                      </div>
                      <div>{EXPENSE_CATEGORY_DISPLAY[expense.category]} • {format(new Date(expense.expense_date), 'MMM d, yyyy')}</div>
                      {expense.description && <div className="italic">{expense.description}</div>}
                    </div>
                  </div>
                  
                  {confidenceScore > 0 && (
                    <Badge variant="outline" className="ml-2">
                      <Zap className="h-3 w-3 mr-1" />
                      {confidenceScore}% Match
                    </Badge>
                  )}
                </div>
              </div>

              {/* Search */}
              <Input
                placeholder="Search line items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* All Line Items - Unified List */}
              {(() => {
                // Smart filtering and sorting
                const filteredLineItems = (() => {
                  let items = lineItems;
                  
                  // Apply search filter
                  if (searchTerm) {
                    const search = searchTerm.toLowerCase();
                    items = items.filter(li => 
                      li.description.toLowerCase().includes(search) ||
                      li.category.toLowerCase().includes(search) ||
                      li.payee_name?.toLowerCase().includes(search)
                    );
                  }
                  
                  // Smart sorting:
                  // 1. Suggested item first
                  // 2. Same category as expense (if we have expense category)
                  // 3. Quotes/COs with matching payee
                  // 4. Rest by type (quotes, change orders, estimates)
                  return items.sort((a, b) => {
                    // Suggested item goes first
                    if (a.id === suggestedLineItemId) return -1;
                    if (b.id === suggestedLineItemId) return 1;
                    
                    // If we have expense, prioritize matching category
                    if (expense) {
                      const expenseCategory = expense.category;
    const categoryMap: Record<ExpenseCategory, LineItemCategory[]> = {
      [ExpenseCategory.LABOR]: [LineItemCategory.LABOR],
      [ExpenseCategory.SUBCONTRACTOR]: [LineItemCategory.SUBCONTRACTOR],
      [ExpenseCategory.MATERIALS]: [LineItemCategory.MATERIALS],
      [ExpenseCategory.EQUIPMENT]: [LineItemCategory.EQUIPMENT],
      [ExpenseCategory.PERMITS]: [LineItemCategory.PERMITS],
      [ExpenseCategory.MANAGEMENT]: [LineItemCategory.MANAGEMENT],
      [ExpenseCategory.TOOLS]: [LineItemCategory.EQUIPMENT],
      [ExpenseCategory.SOFTWARE]: [LineItemCategory.MANAGEMENT],
      [ExpenseCategory.VEHICLE_MAINTENANCE]: [LineItemCategory.EQUIPMENT],
      [ExpenseCategory.GAS]: [LineItemCategory.EQUIPMENT],
      [ExpenseCategory.MEALS]: [LineItemCategory.MANAGEMENT],
      [ExpenseCategory.OTHER]: [LineItemCategory.OTHER]
    };
                      
                      const matchingCategories = categoryMap[expenseCategory] || [];
                      const aMatches = matchingCategories.includes(a.category);
                      const bMatches = matchingCategories.includes(b.category);
                      
                      if (aMatches && !bMatches) return -1;
                      if (!aMatches && bMatches) return 1;
                    }
                    
                    // Then by type priority (quotes first, then COs, then estimates)
                    const typeOrder = { quote: 0, change_order: 1, estimate: 2 };
                    const aOrder = typeOrder[a.type];
                    const bOrder = typeOrder[b.type];
                    if (aOrder !== bOrder) return aOrder - bOrder;
                    
                    // Finally by description alphabetically
                    return a.description.localeCompare(b.description);
                  });
                })();

                return (
                  <div className="space-y-3">
                    {currentAllocation && (
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                              Currently Allocated To
                            </div>
                            <div className="text-xs text-blue-700 dark:text-blue-300">
                              This expense is already allocated. You can change it by selecting a different line item below, 
                              or remove the allocation entirely.
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-white dark:bg-gray-900 rounded border">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-medium text-sm">{currentAllocation.lineItem.description}</div>
                                <Badge 
                                  variant="secondary" 
                                  className={cn(
                                    "text-[10px] h-4 px-1.5",
                                    currentAllocation.lineItem.type === 'estimate' && "bg-blue-100 text-blue-700",
                                    currentAllocation.lineItem.type === 'quote' && "bg-purple-100 text-purple-700",
                                    currentAllocation.lineItem.type === 'change_order' && "bg-orange-100 text-orange-700"
                                  )}
                                >
                                  {currentAllocation.lineItem.type === 'estimate' ? 'E' : 
                                   currentAllocation.lineItem.type === 'quote' ? 'Q' : 'CO'}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {CATEGORY_DISPLAY_MAP[currentAllocation.lineItem.category]} • {formatCurrency(currentAllocation.lineItem.total)}
                              </div>
                            </div>
                            
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleDeallocate}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                  Removing...
                                </>
                              ) : (
                                <>
                                  <X className="h-3 w-3 mr-1" />
                                  Remove
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <div>
                        <span className="font-medium text-foreground">{filteredLineItems.length}</span> line items
                        {suggestedLineItemId && <span className="ml-2">• ★ = Suggested</span>}
                      </div>
                      <div className="flex gap-2">
                        <span>E=Estimate • Q=Quote • CO=Change Order</span>
                      </div>
                    </div>

                    {filteredLineItems.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-muted-foreground text-sm mb-3">
                          No line items found for this project
                        </div>
                        <div className="text-xs text-muted-foreground mb-4">
                          {searchTerm 
                            ? 'Try adjusting your search terms'
                            : 'Create an estimate, quote, or change order first'}
                        </div>
                        {!searchTerm && expense && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              window.location.href = `/projects/${expense.project_id}`;
                            }}
                          >
                            View Project
                          </Button>
                        )}
                      </div>
                    ) : (
                      <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-1">
                          {filteredLineItems.map(item => {
                            const isSuggested = item.id === suggestedLineItemId;
                            
                            return (
                              <div
                                key={item.id}
                                onClick={() => handleLineItemClick(item)}
                                className={cn(
                                  "relative flex items-center justify-between p-3 border rounded cursor-pointer transition-all",
                                  "hover:border-primary hover:bg-accent/50",
                                  "group",
                                  isSuggested && "border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-950/10",
                                  selectedLineItem?.id === item.id && "border-primary border-2 bg-primary/5"
                                )}
                              >
                                <div className="flex-1 min-w-0 pr-4">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <div className="font-medium text-sm truncate">{item.description}</div>
                                    
                                    <Badge 
                                      variant="secondary" 
                                      className={cn(
                                        "text-[10px] h-4 px-1.5 flex-shrink-0",
                                        item.type === 'estimate' && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                                        item.type === 'quote' && "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                                        item.type === 'change_order' && "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                                      )}
                                    >
                                      {item.type === 'estimate' ? 'E' : item.type === 'quote' ? 'Q' : 'CO'}
                                    </Badge>
                                    
                                    {isSuggested && (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-green-500 text-green-600 flex-shrink-0">
                                        ★ {confidenceScore}%
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                                    <span>{CATEGORY_DISPLAY_MAP[item.category]}</span>
                                    {item.payee_name && (
                                      <>
                                        <span>•</span>
                                        <span className="truncate">{item.payee_name}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 flex-shrink-0">
                                  <div className="text-right">
                                    <div className="text-sm font-semibold">{formatCurrency(item.total)}</div>
                                    {item.allocated_amount > 0 && (
                                      <div className="text-xs text-muted-foreground">
                                        {formatCurrency(item.allocated_amount)} used
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <CheckCircle className="h-4 w-4 text-primary" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Select an expense to allocate
            </div>
          )}
        </ScrollArea>

        {/* Sticky Confirmation Bar */}
        <div className="border-t bg-background">
          {selectedLineItem ? (
            // Confirmation state - show selected item + actions
            <div className="px-6 py-4 space-y-3">
              {/* Selected Line Item Preview */}
              <div className="p-3 bg-primary/5 border border-primary rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">
                      Allocating to:
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-sm truncate">
                        {selectedLineItem.description}
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-[10px] h-4 px-1.5 flex-shrink-0",
                          selectedLineItem.type === 'estimate' && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                          selectedLineItem.type === 'quote' && "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                          selectedLineItem.type === 'change_order' && "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                        )}
                      >
                        {selectedLineItem.type === 'estimate' ? 'E' : 
                         selectedLineItem.type === 'quote' ? 'Q' : 'CO'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {CATEGORY_DISPLAY_MAP[selectedLineItem.category]} • {formatCurrency(selectedLineItem.total)}
                      {selectedLineItem.allocated_amount > 0 && (
                        <> • {formatCurrency(selectedLineItem.allocated_amount)} allocated</>
                      )}
                    </div>
                    
                    {/* Over-allocation warning */}
                    {expense && selectedLineItem.allocated_amount + expense.amount > selectedLineItem.total && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="h-3 w-3" />
                        <span>
                          Will exceed budget by {formatCurrency(
                            (selectedLineItem.allocated_amount + expense.amount) - selectedLineItem.total
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedLineItem(null)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirmAllocation}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Allocating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Allocation
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Default state - just close button
            <div className="px-6 py-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

