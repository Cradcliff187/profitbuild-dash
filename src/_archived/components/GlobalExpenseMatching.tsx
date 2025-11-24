import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CollapsibleFilterSection } from '@/components/ui/collapsible-filter-section';
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
  X,
  ChevronDown,
  ChevronRight,
  Split
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExpenseCategory, EXPENSE_CATEGORY_DISPLAY, type ExpenseSplit } from '@/types/expense';
import { LineItemCategory, CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { ProjectCategory } from '@/types/project';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { fuzzyMatchPayee, type PartialPayee } from '@/utils/fuzzyPayeeMatcher';
import { canCorrelateExpense, validateExpensesForCorrelation } from '@/utils/expenseValidation';
import { FuzzyMatchDetailsPanel } from '@/components/FuzzyMatchDetailsPanel';
import { suggestLineItemAllocation, calculateMatchConfidence, LineItemForMatching, EnhancedExpense } from '@/utils/expenseAllocation';

interface GlobalExpenseAllocationProps {
  onClose: () => void;
  projectId?: string; // Optional - if provided, filter to single project
}

interface EnhancedExpenseSplit extends ExpenseSplit {
  expense_amount: number;
  expense_description?: string;
  expense_category: ExpenseCategory;
  expense_date: Date;
  payee_name?: string;
  match_status: 'unallocated' | 'allocated_to_estimate' | 'allocated_to_quote' | 'allocated_to_change_order';
  suggested_line_item_id?: string;
  confidence_score?: number;
}

export const GlobalExpenseAllocation: React.FC<GlobalExpenseAllocationProps> = ({
  onClose,
  projectId
}) => {
  const [searchParams] = useSearchParams();
  const highlightExpenseId = searchParams.get('highlight');
  
  const [expenses, setExpenses] = useState<EnhancedExpense[]>([]);
  const [expenseSplits, setExpenseSplits] = useState<EnhancedExpenseSplit[]>([]);
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
  const [lineItems, setLineItems] = useState<LineItemForMatching[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('unallocated');
  const [splitStatusFilter, setSplitStatusFilter] = useState<string>('all');
  const [projectAssignmentFilter, setProjectAssignmentFilter] = useState<string>('all');
  const [allocationSource, setAllocationSource] = useState<'estimates' | 'quotes' | 'change_orders'>('estimates');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [selectedSplits, setSelectedSplits] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<any[]>([]);
  const [showAutoAllocateDialog, setShowAutoAllocateDialog] = useState(false);
  const [previewAllocations, setPreviewAllocations] = useState<Array<{
    expense: EnhancedExpense;
    lineItem: LineItemForMatching;
    confidence: number;
  }>>([]);
  const { toast } = useToast();
  
  // Calculate allocation statistics
  const allocatedCount = expenses.filter(e => e.match_status !== 'unallocated').length;
  const unallocatedCount = expenses.filter(e => e.match_status === 'unallocated').length;

  // Auto-highlight expense if URL parameter is present
  useEffect(() => {
    if (highlightExpenseId) {
      setSelectedExpenses(new Set([highlightExpenseId]));
      // Scroll to the expense after a short delay to ensure it's rendered
      setTimeout(() => {
        const element = document.getElementById(`expense-${highlightExpenseId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [highlightExpenseId]);

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (searchTerm) count++;
    if (projectFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (splitStatusFilter !== 'all') count++;
    if (projectAssignmentFilter !== 'all') count++;
    return count;
  };

  const hasActiveFilters = (): boolean => {
    return getActiveFilterCount() > 0;
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setProjectFilter("all");
    setStatusFilter("all");
    setSplitStatusFilter("all");
    setProjectAssignmentFilter("all");
  };

  useEffect(() => {
    loadAllocationData();
    if (projectId) {
      setProjectFilter(projectId);
    }
  }, [projectId]);

  const loadAllocationData = async () => {
    setIsLoading(true);
    try {
      // Load all expenses with their current correlations and splits
      const [expensesResult, splitsResult, projectsResult, estimatesResult, quotesResult, changeOrdersResult, correlationsResult] = await Promise.all([
        projectId 
          ? supabase
              .from('expenses')
              .select(`
                *,
                payees (payee_name),
                projects (project_name, project_number, category)
              `)
              .eq('project_id', projectId)
          : supabase
              .from('expenses')
               .select(`
                 *,
                 payees (payee_name),
                 projects (project_name, project_number, category)
               `),
        // Load expense splits with project information
        projectId
          ? supabase
              .from('expense_splits')
              .select(`
                *,
                projects (project_name, project_number),
                expenses!inner (
                  amount,
                  description,
                  category,
                  expense_date,
                  payee_id,
                  project_id,
                  payees (payee_name)
                )
              `)
              .eq('expenses.project_id', projectId)
          : supabase
              .from('expense_splits')
              .select(`
                *,
                projects (project_name, project_number),
                expenses!inner (
                  amount,
                  description,
                  category,
                  expense_date,
                  payee_id,
                  project_id,
                  payees (payee_name)
                )
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
      const rawSplits = splitsResult.data || [];
      const correlations = correlationsResult.data || [];
      const projects = projectsResult.data || [];
      const estimates = estimatesResult.data || [];
      const quotes = quotesResult.data || [];
      const changeOrders = changeOrdersResult.data || [];

      // Create line items from estimates and quotes
      const acceptedQuotes = quotes.filter(quote => quote.status === 'accepted');

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

      // Only include estimate line items that DON'T have accepted quotes
      // If a quote exists, we'll show the quote instead (actual committed cost)
      const estimateLineItems: LineItemForMatching[] = estimates.flatMap(estimate => 
        (estimate.estimate_line_items || [])
          .filter(item => !estimateLineItemsWithQuotes.has(item.id))
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

      // Calculate allocated amounts (from both full expenses and splits)
      correlations.forEach(correlation => {
        let allocatedAmount = 0;
        
        // Check if it's a split allocation
        if (correlation.expense_split_id) {
          const split = rawSplits.find(s => s.id === correlation.expense_split_id);
          if (split) {
            allocatedAmount = split.split_amount;
          }
        } else {
          // Regular expense allocation
          const expense = rawExpenses.find(e => e.id === correlation.expense_id);
          if (expense) {
            allocatedAmount = expense.amount;
          }
        }
        
        const lineItem = allLineItems.find(li => 
          li.id === correlation.estimate_line_item_id || 
          (correlation.quote_id && li.source_id === correlation.quote_id) ||
          li.id === correlation.change_order_line_item_id
        );
        
        if (lineItem) {
          lineItem.allocated_amount += allocatedAmount;
        }
      });

      // Process expenses with match status and splits
      const enhancedExpenses: EnhancedExpense[] = rawExpenses
        .map(expense => {
          const correlation = correlations.find(c => c.expense_id === expense.id && !c.expense_split_id);
          let matchStatus: 'unallocated' | 'allocated_to_estimate' | 'allocated_to_quote' | 'allocated_to_change_order' = 'unallocated';
          
          // Check if ANY non-split correlation exists for this expense
          if (correlation) {
            if (correlation.estimate_line_item_id) {
              matchStatus = 'allocated_to_estimate';
            } else if (correlation.quote_id) {
              matchStatus = 'allocated_to_quote';
            } else if (correlation.change_order_line_item_id) {
              matchStatus = 'allocated_to_change_order';
            }
          }

          // Get splits for this expense and convert dates
          const expenseSplits = rawSplits
            .filter(s => s.expense_id === expense.id)
            .map(s => ({
              ...s,
              created_at: new Date(s.created_at),
              updated_at: new Date(s.updated_at)
            }));

          // Create temporary EnhancedExpense for function calls
          const tempExpense: EnhancedExpense = {
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
            project_category: expense.projects?.category as ProjectCategory | undefined,
            match_status: matchStatus,
            is_split: expense.is_split || false
          };

          return {
            ...tempExpense,
            suggested_line_item_id: suggestLineItemAllocation(tempExpense, allLineItems),
            confidence_score: calculateMatchConfidence(tempExpense, allLineItems),
            splits: expenseSplits
          };
        })
        .filter(expense => {
          // Only show expenses that CAN be correlated
          const validation = canCorrelateExpense({
            is_split: expense.is_split || false,
            project_id: expense.project_id,
            project_number: expense.project_number,
            category: expense.project_category
          });
          return validation.isValid;
        });

      // Process expense splits as allocatable items
      const enhancedSplits: EnhancedExpenseSplit[] = rawSplits.map(split => {
        const parentExpense = rawExpenses.find(e => e.id === split.expense_id);
        const correlation = correlations.find(c => c.expense_split_id === split.id);
        let matchStatus: 'unallocated' | 'allocated_to_estimate' | 'allocated_to_quote' | 'allocated_to_change_order' = 'unallocated';
        
        if (correlation) {
          if (correlation.estimate_line_item_id) {
            matchStatus = 'allocated_to_estimate';
          } else if (correlation.quote_id) {
            matchStatus = 'allocated_to_quote';
          } else if (correlation.change_order_line_item_id) {
            matchStatus = 'allocated_to_change_order';
          }
        }

        // Create a temporary expense object for suggestion logic
        const tempExpense = {
          ...split,
          amount: split.split_amount,
          category: parentExpense?.category,
          payee_id: parentExpense?.payee_id,
          payee_name: parentExpense?.payees?.payee_name,
          description: parentExpense?.description,
          expense_date: parentExpense?.expense_date
        };

        return {
          ...split,
          created_at: new Date(split.created_at),
          updated_at: new Date(split.updated_at),
          expense_amount: parentExpense?.amount || 0,
          expense_description: parentExpense?.description,
          expense_category: parentExpense?.category as ExpenseCategory,
          expense_date: new Date(parentExpense?.expense_date || new Date()),
          payee_name: parentExpense?.payees?.payee_name,
          project_name: split.projects?.project_name,
          project_number: split.projects?.project_number,
          match_status: matchStatus,
          suggested_line_item_id: suggestLineItemAllocation(tempExpense, allLineItems),
          confidence_score: calculateMatchConfidence(tempExpense, allLineItems)
        };
      });

      setExpenses(enhancedExpenses);
      setExpenseSplits(enhancedSplits);
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

  const handleBulkAssign = async (lineItemId: string, expenseIdsOverride?: string[], splitIdsOverride?: string[]) => {
    let expenseIds = expenseIdsOverride || Array.from(selectedExpenses);
    const splitIds = splitIdsOverride || Array.from(selectedSplits);
    const lineItem = lineItems.find(li => li.id === lineItemId);
    
    if (expenseIds.length === 0 && splitIds.length === 0) {
      toast({
        title: "No expenses or splits selected",
        description: "Please select at least one expense or split to allocate",
        variant: "destructive"
      });
      return;
    }
    
    if (!lineItem) return;

    try {
      // Validate expenses before allocation - prevent correlating split parents
      if (expenseIds.length > 0) {
        const expensesToValidate = expenses.filter(e => expenseIds.includes(e.id));
        const { valid, invalid } = validateExpensesForCorrelation(
          expensesToValidate.map(e => ({
            is_split: e.is_split || false,
            project_id: e.project_id,
            project_number: e.project_number,
            category: e.project_category
          }))
        );
        
        if (invalid.length > 0) {
          toast({
            title: "Some expenses skipped",
            description: `${invalid.length} split parent expense(s) cannot be correlated. Only individual splits can be assigned.`,
            variant: "destructive"
          });
          
          // If all expenses are invalid, stop here
          if (valid.length === 0 && splitIds.length === 0) {
            toast({
              title: "No valid expenses",
              description: "All selected expenses are split parents. Please select individual split records instead.",
              variant: "destructive"
            });
            return;
          }
        }
        
        // Update expenseIds to only include valid ones - match by mapping back to original expenses
        const validSet = new Set(valid.map(v => `${v.project_id}-${v.project_number}-${v.is_split}-${v.category}`));
        expenseIds = expensesToValidate
          .filter(e => {
            const key = `${e.project_id}-${e.project_number}-${e.is_split || false}-${e.project_category}`;
            return validSet.has(key);
          })
          .map(e => e.id);
      }
      // Validate split allocations - splits can only be allocated to line items in the same project
      if (splitIds.length > 0) {
        const invalidSplits = expenseSplits.filter(split => 
          splitIds.includes(split.id) && split.project_id !== lineItem.project_id
        );
        
        if (invalidSplits.length > 0) {
          toast({
            title: "Invalid Split Allocation",
            description: `Cannot allocate splits to line items in different projects. ${invalidSplits.length} split(s) belong to different projects.`,
            variant: "destructive"
          });
          return;
        }
      }

      const correlations = [];

      // Create correlations for regular expenses
      if (expenseIds.length > 0) {
        correlations.push(...expenseIds.map(expenseId => ({
          expense_id: expenseId,
          estimate_line_item_id: lineItem.type === 'estimate' ? lineItem.id : null,
          quote_id: lineItem.type === 'quote' ? lineItem.source_id : null,
          change_order_line_item_id: lineItem.type === 'change_order' ? lineItem.id : null,
          correlation_type: lineItem.type === 'estimate' ? 'estimated' : lineItem.type === 'quote' ? 'quoted' : 'change_order',
          auto_correlated: false,
          notes: 'Manually assigned via Global Expense Allocation'
        })));
      }

      // Create correlations for expense splits
      if (splitIds.length > 0) {
        correlations.push(...splitIds.map(splitId => ({
          expense_id: null, // Must be null per check_expense_or_split constraint
          expense_split_id: splitId,
          estimate_line_item_id: lineItem.type === 'estimate' ? lineItem.id : null,
          quote_id: lineItem.type === 'quote' ? lineItem.source_id : null,
          change_order_line_item_id: lineItem.type === 'change_order' ? lineItem.id : null,
          correlation_type: lineItem.type === 'estimate' ? 'estimated' : lineItem.type === 'quote' ? 'quoted' : 'change_order',
          auto_correlated: false,
          notes: 'Manually assigned split via Global Expense Allocation'
        })));
      }

      const { error: correlationError } = await supabase
        .from('expense_line_item_correlations')
        .insert(correlations);

      if (correlationError) throw correlationError;

      // Update expenses to mark them as planned (only for non-split expenses)
      if (expenseIds.length > 0) {
        const { error: updateError } = await supabase
          .from('expenses')
          .update({ is_planned: true })
          .in('id', expenseIds);

        if (updateError) throw updateError;
      }

      const totalAllocated = expenseIds.length + splitIds.length;
      toast({
        title: "Allocation Complete",
        description: `Allocated ${totalAllocated} item${totalAllocated === 1 ? '' : 's'} (${expenseIds.length} expense${expenseIds.length === 1 ? '' : 's'}, ${splitIds.length} split${splitIds.length === 1 ? '' : 's'}) to ${lineItem.type} line item.`
      });
      
      setSelectedExpenses(new Set());
      setSelectedSplits(new Set());
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
    // Filter out split parent containers - they shouldn't appear in allocation UI
    if (expense.project_number === 'SYS-000') {
      return false;
    }
    
    const matchesSearch = !searchTerm || 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.payee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = projectFilter === 'all' || expense.project_id === projectFilter;
    const matchesStatus = statusFilter === 'all' || expense.match_status === statusFilter;
    
    // Split status filter
    const matchesSplitStatus = 
      splitStatusFilter === 'all' ||
      (splitStatusFilter === 'split' && expense.is_split) ||
      (splitStatusFilter === 'unsplit' && !expense.is_split);
    
    // Project assignment filter
    const isSystemProject = expense.project_number === 'SYS-000' || expense.project_number === '000-UNASSIGNED';
    const matchesProjectAssignment = 
      projectAssignmentFilter === 'all' ||
      (projectAssignmentFilter === 'real_projects' && !isSystemProject) ||
      (projectAssignmentFilter === 'system_projects' && isSystemProject);
    
    return matchesSearch && matchesProject && matchesStatus && matchesSplitStatus && matchesProjectAssignment;
  });

  const filteredSplits = expenseSplits.filter(split => {
    const matchesProject = projectFilter === 'all' || split.project_id === projectFilter;
    const matchesStatus = statusFilter === 'all' || split.match_status === statusFilter;
    
    // Only show splits if the parent expense passes the split filter
    const parentExpense = expenses.find(e => e.id === split.expense_id);
    const matchesSplitStatus = 
      splitStatusFilter === 'all' ||
      (splitStatusFilter === 'split' && parentExpense?.is_split);
    
    return matchesProject && matchesStatus && matchesSplitStatus;
  });

  // Determine which projects to show based on selected expenses
  const getActiveProjectFilters = (): Set<string> => {
    // If no expenses are selected, use the manual project filter
    if (selectedExpenses.size === 0 && selectedSplits.size === 0) {
      return projectFilter === 'all' 
        ? new Set(projects.map(p => p.id)) 
        : new Set([projectFilter]);
    }
    
    // If expenses are selected, auto-filter to their projects
    const projectIds = new Set<string>();
    
    expenses.forEach(exp => {
      if (selectedExpenses.has(exp.id)) {
        projectIds.add(exp.project_id);
      }
    });
    
    expenseSplits.forEach(split => {
      if (selectedSplits.has(split.id)) {
        projectIds.add(split.project_id);
      }
    });
    
    return projectIds;
  };

  const activeProjectFilters = getActiveProjectFilters();

  const filteredLineItems = lineItems.filter(item => {
    return activeProjectFilters.has(item.project_id);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'allocated_to_estimate':
        return <Badge className="bg-blue-100 text-blue-800">Allocated to Estimate</Badge>;
      case 'allocated_to_quote':
        return <Badge className="bg-green-100 text-green-800">Allocated to Quote</Badge>;
      case 'allocated_to_change_order':
        return <Badge className="bg-purple-100 text-purple-800">Allocated to Change Order</Badge>;
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

  // Calculate unallocated amount correctly:
  // - Non-split expenses: count full amount if unallocated
  // - Split expenses: count only unallocated split amounts
  const summaryStats = {
    total: expenses.length,
    unallocated: expenses.filter(e => e.match_status === 'unallocated').length,
    allocatedToEstimate: expenses.filter(e => e.match_status === 'allocated_to_estimate').length,
    allocatedToQuote: expenses.filter(e => e.match_status === 'allocated_to_quote').length,
    unallocatedAmount: (() => {
      let total = 0;
      
      // Sum non-split unallocated expenses (full amount)
      const nonSplitUnallocated = expenses.filter(e => 
        e.match_status === 'unallocated' && !e.is_split
      );
      total += nonSplitUnallocated.reduce((sum, e) => sum + e.amount, 0);
      
      // Sum split unallocated amounts (only unallocated splits)
      const splitExpenseIds = new Set(
        expenses.filter(e => e.is_split).map(e => e.id)
      );
      const unallocatedSplits = expenseSplits.filter(split => 
        splitExpenseIds.has(split.expense_id) && 
        split.match_status === 'unallocated'
      );
      total += unallocatedSplits.reduce((sum, split) => sum + split.split_amount, 0);
      
      return total;
    })()
  };

  if (isLoading) {
    return <BrandedLoader message="Loading expense allocation..." />;
  }

  return (
    <div className="space-y-6">
      {/* Compact Metrics + Actions Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-bold">{expenses.length}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-success/10 rounded">
            <span className="text-muted-foreground">Allocated:</span>
            <span className="font-bold text-success">{allocatedCount}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-warning/10 rounded">
            <span className="text-muted-foreground">Unallocated:</span>
            <span className="font-bold text-warning">{unallocatedCount}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <CollapsibleFilterSection
        title="Filter Expenses"
        hasActiveFilters={hasActiveFilters()}
        activeFilterCount={getActiveFilterCount()}
        onClearFilters={handleClearFilters}
        resultCount={filteredExpenses.length}
        defaultExpanded={hasActiveFilters()}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {/* Search - Full Width */}
          <div className="md:col-span-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search by payee, project, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          
          {/* Project Filter */}
          {!projectId && (
            <Select 
              value={projectFilter} 
              onValueChange={setProjectFilter}
              disabled={selectedExpenses.size > 0 || selectedSplits.size > 0}
            >
              <SelectTrigger className="h-9">
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
          )}
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Allocation Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unallocated">⚠️ Unallocated</SelectItem>
              <SelectItem value="allocated_to_estimate">✅ Allocated to Estimate</SelectItem>
              <SelectItem value="allocated_to_quote">✅ Allocated to Quote</SelectItem>
              <SelectItem value="allocated_to_change_order">✅ Allocated to Change Order</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Split Status Filter */}
          <Select value={splitStatusFilter} onValueChange={setSplitStatusFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Split Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Expenses</SelectItem>
              <SelectItem value="split">Split Only</SelectItem>
              <SelectItem value="unsplit">Single Project</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Assignment Status Filter */}
          <Select value={projectAssignmentFilter} onValueChange={setProjectAssignmentFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Assignment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Expenses</SelectItem>
              <SelectItem value="real_projects">✅ Ready to Allocate</SelectItem>
              <SelectItem value="system_projects">⚠️ Needs Assignment</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Auto-filter notification */}
          {(selectedExpenses.size > 0 || selectedSplits.size > 0) && (
            <div className="md:col-span-4">
              <p className="text-xs text-muted-foreground">
                ℹ️ Auto-filtering line items by selected expense projects
              </p>
            </div>
          )}
        </div>
      </CollapsibleFilterSection>

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
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {filteredExpenses.map(expense => (
              <div key={expense.id}>
                {/* Parent Expense Row */}
                <div
                  id={`expense-${expense.id}`}
                  className={cn(
                    "p-3 border rounded-lg transition-colors",
                    expense.is_split ? "cursor-default" : "cursor-pointer",
                    !expense.is_split && selectedExpenses.has(expense.id) && "border-primary bg-primary/5",
                    !expense.is_split && "hover:bg-muted/50",
                    highlightExpenseId === expense.id && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => {
                    if (expense.is_split) {
                      const newExpanded = new Set(expandedExpenses);
                      if (newExpanded.has(expense.id)) {
                        newExpanded.delete(expense.id);
                      } else {
                        newExpanded.add(expense.id);
                      }
                      setExpandedExpenses(newExpanded);
                    } else {
                      // Validate before allowing selection
                      const validation = canCorrelateExpense({
                        is_split: expense.is_split || false,
                        project_id: expense.project_id,
                        project_number: expense.project_number,
                        category: expense.project_category
                      });
                      if (!validation.isValid) {
                        toast({
                          title: "Cannot select",
                          description: validation.error,
                          variant: "destructive",
                          duration: 2000
                        });
                        return;
                      }
                      
                      const newSelected = new Set(selectedExpenses);
                      if (newSelected.has(expense.id)) {
                        newSelected.delete(expense.id);
                      } else {
                        newSelected.add(expense.id);
                      }
                      setSelectedExpenses(newSelected);
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {expense.is_split && (
                        expandedExpenses.has(expense.id) 
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                      {expense.is_split && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Split className="h-3 w-3" />
                          Split ({expense.splits?.length || 0})
                        </Badge>
                      )}
                      {!expense.is_split && getStatusBadge(expense.match_status)}
                      {expense.project_number !== 'SYS-000' && (
                        <Badge
                          variant={
                            expense.project_number === "000-UNASSIGNED"
                              ? "secondary"
                              : "default"
                          }
                          className="text-xs"
                        >
                          {expense.project_number === "000-UNASSIGNED"
                            ? "Needs Assignment"
                            : "Assigned"
                          }
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(expense.expense_date, 'MMM dd')}
                    </div>
                  </div>
                  
                  <div className="text-sm mb-1 font-medium">{expense.payee_name || 'No payee'}</div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {!projectId && expense.project_name && expense.project_number !== 'SYS-000' && (
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

                {/* Split Rows (Expandable) */}
                {expense.is_split && expandedExpenses.has(expense.id) && (
                  <div className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-3">
                    {filteredSplits
                      .filter(split => split.expense_id === expense.id)
                      .map(split => (
                        <div
                          key={split.id}
                          className={cn(
                            "p-2 border rounded-lg cursor-pointer transition-colors bg-muted/30",
                            selectedSplits.has(split.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            const newSelected = new Set(selectedSplits);
                            if (newSelected.has(split.id)) {
                              newSelected.delete(split.id);
                            } else {
                              newSelected.add(split.id);
                            }
                            setSelectedSplits(newSelected);
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{formatCurrency(split.split_amount)}</span>
                              <span className="text-xs text-muted-foreground">
                                ({((split.split_amount / expense.amount) * 100).toFixed(1)}%)
                              </span>
                              {getStatusBadge(split.match_status)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {split.project_name || 'Unknown Project'}
                          </div>
                          {split.notes && (
                            <div className="text-xs text-muted-foreground mt-1 italic">
                              {split.notes}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
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
            {(selectedExpenses.size > 0 || selectedSplits.size > 0) && (
              <Alert className="mb-3">
                <Target className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-sm">
                    Showing line items from {activeProjectFilters.size === 1 
                      ? 'the selected expense\'s project' 
                      : `${activeProjectFilters.size} projects with selected expenses`}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSelectedExpenses(new Set());
                      setSelectedSplits(new Set());
                    }}
                    className="h-7 px-2 text-xs ml-2"
                  >
                    Clear selection
                  </Button>
                </AlertDescription>
              </Alert>
            )}
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
                    
                      {(selectedExpenses.size > 0 || selectedSplits.size > 0) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => handleBulkAssign(item.id)}
                        >
                          Assign {selectedExpenses.size + selectedSplits.size} item{selectedExpenses.size + selectedSplits.size === 1 ? '' : 's'}
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
                      
                    {(selectedExpenses.size > 0 || selectedSplits.size > 0) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => handleBulkAssign(item.id)}
                      >
                        Assign {selectedExpenses.size + selectedSplits.size} item{selectedExpenses.size + selectedSplits.size === 1 ? '' : 's'}
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
                    
                    {(selectedExpenses.size > 0 || selectedSplits.size > 0) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => handleBulkAssign(item.id)}
                      >
                        Allocate {selectedExpenses.size + selectedSplits.size} item{selectedExpenses.size + selectedSplits.size === 1 ? '' : 's'}
                      </Button>
                    )}
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

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