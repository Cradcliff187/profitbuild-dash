import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger 
} from '@/components/ui/hover-card';
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
  Building,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExpenseCategory, EXPENSE_CATEGORY_DISPLAY } from '@/types/expense';
import { LineItemCategory, CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { fuzzyMatchPayee, type PartialPayee } from '@/utils/fuzzyPayeeMatcher';
import { FuzzyMatchDetailsPanel } from '@/components/FuzzyMatchDetailsPanel';

interface GlobalExpenseAllocationProps {
  onClose: () => void;
  projectId?: string; // Optional - if provided, filter to single project
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
  project_number?: string;
  match_status: 'unallocated' | 'allocated_to_estimate' | 'allocated_to_quote';
  suggested_line_item_id?: string;
  suggested_quote_id?: string;
  confidence_score?: number;
}

interface LineItemForMatching {
  id: string;
  type: 'estimate' | 'quote' | 'change_order';
  source_id: string; // estimate_id, quote_id, or change_order_id
  project_id: string;
  project_name: string;
  category: LineItemCategory;
  description: string;
  total: number;
  allocated_amount: number;
  payee_name?: string; // For quotes and change orders
  change_order_number?: string;
  change_order_status?: string;
}

export const GlobalExpenseAllocation: React.FC<GlobalExpenseAllocationProps> = ({
  onClose,
  projectId
}) => {
  const [expenses, setExpenses] = useState<EnhancedExpense[]>([]);
  const [lineItems, setLineItems] = useState<LineItemForMatching[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('unallocated');
  const [allocationSource, setAllocationSource] = useState<'estimates' | 'quotes' | 'change_orders'>('estimates');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<any[]>([]);
  const [showAutoAllocateDialog, setShowAutoAllocateDialog] = useState(false);
  const [previewAllocations, setPreviewAllocations] = useState<Array<{
    expense: EnhancedExpense;
    lineItem: LineItemForMatching;
    confidence: number;
  }>>([]);
  const { toast } = useToast();

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setProjectFilter('all');
    setStatusFilter('unallocated');
    toast({
      title: "Filters Cleared",
      description: "All filters have been reset to defaults."
    });
  }, [toast]);

  const hasActiveFilters = useCallback(() => {
    return searchTerm !== '' || 
           projectFilter !== 'all' || 
           statusFilter !== 'unallocated';
  }, [searchTerm, projectFilter, statusFilter]);

  useEffect(() => {
    loadAllocationData();
    if (projectId) {
      setProjectFilter(projectId);
    }
  }, [projectId]);

  const loadAllocationData = async () => {
    setIsLoading(true);
    try {
      // Load all expenses with their current correlations
      const [expensesResult, projectsResult, estimatesResult, quotesResult, changeOrdersResult, correlationsResult] = await Promise.all([
        projectId 
          ? supabase
              .from('expenses')
              .select(`
                *,
                payees (payee_name),
                projects (project_name, project_number)
              `)
              .eq('project_id', projectId)
          : supabase
              .from('expenses')
              .select(`
                *,
                payees (payee_name),
                projects (project_name, project_number)
              `),
        supabase
          .from('projects')
          .select('id, project_name, project_number')
          .order('project_name'),
        projectId
          ? supabase
              .from('estimates')
              .select(`
                id,
                project_id,
                projects (project_name),
                estimate_line_items (*)
              `)
              .eq('is_current_version', true)
              .eq('project_id', projectId)
          : supabase
              .from('estimates')
              .select(`
                id,
                project_id,
                projects (project_name),
                estimate_line_items (*)
              `)
              .eq('is_current_version', true),
        projectId
          ? supabase
              .from('quotes')
              .select(`
                id,
                project_id,
                status,
                projects (project_name),
                payees (payee_name),
                quote_line_items (*)
              `)
              .eq('status', 'accepted')
              .eq('project_id', projectId)
          : supabase
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
        projectId
          ? supabase
              .from('change_orders')
              .select(`
                id,
                change_order_number,
                status,
                project_id,
                projects (project_name),
                change_order_line_items (
                  id,
                  category,
                  description,
                  total_cost,
                  payee_id,
                  payees (payee_name)
                )
              `)
              .eq('status', 'approved')
              .eq('project_id', projectId)
          : supabase
              .from('change_orders')
              .select(`
                id,
                change_order_number,
                status,
                project_id,
                projects (project_name),
                change_order_line_items (
                  id,
                  category,
                  description,
                  total_cost,
                  payee_id,
                  payees (payee_name)
                )
              `)
              .eq('status', 'approved'),
        supabase
          .from('expense_line_item_correlations')
          .select('*')
      ]);

      const rawExpenses = expensesResult.data || [];
      const correlations = correlationsResult.data || [];
      const projects = projectsResult.data || [];
      const estimates = estimatesResult.data || [];
      const quotes = quotesResult.data || [];
      const changeOrders = changeOrdersResult.data || [];

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
            allocated_amount: 0 // Will be calculated below
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
            allocated_amount: 0, // Will be calculated below
            payee_name: quote.payees?.payee_name
          }))
      );

      // Include all approved change orders
      const changeOrderLineItems: LineItemForMatching[] = changeOrders.flatMap(co => 
        (co.change_order_line_items || []).map(item => ({
          id: item.id,
          type: 'change_order' as const,
          source_id: co.id,
          project_id: co.project_id,
          project_name: co.projects?.project_name || 'Unknown',
            category: item.category as LineItemCategory,
            description: item.description,
            total: item.total_cost || 0,
            allocated_amount: 0, // Will be calculated below
            payee_name: item.payees?.payee_name,
            change_order_number: co.change_order_number,
            change_order_status: co.status
          }))
      );

      const allLineItems = [...estimateLineItems, ...quoteLineItems, ...changeOrderLineItems];

      // Calculate allocated amounts
      correlations.forEach(correlation => {
        const expense = rawExpenses.find(e => e.id === correlation.expense_id);
        const lineItem = allLineItems.find(li => 
          li.id === correlation.estimate_line_item_id || 
          (correlation.quote_id && li.source_id === correlation.quote_id) ||
          li.id === correlation.change_order_line_item_id
        );
        
        if (expense && lineItem) {
          lineItem.allocated_amount += expense.amount;
        }
      });

      // Process expenses with match status
      const enhancedExpenses: EnhancedExpense[] = rawExpenses.map(expense => {
        const correlation = correlations.find(c => c.expense_id === expense.id);
        let matchStatus: 'unallocated' | 'allocated_to_estimate' | 'allocated_to_quote' = 'unallocated';
        
        if (correlation) {
          if (correlation.estimate_line_item_id) {
            const lineItem = estimateLineItems.find(li => li.id === correlation.estimate_line_item_id);
            matchStatus = lineItem ? 'allocated_to_estimate' : 'unallocated';
          } else if (correlation.quote_id) {
            matchStatus = 'allocated_to_quote';
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
          project_number: expense.projects?.project_number,
          match_status: matchStatus,
          suggested_line_item_id: suggestLineItemAllocation(expense, allLineItems),
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
        description: "Failed to load expense allocation data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const suggestLineItemAllocation = (expense: any, lineItems: LineItemForMatching[]): string | undefined => {
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
    
    // Filter to same project + matching category
    const projectMatchingItems = lineItems.filter(item => 
      item.project_id === expense.project_id && 
      matchingCategories.includes(item.category)
    );
    
    if (projectMatchingItems.length === 0) {
      return undefined;
    }
    
    // PRIORITY 1: If expense has payee, try fuzzy match on quotes/change orders
    if (expense.payee_name) {
      const payeeLineItems = projectMatchingItems.filter(item => 
        (item.type === 'quote' || item.type === 'change_order') && item.payee_name
      );
      
      if (payeeLineItems.length > 0) {
        const lineItemPayees: PartialPayee[] = payeeLineItems.map(item => ({
          id: item.id,
          payee_name: item.payee_name!,
          full_name: item.payee_name
        }));
        
        const fuzzyResult = fuzzyMatchPayee(expense.payee_name, lineItemPayees);
        
        // If high confidence payee match, suggest that quote/CO line item
        if (fuzzyResult.bestMatch && fuzzyResult.bestMatch.confidence >= 75) {
          return fuzzyResult.bestMatch.payee.id; // This is the line item ID
        }
      }
    }
    
    // PRIORITY 2: Try amount similarity within project matches
    const closestAmountMatch = projectMatchingItems.reduce((best, item) => {
      const itemTotal = item.total || 0;
      if (itemTotal === 0) return best;
      
      const percentDiff = Math.abs((expense.amount - itemTotal) / itemTotal) * 100;
      
      if (percentDiff < best.percentDiff) {
        return { item, percentDiff };
      }
      return best;
    }, { item: null as LineItemForMatching | null, percentDiff: Infinity });
    
    // If amount is within 10%, suggest that one
    if (closestAmountMatch.item && closestAmountMatch.percentDiff <= 10) {
      return closestAmountMatch.item.id;
    }
    
    // PRIORITY 3: Fallback to first category match (prefer quotes > change orders > estimates)
    const quoteMatch = projectMatchingItems.find(item => item.type === 'quote');
    if (quoteMatch) return quoteMatch.id;
    
    const coMatch = projectMatchingItems.find(item => item.type === 'change_order');
    if (coMatch) return coMatch.id;
    
    return projectMatchingItems[0].id; // Estimate fallback
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
    
    // Filter to matching category line items in same project
    const projectMatchingItems = lineItems.filter(item => 
      item.project_id === expense.project_id && 
      matchingCategories.includes(item.category)
    );
    
    // Same project + same category (50 points)
    if (projectMatchingItems.length > 0) {
      confidence += 50;
    }
    
    // Payee fuzzy matching (0-30 points) - only for quotes/change orders
    if (expense.payee_name && projectMatchingItems.length > 0) {
      const payeeLineItems = projectMatchingItems.filter(item => 
        item.type === 'quote' || item.type === 'change_order'
      );
      
      if (payeeLineItems.length > 0) {
        // Build list of payees from line items
        const lineItemPayees: PartialPayee[] = payeeLineItems
          .filter(item => item.payee_name)
          .map(item => ({
            id: item.id,
            payee_name: item.payee_name!,
            full_name: item.payee_name
          }));
        
        if (lineItemPayees.length > 0) {
          const fuzzyResult = fuzzyMatchPayee(expense.payee_name, lineItemPayees);
          
          if (fuzzyResult.bestMatch) {
            const matchConfidence = fuzzyResult.bestMatch.confidence;
            if (matchConfidence >= 90) confidence += 30;
            else if (matchConfidence >= 75) confidence += 20;
            else if (matchConfidence >= 60) confidence += 10;
          }
        }
      }
    }
    
    // Amount similarity (0-15 points)
    if (projectMatchingItems.length > 0) {
      const closestAmountMatch = projectMatchingItems.reduce((best, item) => {
        const itemTotal = item.total || 0;
        if (itemTotal === 0) return best;
        
        const percentDiff = Math.abs((expense.amount - itemTotal) / itemTotal) * 100;
        
        if (percentDiff < best.percentDiff) {
          return { item, percentDiff };
        }
        return best;
      }, { item: null as LineItemForMatching | null, percentDiff: Infinity });
      
      if (closestAmountMatch.item) {
        if (closestAmountMatch.percentDiff <= 5) confidence += 15;
        else if (closestAmountMatch.percentDiff <= 10) confidence += 10;
        else if (closestAmountMatch.percentDiff <= 20) confidence += 5;
      }
    }
    
    // Description keyword matching (0-5 points)
    if (expense.description && projectMatchingItems.length > 0) {
      const expenseWords = new Set(
        expense.description
          .toLowerCase()
          .split(/\s+/)
          .filter((word: string) => word.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(word))
      );
      
      const hasDescriptionMatch = projectMatchingItems.some(item => {
        const itemWords = item.description
          .toLowerCase()
          .split(/\s+/)
          .filter((word: string) => word.length > 3);
        
        const commonWords = itemWords.filter((word: string) => expenseWords.has(word));
        return commonWords.length > 0;
      });
      
      if (hasDescriptionMatch) confidence += 5;
    }
    
    return Math.min(confidence, 100);
  };

  const handleBulkAssign = async (lineItemId: string, expenseIdsOverride?: string[]) => {
    const expenseIds = expenseIdsOverride || Array.from(selectedExpenses);
    const lineItem = lineItems.find(li => li.id === lineItemId);
    
    if (expenseIds.length === 0) {
      toast({
        title: "No expenses selected",
        description: "Please select at least one expense to allocate",
        variant: "destructive"
      });
      return;
    }
    
    if (!lineItem) return;

    try {
      // Create correlations for selected expenses
      const correlations = expenseIds.map(expenseId => ({
        expense_id: expenseId,
        estimate_line_item_id: lineItem.type === 'estimate' ? lineItem.id : null,
        quote_id: lineItem.type === 'quote' ? lineItem.source_id : null,
        change_order_line_item_id: lineItem.type === 'change_order' ? lineItem.id : null,
        correlation_type: lineItem.type === 'estimate' ? 'estimated' : lineItem.type === 'quote' ? 'quoted' : 'change_order',
        auto_correlated: false,
        notes: 'Manually assigned via Global Expense Allocation'
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
        description: `Allocated ${expenseIds.length} expense${expenseIds.length === 1 ? '' : 's'} to ${lineItem.type === 'estimate' ? 'estimate' : lineItem.type === 'quote' ? 'quote' : 'change order'} line item.`
      });
      
      setSelectedExpenses(new Set());
      loadAllocationData();
    } catch (error) {
      console.error('Error allocating expenses:', error);
      toast({
        title: "Error",
        description: "Failed to allocate expenses.",
        variant: "destructive"
      });
    }
  };

  const prepareAutoAllocate = () => {
    console.log('🔍 Auto-allocate check - All expenses:', expenses.map(e => ({
      payee: e.payee_name,
      confidence: e.confidence_score,
      suggested: e.suggested_line_item_id,
      status: e.match_status
    })));
    
    const highConfidenceExpenses = expenses.filter(exp => {
      const passes = exp.match_status === 'unallocated' && 
        exp.confidence_score && 
        exp.confidence_score >= 75 &&
        exp.suggested_line_item_id;
      
      if (!passes && exp.confidence_score && exp.confidence_score >= 75) {
        console.log('❌ High confidence but missing suggested_line_item_id:', {
          payee: exp.payee_name,
          confidence: exp.confidence_score,
          suggested: exp.suggested_line_item_id,
          status: exp.match_status
        });
      }
      
      return passes;
    });

    console.log('✅ High confidence expenses found:', highConfidenceExpenses.length);

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
        estimate_line_item_id: lineItem.type === 'estimate' ? lineItem.id : null,
        quote_id: lineItem.type === 'quote' ? lineItem.source_id : null,
        change_order_line_item_id: lineItem.type === 'change_order' ? lineItem.id : null,
        correlation_type: 'auto_match',
        auto_correlated: true,
        confidence_score: expense.confidence_score,
        notes: 'Auto-allocated via Global Expense Allocation'
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

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.payee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = projectFilter === 'all' || expense.project_id === projectFilter;
    const matchesStatus = statusFilter === 'all' || expense.match_status === statusFilter;
    
    return matchesSearch && matchesProject && matchesStatus;
  });

  const filteredLineItems = lineItems.filter(item => {
    const matchesProject = projectFilter === 'all' || item.project_id === projectFilter;
    return matchesProject;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'allocated_to_estimate':
        return <Badge className="bg-blue-100 text-blue-800">Allocated to Estimate</Badge>;
      case 'allocated_to_quote':
        return <Badge className="bg-green-100 text-green-800">Allocated to Quote</Badge>;
      default:
        return <Badge variant="destructive">Unallocated</Badge>;
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
    unallocated: expenses.filter(e => e.match_status === 'unallocated').length,
    allocatedToEstimate: expenses.filter(e => e.match_status === 'allocated_to_estimate').length,
    allocatedToQuote: expenses.filter(e => e.match_status === 'allocated_to_quote').length,
    unallocatedAmount: expenses.filter(e => e.match_status === 'unallocated').reduce((sum, e) => sum + e.amount, 0)
  };

  if (isLoading) {
    return <BrandedLoader message="Loading expense allocation..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold">Global Expense Allocation</h2>
          <p className="text-muted-foreground">
            {projectId 
              ? "Allocate expenses to estimate, quote, and change order line items for this project"
              : "Allocate expenses to estimate, quote, and change order line items across all projects"}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={prepareAutoAllocate} className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Auto-Allocate High Confidence
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
            <div className="text-2xl font-bold text-red-600">{summaryStats.unallocated}</div>
            <p className="text-sm text-muted-foreground">Unallocated</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(summaryStats.unallocatedAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{summaryStats.allocatedToEstimate}</div>
            <p className="text-sm text-muted-foreground">Allocated to Estimates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{summaryStats.allocatedToQuote}</div>
            <p className="text-sm text-muted-foreground">Allocated to Quotes</p>
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
        
        {!projectId && (
          <div className="w-full sm:w-48">
            <Label>Project Filter</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger>
                <SelectValue>
                  {projectFilter === 'all' 
                    ? 'All Projects' 
                    : (() => {
                        const proj = projects.find(p => p.id === projectFilter);
                        return proj ? `${proj.project_number} - ${proj.project_name}` : 'Select Project';
                      })()
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_number} - {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="w-full sm:w-48">
          <Label>Status Filter</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unallocated">Unallocated</SelectItem>
              <SelectItem value="allocated_to_estimate">Allocated to Estimate</SelectItem>
              <SelectItem value="allocated_to_quote">Allocated to Quote</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters() && (
          <div className="w-full sm:w-auto flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="w-full sm:w-auto h-10"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Main Interface */}
      <div className={cn(
        "grid gap-6",
        projectId ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-2"
      )}>
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
                    {expense.confidence_score && expense.match_status === 'unallocated' && 
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
                  {!projectId && expense.project_name && (
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {expense.project_name}
                    </div>
                  )}
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="estimates">Estimates</TabsTrigger>
                <TabsTrigger value="quotes">Quotes</TabsTrigger>
                <TabsTrigger value="change_orders">Change Orders</TabsTrigger>
              </TabsList>
              
              <TabsContent value="estimates" className="space-y-3 mt-4">
                {filteredLineItems.filter(li => li.type === 'estimate').map(item => (
                  <div key={item.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.description}</div>
                        {!projectId && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {item.project_name}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {CATEGORY_DISPLAY_MAP[item.category]}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(item.total)}</div>
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
                        Assign {selectedExpenses.size} expense{selectedExpenses.size === 1 ? '' : 's'}
                      </Button>
                    )}
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="quotes" className="space-y-3 mt-4">
                {filteredLineItems.filter(li => li.type === 'quote').map(item => {
                  const showFuzzyMatchDetails = item.payee_name;
                  const unallocatedExpenses = expenses
                    .filter(exp => 
                      exp.match_status === 'unallocated' && 
                      (projectFilter === 'all' || exp.project_id === projectFilter)
                    )
                    .map(exp => ({
                      id: exp.id,
                      amount: exp.amount,
                      expense_date: exp.expense_date,
                      description: exp.description,
                      category: exp.category,
                      payee_name: exp.payee_name,
                      project_name: exp.project_name,
                      project_number: exp.project_number
                    }));

                  const lineItemContent = (
                    <div 
                      className={cn(
                        "p-3 border rounded-lg transition-all",
                        showFuzzyMatchDetails && "hover:border-primary hover:shadow-sm cursor-help"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-sm">{item.description}</div>
                            {showFuzzyMatchDetails && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1">
                                Hover for matches
                              </Badge>
                            )}
                          </div>
                          {!projectId && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {item.project_name}
                            </div>
                          )}
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
                          Assign {selectedExpenses.size} expense{selectedExpenses.size === 1 ? '' : 's'}
                        </Button>
                      )}
                    </div>
                  );

                  if (showFuzzyMatchDetails) {
                    return (
                      <HoverCard key={item.id} openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          {lineItemContent}
                        </HoverCardTrigger>
                        <HoverCardContent 
                          side="left" 
                          align="start" 
                          className="w-96 p-3"
                          sideOffset={10}
                        >
                          <FuzzyMatchDetailsPanel
                            payeeName={item.payee_name!}
                            unallocatedExpenses={unallocatedExpenses}
                            onAllocateExpense={(expenseId) => {
                              handleBulkAssign(item.id, [expenseId]);
                            }}
                            showAllocateButtons={true}
                          />
                        </HoverCardContent>
                      </HoverCard>
                    );
                  }

                  return <div key={item.id}>{lineItemContent}</div>;
                })}
              </TabsContent>
              
              <TabsContent value="change_orders" className="space-y-3 mt-4">
                {filteredLineItems.filter(li => li.type === 'change_order').map(item => (
                  <div key={item.id} className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/10">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.description}</div>
                        {!projectId && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {item.project_name}
                          </div>
                        )}
                        {item.payee_name && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.payee_name}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {CATEGORY_DISPLAY_MAP[item.category]} • CO {item.change_order_number}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(item.total)}</div>
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Summary Alert */}
      {summaryStats.unallocated > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {summaryStats.unallocated} unallocated expenses totaling{' '}
            {formatCurrency(summaryStats.unallocatedAmount)}. These expenses may represent cost overruns or unexpected costs.
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
                      {expense.description || 'No description'}
                    </div>
                    {expense.payee_name && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />
                        {expense.payee_name}
                      </div>
                    )}
                    {expense.project_name && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Building className="h-3 w-3" />
                        {expense.project_name}
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
                    <div className="font-medium">{lineItem.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {CATEGORY_DISPLAY_MAP[lineItem.category as LineItemCategory]} • 
                      {lineItem.type === 'estimate' ? 'Estimate' : lineItem.type === 'quote' ? 'Quote' : 'Change Order'} •
                      Total: {formatCurrency(lineItem.total)}
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