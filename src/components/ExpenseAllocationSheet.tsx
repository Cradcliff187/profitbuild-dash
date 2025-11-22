import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building, Search, CheckCircle, DollarSign, Zap } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { 
  suggestLineItemAllocation, 
  calculateMatchConfidence,
  LineItemForMatching 
} from '@/utils/expenseAllocation';
import { ExpenseCategory, EXPENSE_CATEGORY_DISPLAY } from '@/types/expense';
import { LineItemCategory, CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { format } from 'date-fns';

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
  const [activeTab, setActiveTab] = useState<'estimates' | 'quotes' | 'change_orders'>('estimates');

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
          projects(project_name, project_number)
        `)
        .eq('id', expenseId)
        .single();
      
      if (expenseError) throw expenseError;
      
      const enhancedExpense = {
        ...expenseData,
        payee_name: expenseData.payees?.payee_name,
        project_name: expenseData.projects?.project_name,
        project_number: expenseData.projects?.project_number
      };
      
      setExpense(enhancedExpense);
      
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
          projects(project_name),
          payees(payee_name),
          total_amount
        `)
        .eq('project_id', projectId)
        .eq('status', 'accepted');
      
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
      
      // Transform to LineItemForMatching format
      const estimateLineItems: LineItemForMatching[] = [];
      estimates?.forEach(est => {
        est.estimate_line_items?.forEach((item: any) => {
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
        });
      });
      
      const quoteLineItems: LineItemForMatching[] = quotes?.map(q => ({
        id: q.id,
        type: 'quote',
        source_id: q.id,
        project_id: q.project_id,
        project_name: q.projects?.project_name || '',
        category: 'SUBCONTRACTOR' as LineItemCategory,
        description: `Quote #${q.quote_number}`,
        total: q.total_amount || 0,
        allocated_amount: 0,
        payee_name: q.payees?.payee_name
      })) || [];
      
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
      
      setLineItems(allLineItems);
      
      // 3. Calculate suggestions
      const suggested = suggestLineItemAllocation(enhancedExpense, allLineItems);
      const confidence = calculateMatchConfidence(enhancedExpense, allLineItems);
      
      setSuggestedLineItemId(suggested);
      setConfidenceScore(confidence);
      
      // Auto-select the tab with suggestions
      if (suggested) {
        const suggestedItem = allLineItems.find(li => li.id === suggested);
        if (suggestedItem) {
          setActiveTab(suggestedItem.type === 'estimate' ? 'estimates' : 
                       suggestedItem.type === 'quote' ? 'quotes' : 'change_orders');
        }
      }
      
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

  const handleAllocate = async (lineItem: LineItemForMatching) => {
    if (!expense) return;
    
    setIsLoading(true);
    try {
      // Create correlation
      const correlation = {
        expense_id: expense.id,
        expense_split_id: null,
        estimate_line_item_id: lineItem.type === 'estimate' ? lineItem.id : null,
        quote_id: lineItem.type === 'quote' ? lineItem.source_id : null,
        change_order_line_item_id: lineItem.type === 'change_order' ? lineItem.id : null,
        correlation_type: lineItem.type === 'estimate' ? 'estimated' : 
                         lineItem.type === 'quote' ? 'quoted' : 'change_order',
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
        description: `Allocated ${formatCurrency(expense.amount)} to ${lineItem.type} line item.`
      });
      
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
          <SheetTitle>Match Expense to Line Items</SheetTitle>
          <SheetDescription>
            Select a line item to allocate this expense
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 px-6 py-4">
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

              {/* Suggested Matches */}
              {suggestedLineItemId && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                    <Zap className="h-4 w-4" />
                    Suggested Match ({confidenceScore}% confidence)
                  </div>
                  {(() => {
                    const suggested = lineItems.find(li => li.id === suggestedLineItemId);
                    if (!suggested) return null;
                    
                    return (
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <div className="font-medium">{suggested.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {CATEGORY_DISPLAY_MAP[suggested.category]} • {formatCurrency(suggested.total)}
                            {suggested.allocated_amount > 0 && ` • ${formatCurrency(suggested.allocated_amount)} allocated`}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleAllocate(suggested)}>
                          Allocate Here
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search line items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Tabs for Line Item Types */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="estimates">
                    Estimates ({lineItems.filter(li => li.type === 'estimate').length})
                  </TabsTrigger>
                  <TabsTrigger value="quotes">
                    Quotes ({lineItems.filter(li => li.type === 'quote').length})
                  </TabsTrigger>
                  <TabsTrigger value="change_orders">
                    Change Orders ({lineItems.filter(li => li.type === 'change_order').length})
                  </TabsTrigger>
                </TabsList>

                {/* Filter line items based on search */}
                {(() => {
                  const filtered = lineItems.filter(li => {
                    if (searchTerm) {
                      const search = searchTerm.toLowerCase();
                      return li.description.toLowerCase().includes(search) ||
                             li.category.toLowerCase().includes(search);
                    }
                    return true;
                  });

                  return (
                    <>
                      <TabsContent value="estimates" className="space-y-2 mt-4">
                        {filtered.filter(li => li.type === 'estimate').length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            No estimate line items found
                          </div>
                        ) : (
                          filtered.filter(li => li.type === 'estimate').map(item => (
                            <div
                              key={item.id}
                              className={cn(
                                "p-3 border rounded-lg transition-all hover:border-primary hover:shadow-sm",
                                item.id === suggestedLineItemId && "border-green-500 bg-green-50/50 dark:bg-green-950/10"
                              )}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{item.description}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {CATEGORY_DISPLAY_MAP[item.category]}
                                  </div>
                                </div>
                                <div className="text-right ml-3">
                                  <div className="text-sm font-medium">{formatCurrency(item.total)}</div>
                                  {item.allocated_amount > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatCurrency(item.allocated_amount)} allocated
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleAllocate(item)}
                                disabled={isLoading}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Allocate to This Item
                              </Button>
                            </div>
                          ))
                        )}
                      </TabsContent>

                      <TabsContent value="quotes" className="space-y-2 mt-4">
                        {filtered.filter(li => li.type === 'quote').length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            No quote line items found
                          </div>
                        ) : (
                          filtered.filter(li => li.type === 'quote').map(item => (
                            <div
                              key={item.id}
                              className={cn(
                                "p-3 border rounded-lg transition-all hover:border-primary hover:shadow-sm",
                                item.id === suggestedLineItemId && "border-green-500 bg-green-50/50 dark:bg-green-950/10"
                              )}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{item.description}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {item.payee_name && `${item.payee_name} • `}
                                    {CATEGORY_DISPLAY_MAP[item.category]}
                                  </div>
                                </div>
                                <div className="text-right ml-3">
                                  <div className="text-sm font-medium">{formatCurrency(item.total)}</div>
                                  {item.allocated_amount > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatCurrency(item.allocated_amount)} allocated
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleAllocate(item)}
                                disabled={isLoading}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Allocate to This Item
                              </Button>
                            </div>
                          ))
                        )}
                      </TabsContent>

                      <TabsContent value="change_orders" className="space-y-2 mt-4">
                        {filtered.filter(li => li.type === 'change_order').length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            No change order line items found
                          </div>
                        ) : (
                          filtered.filter(li => li.type === 'change_order').map(item => (
                            <div
                              key={item.id}
                              className={cn(
                                "p-3 border rounded-lg transition-all hover:border-primary hover:shadow-sm",
                                item.id === suggestedLineItemId && "border-green-500 bg-green-50/50 dark:bg-green-950/10"
                              )}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{item.description}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    CO #{item.change_order_number} • {CATEGORY_DISPLAY_MAP[item.category]}
                                    {item.change_order_status && ` • ${item.change_order_status}`}
                                  </div>
                                </div>
                                <div className="text-right ml-3">
                                  <div className="text-sm font-medium">{formatCurrency(item.total)}</div>
                                  {item.allocated_amount > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatCurrency(item.allocated_amount)} allocated
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleAllocate(item)}
                                disabled={isLoading}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Allocate to This Item
                              </Button>
                            </div>
                          ))
                        )}
                      </TabsContent>
                    </>
                  );
                })()}
              </Tabs>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Select an expense to allocate
            </div>
          )}
        </ScrollArea>

        <div className="px-6 py-4 border-t flex space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

