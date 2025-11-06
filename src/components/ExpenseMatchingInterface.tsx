import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Zap,
  DollarSign,
  Calendar,
  User,
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExpenseCategory, EXPENSE_CATEGORY_DISPLAY } from '@/types/expense';
import { LineItemCategory, CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { format } from 'date-fns';
import { cn, formatCurrency, getExpensePayeeLabel } from '@/lib/utils';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { fuzzyMatchPayee, type PartialPayee } from '@/utils/fuzzyPayeeMatcher';

interface ExpenseAllocationInterfaceProps {
  projectId: string;
  onAllocationComplete: () => void;
}

// Create a unified category type for matching
type UnifiedCategory = ExpenseCategory | LineItemCategory;

interface UnallocatedExpense {
  id: string;
  amount: number;
  expense_date: Date;
  description?: string;
  category: ExpenseCategory;
  payee_id?: string;
  payee_name?: string;
  suggested_line_item_id?: string;
  confidence_score?: number;
}

interface LineItemWithExpenses {
  id: string;
  type: 'estimate' | 'quote';
  source_id: string;
  category: LineItemCategory;
  description: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
  costPerUnit: number;
  totalCost: number;
  totalMarkup: number;
  allocated_expenses: UnallocatedExpense[];
  allocated_amount: number;
  payee_name?: string;
  quote_number?: string;
}

export const ExpenseAllocationInterface: React.FC<ExpenseAllocationInterfaceProps> = ({
  projectId,
  onAllocationComplete
}) => {
  const [unallocatedExpenses, setUnallocatedExpenses] = useState<UnallocatedExpense[]>([]);
  const [lineItems, setLineItems] = useState<LineItemWithExpenses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [showAutoAllocateDialog, setShowAutoAllocateDialog] = useState(false);
  const [previewAllocations, setPreviewAllocations] = useState<Array<{
    expense: UnallocatedExpense;
    lineItem: LineItemWithExpenses;
    confidence: number;
  }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAllocationData();
  }, [projectId]); // Include projectId in dependencies but handle null case

  const loadAllocationData = async () => {
    setIsLoading(true);
    try {
      // Load expenses, estimates, and accepted quotes
      const [expensesResult, estimatesResult, quotesResult] = await Promise.all([
        supabase
          .from('expenses')
          .select(`
            *,
            payees (payee_name)
          `)
          .eq('project_id', projectId),
        supabase
          .from('estimates')
          .select(`
            id,
            estimate_line_items (*)
          `)
          .eq('project_id', projectId)
          .eq('is_current_version', true)
          .maybeSingle(),
        supabase
          .from('quotes')
          .select(`
            id,
            quote_number,
            status,
            payees (payee_name),
            quote_line_items (*)
          `)
          .eq('project_id', projectId)
          .eq('status', 'accepted')
      ]);

      const expenses = (expensesResult.data || []).map(exp => ({
        id: exp.id,
        amount: exp.amount,
        expense_date: new Date(exp.expense_date),
        description: exp.description,
        category: exp.category as ExpenseCategory,
        payee_id: exp.payee_id,
        payee_name: exp.payees?.payee_name
      }));

      // Process estimate line items
      const estimateLineItems = (estimatesResult.data?.estimate_line_items || []).map(item => ({
        id: item.id,
        type: 'estimate' as const,
        source_id: estimatesResult.data?.id || '',
        category: item.category as LineItemCategory,
        description: item.description,
        quantity: item.quantity || 1,
        pricePerUnit: item.rate || 0,
        total: item.total || 0,
        costPerUnit: item.cost_per_unit || 0,
        totalCost: (item.quantity || 1) * (item.cost_per_unit || 0),
        totalMarkup: (item.total || 0) - ((item.quantity || 1) * (item.cost_per_unit || 0)),
        allocated_expenses: [] as UnallocatedExpense[],
        allocated_amount: 0
      }));

      // Process quote line items
      const quotes = quotesResult.data || [];
      const quoteLineItems = quotes.flatMap(quote => 
        (quote.quote_line_items || []).map(item => ({
          id: item.id,
          type: 'quote' as const,
          source_id: quote.id,
          category: item.category as LineItemCategory,
          description: item.description || 'Quote line item',
          quantity: item.quantity || 1,
          pricePerUnit: item.rate || 0,
          total: item.total || 0,
          costPerUnit: item.cost_per_unit || 0,
          totalCost: item.total_cost || 0,
          totalMarkup: item.total_markup || 0,
          allocated_expenses: [] as UnallocatedExpense[],
          allocated_amount: 0,
          payee_name: quote.payees?.payee_name,
          quote_number: quote.quote_number
        }))
      );

      // Combine estimate and quote line items
      const allLineItems = [...estimateLineItems, ...quoteLineItems];

      // Check if expense has a correlation to a line item
      const { data: correlations } = await supabase
        .from('expense_line_item_correlations')
        .select('expense_id')
        .in('expense_id', expenses.map(e => e.id));

      const unallocated: UnallocatedExpense[] = expenses.filter(expense => {
        return !correlations?.some(c => c.expense_id === expense.id);
      }).map(expense => ({
        ...expense,
        suggested_line_item_id: suggestLineItemAllocation(expense, allLineItems),
        confidence_score: calculateMatchConfidence(expense, allLineItems)
      }));

      setUnallocatedExpenses(unallocated);
      setLineItems(allLineItems);
    } catch (error) {
      console.error('Error loading matching data:', error);
      toast({
        title: "Error",
        description: "Failed to load expense allocation data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const suggestLineItemAllocation = (expense: UnallocatedExpense, lineItems: LineItemWithExpenses[]): string | undefined => {
    const categoryMap: Record<ExpenseCategory, LineItemCategory[]> = {
      [ExpenseCategory.LABOR]: [LineItemCategory.LABOR],
      [ExpenseCategory.SUBCONTRACTOR]: [LineItemCategory.SUBCONTRACTOR],
      [ExpenseCategory.MATERIALS]: [LineItemCategory.MATERIALS],
      [ExpenseCategory.EQUIPMENT]: [LineItemCategory.EQUIPMENT],
      [ExpenseCategory.PERMITS]: [LineItemCategory.PERMITS],
      [ExpenseCategory.MANAGEMENT]: [LineItemCategory.MANAGEMENT],
      [ExpenseCategory.OTHER]: [LineItemCategory.OTHER]
    };

    const matchingCategories = categoryMap[expense.category] || [];
    const categoryMatches = lineItems.filter(item => matchingCategories.includes(item.category));
    
    // If expense has a payee, prioritize quote line items with matching payees
    if (expense.payee_name && categoryMatches.length > 0) {
      const quoteMatches = categoryMatches.filter(item => 
        item.type === 'quote' && item.payee_name
      );
      
      if (quoteMatches.length > 0) {
        const lineItemPayees: PartialPayee[] = quoteMatches.map(item => ({
          id: item.id,
          payee_name: item.payee_name!,
          full_name: item.payee_name
        }));
        
        const fuzzyResult = fuzzyMatchPayee(expense.payee_name, lineItemPayees);
        
        // If high confidence match, suggest that quote line item
        if (fuzzyResult.bestMatch && fuzzyResult.bestMatch.confidence >= 75) {
          return fuzzyResult.bestMatch.payee.id;
        }
      }
    }
    
    // Fallback to first category match
    if (categoryMatches.length > 0) {
      return categoryMatches[0].id;
    }
    
    return undefined;
  };

  const calculateMatchConfidence = (expense: UnallocatedExpense, lineItems: LineItemWithExpenses[]): number => {
    let confidence = 0;
    
    // Category match - map expense categories to line item categories (40 points max)
    const categoryMap: Record<ExpenseCategory, LineItemCategory[]> = {
      [ExpenseCategory.LABOR]: [LineItemCategory.LABOR],
      [ExpenseCategory.SUBCONTRACTOR]: [LineItemCategory.SUBCONTRACTOR],
      [ExpenseCategory.MATERIALS]: [LineItemCategory.MATERIALS],
      [ExpenseCategory.EQUIPMENT]: [LineItemCategory.EQUIPMENT],
      [ExpenseCategory.PERMITS]: [LineItemCategory.PERMITS],
      [ExpenseCategory.MANAGEMENT]: [LineItemCategory.MANAGEMENT],
      [ExpenseCategory.OTHER]: [LineItemCategory.OTHER]
    };

    const matchingCategories = categoryMap[expense.category] || [];
    const matchingLineItems = lineItems.filter(item => matchingCategories.includes(item.category));
    
    if (matchingLineItems.length > 0) {
      confidence += 40;
    }
    
    // Payee fuzzy matching (0-30 points)
    if (expense.payee_name && matchingLineItems.length > 0) {
      const payeeLineItems = matchingLineItems.filter(item => 
        item.type === 'quote' && item.payee_name
      );
      
      if (payeeLineItems.length > 0) {
        const lineItemPayees: PartialPayee[] = payeeLineItems.map(item => ({
          id: item.id,
          payee_name: item.payee_name!,
          full_name: item.payee_name
        }));
        
        const fuzzyResult = fuzzyMatchPayee(expense.payee_name, lineItemPayees);
        
        if (fuzzyResult.bestMatch) {
          const matchConfidence = fuzzyResult.bestMatch.confidence;
          
          if (matchConfidence >= 90) {
            confidence += 30;
          } else if (matchConfidence >= 75) {
            confidence += 20;
          } else if (matchConfidence >= 60) {
            confidence += 10;
          }
        }
      }
    }
    
    // Amount similarity (0-20 points)
    if (matchingLineItems.length > 0) {
      const closestAmountMatch = matchingLineItems.reduce((best, item) => {
        const itemCost = item.totalCost || 0;
        if (itemCost === 0) return best;
        
        const percentDiff = Math.abs((expense.amount - itemCost) / itemCost) * 100;
        
        if (percentDiff < best.percentDiff) {
          return { item, percentDiff };
        }
        return best;
      }, { item: null as LineItemWithExpenses | null, percentDiff: Infinity });
      
      if (closestAmountMatch.item) {
        if (closestAmountMatch.percentDiff <= 5) confidence += 20;
        else if (closestAmountMatch.percentDiff <= 10) confidence += 15;
        else if (closestAmountMatch.percentDiff <= 20) confidence += 10;
      }
    }
    
    // Description keyword matching (0-10 points)
    if (expense.description && matchingLineItems.length > 0) {
      const expenseWords = new Set(
        expense.description
          .toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(word))
      );
      
      const hasDescriptionMatch = matchingLineItems.some(item => {
        const itemWords = item.description
          .toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 3);
        
        const commonWords = itemWords.filter(word => expenseWords.has(word));
        return commonWords.length > 0;
      });
      
      if (hasDescriptionMatch) confidence += 10;
    }
    
    return Math.min(confidence, 100);
  };

  const handleBulkAssign = async (lineItemId: string) => {
    const expenseIds = Array.from(selectedExpenses);
    
    if (expenseIds.length === 0) return;

    try {
      // Create correlations for selected expenses
      const lineItem = lineItems.find(li => li.id === lineItemId);
      
      const correlations = expenseIds.map(expenseId => ({
        expense_id: expenseId,
        estimate_line_item_id: lineItem?.type === 'estimate' ? lineItemId : null,
        quote_id: lineItem?.type === 'quote' ? lineItem.source_id : null,
        correlation_type: lineItem?.type === 'estimate' ? 'estimated' : 'quoted',
        auto_correlated: false,
        notes: `Manually assigned via Expense Allocation Interface (${lineItem?.type || 'estimate'})`
      }));

      const { error: correlationError } = await supabase
        .from('expense_line_item_correlations')
        .insert(correlations);

      if (correlationError) throw correlationError;

      // Update expenses to mark them as planned
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ is_planned: true })
        .in('id', expenseIds);

      if (updateError) throw updateError;

      toast({
        title: "Expenses Allocated",
        description: `Allocated ${expenseIds.length} expense${expenseIds.length === 1 ? '' : 's'} to line item.`
      });
      
      setSelectedExpenses(new Set());
      loadAllocationData();
    } catch (error) {
      console.error('Error assigning expenses:', error);
      toast({
        title: "Error",
        description: "Failed to assign expenses.",
        variant: "destructive"
      });
    }
  };

  const prepareAutoAllocate = () => {
    const highConfidenceExpenses = unallocatedExpenses.filter(exp => 
      exp.confidence_score && 
      exp.confidence_score >= 75 &&
      exp.suggested_line_item_id
    );

    if (highConfidenceExpenses.length === 0) {
      toast({
        title: "No High-Confidence Allocations",
        description: "No expenses found with high confidence allocations for auto-assignment."
      });
      return;
    }

    // Build preview list
    const previews = highConfidenceExpenses.map(expense => {
      const lineItem = lineItems.find(li => li.id === expense.suggested_line_item_id);
      return {
        expense,
        lineItem: lineItem!,
        confidence: expense.confidence_score!
      };
    }).filter(preview => preview.lineItem); // Remove any with missing line items

    setPreviewAllocations(previews);
    setShowAutoAllocateDialog(true);
  };

  const confirmAutoAllocate = async () => {
    setShowAutoAllocateDialog(false);
    
    if (previewAllocations.length === 0) return;

    try {
      const correlations = previewAllocations.map(({ expense, lineItem }) => ({
        expense_id: expense.id,
        estimate_line_item_id: lineItem.type === 'estimate' ? expense.suggested_line_item_id : null,
        quote_id: lineItem.type === 'quote' ? lineItem.source_id : null,
        correlation_type: lineItem.type === 'estimate' ? 'estimated' : 'quoted',
        auto_correlated: true,
        confidence_score: expense.confidence_score,
        notes: `Auto-allocated via Expense Allocation Interface (${lineItem.type})`
      }));

      const { error: correlationError } = await supabase
        .from('expense_line_item_correlations')
        .insert(correlations);

      if (correlationError) throw correlationError;

      // Update expenses to mark them as planned
      const expenseIds = previewAllocations.map(p => p.expense.id);
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ is_planned: true })
        .in('id', expenseIds);

      if (updateError) throw updateError;

      toast({
        title: "Auto-Allocation Complete",
        description: `Automatically allocated ${previewAllocations.length} high-confidence expenses.`
      });
      
      setPreviewAllocations([]);
      loadAllocationData();
    } catch (error) {
      console.error('Error auto-allocating:', error);
      toast({
        title: "Error",
        description: "Failed to auto-allocate expenses.",
        variant: "destructive"
      });
    }
  };

  const filteredExpenses = unallocatedExpenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.payee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800">High</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low</Badge>;
  };

  if (isLoading) {
    return <BrandedLoader message="Loading allocation interface..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Expense Allocation</h3>
          <Badge variant="outline">
            {unallocatedExpenses.length} unallocated
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={prepareAutoAllocate} className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Auto-Allocate
          </Button>
          <Button variant="outline" onClick={onAllocationComplete}>
            Done
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="search">Search Expenses</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by description or payee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="w-full sm:w-48">
          <Label>Category Filter</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(EXPENSE_CATEGORY_DISPLAY).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unmatched Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Unallocated Expenses ({filteredExpenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {filteredExpenses.map(expense => (
              <div
                key={expense.id}
                className={cn(
                  "p-3 border rounded-lg cursor-pointer transition-colors",
                  selectedExpenses.has(expense.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                )}
                onClick={() => {
                  const newSelected = new Set(selectedExpenses);
                  if (newSelected.has(expense.id)) {
                    newSelected.delete(expense.id);
                  } else {
                    newSelected.add(expense.id);
                  }
                  setSelectedExpenses(newSelected);
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                    {expense.confidence_score && getConfidenceBadge(expense.confidence_score)}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(expense.expense_date), 'MMM dd')}
                  </div>
                </div>
                
                <div className="text-sm mb-1">{getExpensePayeeLabel(expense)}</div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {expense.payee_name || 'No payee'}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {EXPENSE_CATEGORY_DISPLAY[expense.category as ExpenseCategory]}
                  </Badge>
                </div>
              </div>
            ))}
            
            {filteredExpenses.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>All expenses matched to line items</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Line Items ({lineItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {lineItems.map(item => (
              <div key={item.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-sm">{item.description}</div>
                      {item.type === 'quote' && (
                        <Badge variant="secondary" className="text-xs">
                          Quote {item.quote_number || ''}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {CATEGORY_DISPLAY_MAP[item.category as LineItemCategory]}
                      {item.payee_name && (
                        <span className="ml-2">• {item.payee_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatCurrency(item.total || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(item.allocated_amount)} allocated
                    </div>
                  </div>
                </div>
                
                {selectedExpenses.size > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => handleBulkAssign(item.id)}
                  >
                    Allocate {selectedExpenses.size} expense{selectedExpenses.size === 1 ? '' : 's'}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      {unallocatedExpenses.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {unallocatedExpenses.length} unallocated expenses totaling{' '}
            {formatCurrency(unallocatedExpenses.reduce((sum, exp) => sum + exp.amount, 0))}.
            These expenses won't appear in your Line Item Control dashboard until allocated.
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-Allocation Review Dialog */}
      <Dialog open={showAutoAllocateDialog} onOpenChange={setShowAutoAllocateDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Review Auto-Allocations</DialogTitle>
            <DialogDescription>
              The following {previewAllocations.length} expense{previewAllocations.length === 1 ? '' : 's'} will be automatically allocated. Review and confirm to proceed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {previewAllocations.map(({ expense, lineItem, confidence }) => (
              <div key={expense.id} className="p-3 border rounded-lg bg-muted/30">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                      {getConfidenceBadge(confidence)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getExpensePayeeLabel(expense)}
                    </div>
                    {expense.payee_name && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />
                        {expense.payee_name}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm mt-2 pt-2 border-t">
                  <Target className="h-4 w-4 text-blue-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{lineItem.description}</div>
                      {lineItem.type === 'quote' && (
                        <Badge variant="secondary" className="text-xs">Quote</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {CATEGORY_DISPLAY_MAP[lineItem.category as LineItemCategory]} • 
                      Cost: {formatCurrency(lineItem.totalCost)}
                      {lineItem.payee_name && (
                        <span className="ml-1">• Payee: {lineItem.payee_name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAutoAllocateDialog(false);
                setPreviewAllocations([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmAutoAllocate} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Confirm Allocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};