import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Zap,
  DollarSign,
  Calendar,
  User,
  Search,
  FileText,
  Building
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExpenseCategory, EXPENSE_CATEGORY_DISPLAY } from '@/types/expense';
import { LineItemCategory, CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface GlobalExpenseMatchingProps {
  onClose: () => void;
}

interface EnhancedExpense {
  id: string;
  amount: number;
  expense_date: Date;
  description?: string;
  category: ExpenseCategory;
  payee_id?: string;
  payee_name?: string;
  project_id: string;
  project_name?: string;
  match_status: 'unaccounted' | 'accounted_in_estimate' | 'accounted_in_quote';
  suggested_line_item_id?: string;
  suggested_quote_id?: string;
  confidence_score?: number;
}

interface LineItemForMatching {
  id: string;
  type: 'estimate' | 'quote';
  source_id: string; // estimate_id or quote_id
  project_id: string;
  project_name: string;
  category: LineItemCategory;
  description: string;
  total: number;
  matched_amount: number;
  payee_name?: string; // For quotes
}

export const GlobalExpenseMatching: React.FC<GlobalExpenseMatchingProps> = ({
  onClose
}) => {
  const [expenses, setExpenses] = useState<EnhancedExpense[]>([]);
  const [lineItems, setLineItems] = useState<LineItemForMatching[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('unaccounted');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadMatchingData();
  }, []);

  const loadMatchingData = async () => {
    setIsLoading(true);
    try {
      // Load all expenses with their current correlations
      const [expensesResult, projectsResult, estimatesResult, quotesResult, correlationsResult] = await Promise.all([
        supabase
          .from('expenses')
          .select(`
            *,
            payees (payee_name),
            projects (project_name)
          `),
        supabase
          .from('projects')
          .select('id, project_name')
          .order('project_name'),
        supabase
          .from('estimates')
          .select(`
            id,
            project_id,
            projects (project_name),
            estimate_line_items (*)
          `)
          .eq('is_current_version', true),
        supabase
          .from('quotes')
          .select(`
            id,
            project_id,
            status,
            projects (project_name),
            payees (payee_name),
            quote_line_items (*)
          `)
          .eq('status', 'accepted'),
        supabase
          .from('expense_line_item_correlations')
          .select('*')
      ]);

      const rawExpenses = expensesResult.data || [];
      const correlations = correlationsResult.data || [];
      const projects = projectsResult.data || [];
      const estimates = estimatesResult.data || [];
      const quotes = quotesResult.data || [];

      // Create line items from estimates and quotes
      // First, filter to only accepted quotes
      const acceptedQuotes = quotes.filter(quote => quote.status === 'accepted');
      
      // Create a set of project+category combinations that have accepted quotes
      const coveredCategories = new Set<string>();
      acceptedQuotes.forEach(quote => {
        (quote.quote_line_items || []).forEach(item => {
          coveredCategories.add(`${quote.project_id}-${item.category}`);
        });
      });

      // Filter estimate line items to exclude those covered by accepted quotes
      const estimateLineItems: LineItemForMatching[] = estimates.flatMap(estimate => 
        (estimate.estimate_line_items || [])
          .filter(item => !coveredCategories.has(`${estimate.project_id}-${item.category}`))
          .map(item => ({
            id: item.id,
            type: 'estimate' as const,
            source_id: estimate.id,
            project_id: estimate.project_id,
            project_name: estimate.projects?.project_name || 'Unknown',
            category: item.category as LineItemCategory,
            description: item.description,
            total: item.total_cost || (item.cost_per_unit * item.quantity) || 0,
            matched_amount: 0 // Will be calculated below
          }))
      );

      // Include all accepted quotes (these are the actual committed costs)
      const quoteLineItems: LineItemForMatching[] = acceptedQuotes.flatMap(quote => 
        (quote.quote_line_items || []).map(item => ({
          id: item.id,
          type: 'quote' as const,
          source_id: quote.id,
          project_id: quote.project_id,
          project_name: quote.projects?.project_name || 'Unknown',
          category: item.category as LineItemCategory,
          description: item.description,
          total: item.total_cost || (item.cost_per_unit * item.quantity) || 0,
          matched_amount: 0, // Will be calculated below
          payee_name: quote.payees?.payee_name
        }))
      );

      const allLineItems = [...estimateLineItems, ...quoteLineItems];

      // Calculate matched amounts
      correlations.forEach(correlation => {
        const expense = rawExpenses.find(e => e.id === correlation.expense_id);
        const lineItem = allLineItems.find(li => 
          li.id === correlation.estimate_line_item_id || 
          (correlation.quote_id && li.source_id === correlation.quote_id)
        );
        
        if (expense && lineItem) {
          lineItem.matched_amount += expense.amount;
        }
      });

      // Process expenses with match status
      const enhancedExpenses: EnhancedExpense[] = rawExpenses.map(expense => {
        const correlation = correlations.find(c => c.expense_id === expense.id);
        let matchStatus: 'unaccounted' | 'accounted_in_estimate' | 'accounted_in_quote' = 'unaccounted';
        
        if (correlation) {
          if (correlation.estimate_line_item_id) {
            const lineItem = estimateLineItems.find(li => li.id === correlation.estimate_line_item_id);
            matchStatus = lineItem ? 'accounted_in_estimate' : 'unaccounted';
          } else if (correlation.quote_id) {
            matchStatus = 'accounted_in_quote';
          }
        }

        return {
          id: expense.id,
          amount: expense.amount,
          expense_date: new Date(expense.expense_date),
          description: expense.description,
          category: expense.category as ExpenseCategory,
          payee_id: expense.payee_id,
          payee_name: expense.payees?.payee_name,
          project_id: expense.project_id,
          project_name: expense.projects?.project_name,
          match_status: matchStatus,
          suggested_line_item_id: suggestLineItemMatch(expense, allLineItems),
          confidence_score: calculateMatchConfidence(expense, allLineItems)
        };
      });

      setExpenses(enhancedExpenses);
      setLineItems(allLineItems);
      setProjects(projects);
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

  const suggestLineItemMatch = (expense: any, lineItems: LineItemForMatching[]): string | undefined => {
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
    
    // First try to match within the same project
    const projectLineItems = lineItems.filter(li => li.project_id === expense.project_id);
    for (const item of projectLineItems) {
      if (matchingCategories.includes(item.category)) {
        return item.id;
      }
    }

    // If no project match, try any matching category
    for (const item of lineItems) {
      if (matchingCategories.includes(item.category)) {
        return item.id;
      }
    }
    
    return undefined;
  };

  const calculateMatchConfidence = (expense: any, lineItems: LineItemForMatching[]): number => {
    let confidence = 0;
    
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
    
    // Same project + same category = high confidence
    const projectCategoryMatch = lineItems.some(item => 
      item.project_id === expense.project_id && 
      matchingCategories.includes(item.category)
    );
    if (projectCategoryMatch) confidence += 60;
    
    // Same payee (for quotes) = medium confidence
    const payeeMatch = lineItems.some(item => 
      item.type === 'quote' && 
      item.payee_name === expense.payee_name
    );
    if (payeeMatch) confidence += 30;
    
    // Category match anywhere = low confidence
    const categoryMatch = lineItems.some(item => matchingCategories.includes(item.category));
    if (categoryMatch && !projectCategoryMatch) confidence += 20;
    
    return Math.min(confidence, 100);
  };

  const handleBulkAssign = async (lineItemId: string) => {
    const expenseIds = Array.from(selectedExpenses);
    const lineItem = lineItems.find(li => li.id === lineItemId);
    
    if (!lineItem) return;

    try {
      // Create correlations for selected expenses
      const correlations = expenseIds.map(expenseId => ({
        expense_id: expenseId,
        estimate_line_item_id: lineItem.type === 'estimate' ? lineItem.id : null,
        quote_id: lineItem.type === 'quote' ? lineItem.source_id : null,
        correlation_type: 'manual_assignment',
        auto_correlated: false,
        notes: 'Manually assigned via Global Expense Matching'
      }));

      const { error } = await supabase
        .from('expense_line_item_correlations')
        .insert(correlations);

      if (error) throw error;

      toast({
        title: "Expenses Assigned",
        description: `Assigned ${expenseIds.length} expenses to ${lineItem.type === 'estimate' ? 'estimate' : 'quote'} line item.`
      });
      
      setSelectedExpenses(new Set());
      loadMatchingData();
    } catch (error) {
      console.error('Error assigning expenses:', error);
      toast({
        title: "Error",
        description: "Failed to assign expenses.",
        variant: "destructive"
      });
    }
  };

  const handleAutoMatch = async () => {
    const highConfidenceExpenses = expenses.filter(exp => 
      exp.match_status === 'unaccounted' && 
      exp.confidence_score && 
      exp.confidence_score >= 80 &&
      exp.suggested_line_item_id
    );

    if (highConfidenceExpenses.length === 0) {
      toast({
        title: "No High-Confidence Matches",
        description: "No expenses found with high confidence matches for auto-assignment."
      });
      return;
    }

    try {
      const correlations = highConfidenceExpenses.map(expense => {
        const lineItem = lineItems.find(li => li.id === expense.suggested_line_item_id);
        return {
          expense_id: expense.id,
          estimate_line_item_id: lineItem?.type === 'estimate' ? lineItem.id : null,
          quote_id: lineItem?.type === 'quote' ? lineItem.source_id : null,
          correlation_type: 'auto_match',
          auto_correlated: true,
          confidence_score: expense.confidence_score,
          notes: 'Auto-matched via Global Expense Matching'
        };
      });

      const { error } = await supabase
        .from('expense_line_item_correlations')
        .insert(correlations);

      if (error) throw error;

      toast({
        title: "Auto-matching Complete",
        description: `Automatically matched ${highConfidenceExpenses.length} high-confidence expenses.`
      });
      
      loadMatchingData();
    } catch (error) {
      console.error('Error auto-matching:', error);
      toast({
        title: "Error",
        description: "Failed to auto-match expenses.",
        variant: "destructive"
      });
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.payee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = projectFilter === 'all' || expense.project_id === projectFilter;
    const matchesStatus = statusFilter === 'all' || expense.match_status === statusFilter;
    
    return matchesSearch && matchesProject && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accounted_in_estimate':
        return <Badge className="bg-blue-100 text-blue-800">Accounted in Estimate</Badge>;
      case 'accounted_in_quote':
        return <Badge className="bg-green-100 text-green-800">Accounted in Quote</Badge>;
      default:
        return <Badge variant="destructive">Unaccounted</Badge>;
    }
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800">High</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const summaryStats = {
    total: expenses.length,
    unaccounted: expenses.filter(e => e.match_status === 'unaccounted').length,
    accountedInEstimate: expenses.filter(e => e.match_status === 'accounted_in_estimate').length,
    accountedInQuote: expenses.filter(e => e.match_status === 'accounted_in_quote').length,
    unaccountedAmount: expenses.filter(e => e.match_status === 'unaccounted').reduce((sum, e) => sum + e.amount, 0)
  };

  if (isLoading) {
    return <div className="animate-pulse p-6">Loading expense matching interface...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold">Global Expense Matching</h2>
          <p className="text-muted-foreground">Match expenses to estimate and quote line items across all projects</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleAutoMatch} className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Auto-Match High Confidence
          </Button>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{summaryStats.unaccounted}</div>
            <p className="text-sm text-muted-foreground">Unaccounted</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(summaryStats.unaccountedAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{summaryStats.accountedInEstimate}</div>
            <p className="text-sm text-muted-foreground">Accounted in Estimates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{summaryStats.accountedInQuote}</div>
            <p className="text-sm text-muted-foreground">Accounted in Quotes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summaryStats.total}</div>
            <p className="text-sm text-muted-foreground">Total Expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="search">Search Expenses</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by payee, project, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="w-full sm:w-48">
          <Label>Project Filter</Label>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.project_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-48">
          <Label>Status Filter</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unaccounted">Unaccounted</SelectItem>
              <SelectItem value="accounted_in_estimate">Accounted in Estimate</SelectItem>
              <SelectItem value="accounted_in_quote">Accounted in Quote</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Expenses ({filteredExpenses.length})
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
                    <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                    {getStatusBadge(expense.match_status)}
                    {expense.confidence_score && expense.match_status === 'unaccounted' && 
                      getConfidenceBadge(expense.confidence_score)
                    }
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(expense.expense_date, 'MMM dd')}
                  </div>
                </div>
                
                <div className="text-sm mb-1 font-medium">{expense.payee_name || 'No payee'}</div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {expense.project_name}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {EXPENSE_CATEGORY_DISPLAY[expense.category]}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredExpenses.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No expenses found with current filters</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Line Items (Estimates & Quotes)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            <Tabs defaultValue="estimates">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="estimates">Estimates</TabsTrigger>
                <TabsTrigger value="quotes">Quotes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="estimates" className="space-y-3 mt-4">
                {lineItems.filter(li => li.type === 'estimate').map(item => (
                  <div key={item.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.description}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {item.project_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {CATEGORY_DISPLAY_MAP[item.category]}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(item.total)}</div>
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
              </TabsContent>
              
              <TabsContent value="quotes" className="space-y-3 mt-4">
                {lineItems.filter(li => li.type === 'quote').map(item => (
                  <div key={item.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.description}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {item.project_name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.payee_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {CATEGORY_DISPLAY_MAP[item.category]} • Quote
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(item.total)}</div>
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Summary Alert */}
      {summaryStats.unaccounted > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {summaryStats.unaccounted} unaccounted expenses totaling{' '}
            {formatCurrency(summaryStats.unaccountedAmount)}. These expenses may represent cost overruns or unexpected costs.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};