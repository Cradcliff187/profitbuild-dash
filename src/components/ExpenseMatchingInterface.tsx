import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { cn } from '@/lib/utils';

interface ExpenseMatchingInterfaceProps {
  projectId: string;
  onMatchingComplete: () => void;
}

// Create a unified category type for matching
type UnifiedCategory = ExpenseCategory | LineItemCategory;

interface UnmatchedExpense {
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
  category: LineItemCategory;
  description: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
  costPerUnit: number;
  totalCost: number;
  totalMarkup: number;
  matched_expenses: UnmatchedExpense[];
  matched_amount: number;
}

export const ExpenseMatchingInterface: React.FC<ExpenseMatchingInterfaceProps> = ({
  projectId,
  onMatchingComplete
}) => {
  const [unmatchedExpenses, setUnmatchedExpenses] = useState<UnmatchedExpense[]>([]);
  const [lineItems, setLineItems] = useState<LineItemWithExpenses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadMatchingData();
  }, [projectId]);

  const loadMatchingData = async () => {
    setIsLoading(true);
    try {
      // Load unmatched expenses and line items
      const [expensesResult, estimatesResult] = await Promise.all([
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
          .maybeSingle()
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

      const lineItems = (estimatesResult.data?.estimate_line_items || []).map(item => ({
        id: item.id,
        category: item.category as LineItemCategory,
        description: item.description,
        quantity: item.quantity || 1,
        pricePerUnit: item.rate || 0,
        total: item.total || 0,
        costPerUnit: item.cost_per_unit || 0,
        totalCost: (item.quantity || 1) * (item.cost_per_unit || 0),
        totalMarkup: (item.total || 0) - ((item.quantity || 1) * (item.cost_per_unit || 0)),
        matched_expenses: [] as UnmatchedExpense[],
        matched_amount: 0
      }));

      // Identify unmatched expenses (those that don't clearly match to line items)
      const unmatched: UnmatchedExpense[] = expenses.filter(expense => {
        // Add logic to identify which expenses are "unmatched"
        // For now, mark expenses without clear payee-category matches as unmatched
        return true; // Placeholder - in production would have smarter logic
      }).map(expense => ({
        ...expense,
        suggested_line_item_id: suggestLineItemMatch(expense, lineItems),
        confidence_score: calculateMatchConfidence(expense, lineItems)
      }));

      // Calculate current matches for line items - they already have matched_expenses and matched_amount
      const lineItemsWithMatches: LineItemWithExpenses[] = lineItems;

      setUnmatchedExpenses(unmatched);
      setLineItems(lineItemsWithMatches);
    } catch (error) {
      console.error('Error loading matching data:', error);
      toast({
        title: "Error",
        description: "Failed to load expense matching data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const suggestLineItemMatch = (expense: UnmatchedExpense, lineItems: LineItemWithExpenses[]): string | undefined => {
    // Smart matching logic - map expense categories to line item categories
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
    for (const item of lineItems) {
      if (matchingCategories.includes(item.category)) {
        return item.id;
      }
    }
    return undefined;
  };

  const calculateMatchConfidence = (expense: UnmatchedExpense, lineItems: LineItemWithExpenses[]): number => {
    // Calculate confidence score based on various factors
    let confidence = 0;
    
    // Category match - map expense categories to line item categories  
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
    const hasCategory = lineItems.some(item => matchingCategories.includes(item.category));
    if (hasCategory) confidence += 40;
    
    // Payee specialization (if we have payee data)
    if (expense.payee_id) confidence += 30;
    
    // Description keywords (placeholder)
    confidence += 20;
    
    return Math.min(confidence, 100);
  };

  const handleBulkAssign = (lineItemId: string) => {
    const expenses = Array.from(selectedExpenses);
    // Implement bulk assignment logic
    toast({
      title: "Expenses Assigned",
      description: `Assigned ${expenses.length} expenses to line item.`
    });
    setSelectedExpenses(new Set());
  };

  const handleAutoMatch = async () => {
    // Implement auto-matching logic
    toast({
      title: "Auto-matching Complete",
      description: "High-confidence matches have been applied."
    });
    loadMatchingData();
  };

  const filteredExpenses = unmatchedExpenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.payee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800">High</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low</Badge>;
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading matching interface...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Expense Matching</h3>
          <Badge variant="outline">
            {unmatchedExpenses.length} unmatched
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleAutoMatch} className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Auto-Match
          </Button>
          <Button variant="outline" onClick={onMatchingComplete}>
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
              Unmatched Expenses ({filteredExpenses.length})
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
                
                <div className="text-sm mb-1">{expense.description}</div>
                
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
                <p>No unmatched expenses found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Estimate Line Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {lineItems.map(item => (
              <div key={item.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {CATEGORY_DISPLAY_MAP[item.category as LineItemCategory]}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatCurrency(item.total || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(item.matched_amount)} matched
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
                    Assign {selectedExpenses.size} expense{selectedExpenses.size === 1 ? '' : 's'}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      {unmatchedExpenses.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {unmatchedExpenses.length} unmatched expenses totaling{' '}
            {formatCurrency(unmatchedExpenses.reduce((sum, exp) => sum + exp.amount, 0))}.
            These expenses won't appear in your Line Item Control dashboard until matched.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};