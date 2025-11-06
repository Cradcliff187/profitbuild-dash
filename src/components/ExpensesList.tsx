import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Search, FileDown, MoreHorizontal, Edit2, Trash2, ExternalLink, AlertTriangle, CheckCircle2, Target, FolderOpen, Info, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EntityTableTemplate } from "./EntityTableTemplate";
import { ExpenseBulkActions } from "./ExpenseBulkActions";
import { ReassignExpenseProjectDialog } from "./ReassignExpenseProjectDialog";
import { ExpenseSplitDialog } from "./ExpenseSplitDialog";
import { Expense, ExpenseCategory, TransactionType, ExpenseSplit, EXPENSE_CATEGORY_DISPLAY, TRANSACTION_TYPE_DISPLAY } from "@/types/expense";
import { formatCurrency } from "@/lib/utils";
import { getExpenseSplits } from "@/utils/expenseSplits";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExpensesListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  enablePagination?: boolean;
  pageSize?: number;
}

export const ExpensesList: React.FC<ExpensesListProps> = ({
  expenses,
  onEdit,
  onDelete,
  onRefresh,
  enablePagination = true,
  pageSize = 25,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTransactionType, setFilterTransactionType] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterMatchStatus, setFilterMatchStatus] = useState<string>("all");
  const [filterApprovalStatus, setFilterApprovalStatus] = useState<string>("all");
  const [filterSplitStatus, setFilterSplitStatus] = useState<string>("all");
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [expenseMatches, setExpenseMatches] = useState<Record<string, { matched: boolean; type?: 'estimate' | 'quote' | 'change_order' }>>({});
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [expenseToReassign, setExpenseToReassign] = useState<Expense | null>(null);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [expenseToSplit, setExpenseToSplit] = useState<Expense | null>(null);
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
  const [expenseSplits, setExpenseSplits] = useState<Record<string, ExpenseSplit[]>>({});
  const { toast } = useToast();

  // Load projects for filter dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, project_name")
          .order("project_name");
        
        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchProjects();
  }, []);

  // Load expense line item matches and splits
  useEffect(() => {
    const fetchExpenseMatches = async () => {
      if (expenses.length === 0) return;
      
      try {
        const { data, error } = await supabase
          .from("expense_line_item_correlations")
          .select("expense_id, correlation_type, estimate_line_item_id, quote_id, change_order_line_item_id")
          .in("expense_id", expenses.map(e => e.id));
        
        if (error) throw error;
        
        const matches: Record<string, { matched: boolean; type?: 'estimate' | 'quote' | 'change_order' }> = {};
        expenses.forEach(expense => {
          const correlation = data?.find(c => c.expense_id === expense.id);
          if (correlation) {
            // Determine type based on which ID field is populated
            let type: 'estimate' | 'quote' | 'change_order' = 'estimate';
            if (correlation.quote_id) {
              type = 'quote';
            } else if (correlation.change_order_line_item_id) {
              type = 'change_order';
            } else if (correlation.estimate_line_item_id) {
              type = 'estimate';
            }
            matches[expense.id] = { matched: true, type };
          } else {
            matches[expense.id] = { matched: false };
          }
        });
        
        setExpenseMatches(matches);
      } catch (error) {
        console.error("Error fetching expense matches:", error);
      }
    };

    const fetchExpenseSplits = async () => {
      if (expenses.length === 0) return;
      
      const splitExpenses = expenses.filter(e => e.is_split);
      if (splitExpenses.length === 0) return;
      
      try {
        const splitsData: Record<string, ExpenseSplit[]> = {};
        
        await Promise.all(
          splitExpenses.map(async (expense) => {
            const splits = await getExpenseSplits(expense.id);
            splitsData[expense.id] = splits;
          })
        );
        
        setExpenseSplits(splitsData);
      } catch (error) {
        console.error("Error fetching expense splits:", error);
      }
    };

    fetchExpenseMatches();
    fetchExpenseSplits();
  }, [expenses]);

  // Filter expenses based on search term and filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesSearch = 
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.payee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = filterCategory === "all" || expense.category === filterCategory;
      const matchesType = filterTransactionType === "all" || expense.transaction_type === filterTransactionType;
      const matchesProject = filterProject === "all" || expense.project_id === filterProject;
      const matchesApprovalStatus = filterApprovalStatus === "all" || (expense.approval_status || 'pending') === filterApprovalStatus;
      
      let matchesMatchStatus = true;
      if (filterMatchStatus === "matched") {
        matchesMatchStatus = expenseMatches[expense.id]?.matched === true;
      } else if (filterMatchStatus === "unmatched") {
        matchesMatchStatus = expenseMatches[expense.id]?.matched === false;
      } else if (filterMatchStatus === "unassigned") {
        matchesMatchStatus = expense.project_id === "000-UNASSIGNED" || expense.project_name?.includes("Unassigned");
      }

      let matchesSplitStatus = true;
      if (filterSplitStatus === "split") {
        matchesSplitStatus = expense.is_split === true;
      } else if (filterSplitStatus === "unsplit") {
        matchesSplitStatus = !expense.is_split;
      }

      return matchesSearch && matchesCategory && matchesType && matchesProject && matchesMatchStatus && matchesApprovalStatus && matchesSplitStatus;
    });
  }, [expenses, searchTerm, filterCategory, filterTransactionType, filterProject, filterMatchStatus, filterApprovalStatus, filterSplitStatus, expenseMatches]);

  const handleDelete = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense deleted successfully.",
      });
      
      onDelete(expenseId);
      onRefresh();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense.",
        variant: "destructive",
      });
    }
  };

  const handleApprovalAction = async (expenseId: string, action: 'submit' | 'approve' | 'reject', rejectionReason?: string) => {
    try {
      let updateData: any = {};
      
      if (action === 'submit') {
        updateData = { approval_status: 'pending' };
      } else if (action === 'approve') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData = { 
          approval_status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        };
      } else if (action === 'reject') {
        updateData = { 
          approval_status: 'rejected',
          rejection_reason: rejectionReason
        };
      }

      const { error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Expense ${action === 'submit' ? 'submitted for approval' : action === 'approve' ? 'approved' : 'rejected'}.`,
      });
      
      onRefresh();
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast({
        title: "Error",
        description: "Failed to update approval status.",
        variant: "destructive",
      });
    }
  };

  const exportToCsv = async () => {
    const headers = ['Date', 'Project', 'Project Assignment', 'Payee', 'Category', 'Transaction Type', 'Amount', 'Approval Status', 'Line Item Allocation', 'Is Split', 'Split Type', 'Split Notes'];
    
    const csvRows: string[] = [];
    let totalRows = 0;
    
    for (const expense of filteredExpenses) {
      const isPlaceholder = expense.project_id === "000-UNASSIGNED" || 
                           expense.project_name?.includes("Unassigned") ||
                           expense.project_id === "SYS-000";
      
      // Add parent expense row
      csvRows.push([
        expense.expense_date.toLocaleDateString(),
        `"${expense.project_name || ''}"`,
        isPlaceholder ? 'Needs Assignment' : 'Assigned',
        `"${expense.payee_name || ''}"`,
        `"${EXPENSE_CATEGORY_DISPLAY[expense.category] || expense.category}"`,
        `"${TRANSACTION_TYPE_DISPLAY[expense.transaction_type] || expense.transaction_type}"`,
        expense.amount,
        (expense.approval_status || 'pending').charAt(0).toUpperCase() + (expense.approval_status || 'pending').slice(1),
        isPlaceholder ? '—' : (expenseMatches[expense.id]?.matched 
          ? `Allocated (${expenseMatches[expense.id].type})` 
          : 'Unallocated'),
        expense.is_split ? 'Yes' : 'No',
        expense.is_split ? 'Parent' : 'Single',
        ''
      ].join(','));
      totalRows++;
      
      // If expense is split, add child split rows
      if (expense.is_split && expense.id) {
        const splits = expenseSplits[expense.id] || [];
        for (const split of splits) {
          csvRows.push([
            expense.expense_date.toLocaleDateString(),
            `"${split.project_name || ''}"`,
            'Split Allocation',
            `"${expense.payee_name || ''}"`,
            `"${EXPENSE_CATEGORY_DISPLAY[expense.category] || expense.category}"`,
            `"${TRANSACTION_TYPE_DISPLAY[expense.transaction_type] || expense.transaction_type}"`,
            split.split_amount.toFixed(2),
            (expense.approval_status || 'pending').charAt(0).toUpperCase() + (expense.approval_status || 'pending').slice(1),
            '—',
            'Yes',
            `Split (${split.split_percentage?.toFixed(1)}%)`,
            `"${split.notes || ''}"`
          ].join(','));
          totalRows++;
        }
      }
    }
    
    const csvContent = [headers.join(','), ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export successful",
      description: `${filteredExpenses.length} expenses (${totalRows} total rows including splits) exported to CSV`,
    });
  };

  const handleSelectAll = () => {
    if (selectedExpenses.length === filteredExpenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(filteredExpenses.map(e => e.id));
    }
  };

  const handleSelectExpense = (expenseId: string) => {
    if (selectedExpenses.includes(expenseId)) {
      setSelectedExpenses(selectedExpenses.filter(id => id !== expenseId));
    } else {
      setSelectedExpenses([...selectedExpenses, expenseId]);
    }
  };

  const getCategoryBadgeVariant = (category: ExpenseCategory) => {
    switch (category) {
      case ExpenseCategory.LABOR:
        return 'default';
      case ExpenseCategory.SUBCONTRACTOR:
        return 'secondary';
      case ExpenseCategory.MATERIALS:
        return 'outline';
      case ExpenseCategory.EQUIPMENT:
        return 'default';
      case ExpenseCategory.PERMITS:
        return 'secondary';
      case ExpenseCategory.MANAGEMENT:
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getTypeBadgeVariant = (type: TransactionType) => {
    switch (type) {
      case 'expense':
        return 'default';
      case 'bill':
        return 'secondary';
      case 'check':
        return 'outline';
      case 'credit_card':
        return 'default';
      case 'cash':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const toggleExpanded = (expenseId: string) => {
    setExpandedExpenses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(expenseId)) {
        newSet.delete(expenseId);
      } else {
        newSet.add(expenseId);
      }
      return newSet;
    });
  };

  // Create display data that includes split rows
  type DisplayRow = Expense & { _isSplitRow?: boolean; _splitData?: ExpenseSplit; _parentExpenseId?: string };
  
  const displayData = useMemo((): DisplayRow[] => {
    const result: DisplayRow[] = [];
    
    filteredExpenses.forEach(expense => {
      result.push(expense as DisplayRow);
      
      // If expense is split and expanded, add split rows
      if (expense.is_split && expandedExpenses.has(expense.id)) {
        const splits = expenseSplits[expense.id] || [];
        splits.forEach(split => {
          result.push({
            ...expense,
            _isSplitRow: true,
            _splitData: split,
            _parentExpenseId: expense.id,
            id: `${expense.id}_split_${split.id}`, // Unique ID for rendering
          } as DisplayRow);
        });
      }
    });
    
    return result;
  }, [filteredExpenses, expandedExpenses, expenseSplits]);

  const columns = [
    {
      key: 'split_indicator',
      label: '',
      sortable: false,
      render: (row: DisplayRow) => {
        if (row._isSplitRow) {
          return <div className="pl-6" />; // Indent for split rows
        }
        
        if (!row.is_split) return null;
        
        const isExpanded = expandedExpenses.has(row.id);
        const splits = expenseSplits[row.id] || [];
        
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => toggleExpanded(row.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        );
      }
    },
    {
      key: 'expense_date',
      label: 'Date',
      sortable: true,
      render: (row: DisplayRow) => {
        if (row._isSplitRow) return null;
        
        return (
          <div className="text-data font-mono">
            {row.expense_date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
          </div>
        );
      }
    },
    {
      key: 'project_name',
      label: 'Project',
      sortable: true,
      render: (row: DisplayRow) => {
        if (row._isSplitRow && row._splitData) {
          return (
            <div className="pl-6 flex items-center gap-2 bg-muted/30 -mx-2 px-2 py-1 rounded">
              <Badge variant="outline" className="compact-badge text-xs">
                {row._splitData.split_percentage?.toFixed(1)}%
              </Badge>
              <span className="text-sm">{row._splitData.project_name}</span>
            </div>
          );
        }
        
        return (
          <div className={row.project_name?.includes("Unassigned") ? "text-muted-foreground italic" : ""}>
            {row.project_name}
          </div>
        );
      }
    },
    {
      key: 'project_status',
      label: 'Project Assignment',
      sortable: false,
      render: (row: DisplayRow) => {
        if (row._isSplitRow) return null;
        
        const isPlaceholder = row.project_id === "000-UNASSIGNED" || 
                             row.project_name?.includes("Unassigned") ||
                             row.project_id === "SYS-000";
        
        if (isPlaceholder) {
          return (
            <Badge variant="outline" className="compact-badge text-warning border-warning/50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Needs Assignment
            </Badge>
          );
        }
        
        return (
          <Badge variant="outline" className="compact-badge text-success border-success/50">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Assigned
          </Badge>
        );
      }
    },
    {
      key: 'payee_name',
      label: 'Payee',
      sortable: true,
      render: (row: DisplayRow) => {
        if (row._isSplitRow && row._splitData?.notes) {
          return (
            <div className="pl-6 text-xs text-muted-foreground italic">
              {row._splitData.notes}
            </div>
          );
        }
        if (row._isSplitRow) return null;
        return row.payee_name;
      }
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (row: DisplayRow) => {
        if (row._isSplitRow && row._splitData) {
          return (
            <div className="text-right text-data font-mono font-medium pl-6">
              {formatCurrency(row._splitData.split_amount, { showCents: true })}
            </div>
          );
        }
        
        return (
          <div className="text-right text-data font-mono font-medium">
            {formatCurrency(row.amount, { showCents: true })}
          </div>
        );
      }
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (row: DisplayRow) => {
        if (row._isSplitRow) return null;
        
        return (
          <Badge variant={getCategoryBadgeVariant(row.category)} className="compact-badge">
            {EXPENSE_CATEGORY_DISPLAY[row.category]}
          </Badge>
        );
      }
    },
    {
      key: 'transaction_type',
      label: 'Type',
      sortable: true,
      render: (row: DisplayRow) => {
        if (row._isSplitRow) return null;
        
        return (
          <Badge variant={getTypeBadgeVariant(row.transaction_type)} className="compact-badge">
            {TRANSACTION_TYPE_DISPLAY[row.transaction_type]}
          </Badge>
        );
      }
    },
    {
      key: 'approval_status',
      label: 'Status',
      sortable: true,
      render: (row: DisplayRow) => {
        if (row._isSplitRow) return null;
        
        const status = row.approval_status || 'pending';
        const variant = status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : status === 'pending' ? 'secondary' : 'outline';
        return (
          <Badge variant={variant} className="compact-badge">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      }
    },
    {
      key: 'line_item_allocation',
      label: 'Line Item Allocation',
      sortable: false,
      render: (row: DisplayRow) => {
        if (row._isSplitRow) return null;
        
        const isPlaceholder = row.project_id === "000-UNASSIGNED" || 
                             row.project_name?.includes("Unassigned") ||
                             row.project_id === "SYS-000";
        
        // Show dash for placeholder projects
        if (isPlaceholder) {
          return <span className="text-muted-foreground">—</span>;
        }
        
        // Show allocation status for real projects
        const match = expenseMatches[row.id];
        if (match?.matched) {
          const displayType = match.type === 'estimate' ? 'Estimate' 
                            : match.type === 'quote' ? 'Quote'
                            : 'Change Order';
          
          return (
            <Badge variant="outline" className="compact-badge text-success border-success/50">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              → {displayType}
            </Badge>
          );
        }
        
        return (
          <Badge variant="outline" className="compact-badge text-warning border-warning/50">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Unallocated
          </Badge>
        );
      }
    }
  ];

  const renderActions = (row: DisplayRow) => {
    // Don't show actions for split rows
    if (row._isSplitRow) return null;
    
    const status = row.approval_status || 'pending';
    const isAllocated = expenseMatches[row.id]?.matched;
    const canSplit = row.project_id !== "000-UNASSIGNED" && 
                     row.project_id !== "SYS-000" &&
                     !row.project_name?.includes("Unassigned");
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-input-compact w-8 p-0"
            aria-label="Actions menu"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => onEdit(row)}>
            <Edit2 className="h-3 w-3 mr-2" />
            Edit Expense
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => {
            setExpenseToReassign(row);
            setReassignDialogOpen(true);
          }}>
            <FolderOpen className="h-3 w-3 mr-2" />
            Reassign Project
          </DropdownMenuItem>

          {canSplit && !row.is_split && (
            <DropdownMenuItem onClick={() => {
              setExpenseToSplit(row);
              setSplitDialogOpen(true);
            }}>
              <Target className="h-3 w-3 mr-2" />
              Split Expense
            </DropdownMenuItem>
          )}

          {row.is_split && (
            <DropdownMenuItem onClick={() => {
              setExpenseToSplit(row);
              setSplitDialogOpen(true);
            }}>
              <Edit2 className="h-3 w-3 mr-2" />
              Manage Splits
            </DropdownMenuItem>
          )}

          {!isAllocated && (
            <DropdownMenuItem onClick={() => navigate(`/expenses/matching?highlight=${row.id}`)}>
              <Target className="h-3 w-3 mr-2" />
              Match to Line Items
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem 
            onClick={() => handleDelete(row.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Delete Expense
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {status === 'pending' && (
            <>
              <DropdownMenuItem onClick={() => handleApprovalAction(row.id, 'approve')}>
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleApprovalAction(row.id, 'reject')}>
                Reject
              </DropdownMenuItem>
            </>
          )}

          {row.project_id && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = `/projects/${row.project_id}`}>
                <ExternalLink className="h-3 w-3 mr-2" />
                View Project
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="dense-spacing">
      {/* Help Section - Collapsible */}
      <Collapsible defaultOpen={false} className="mb-2">
        <Card>
          <CardHeader className="p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-3 w-3 text-muted-foreground" />
                <CardTitle className="text-xs font-medium">
                  Understanding Project Assignment & Line Item Allocation
                </CardTitle>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-2 pt-0 space-y-2 text-xs">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs h-4 px-1.5">Assigned</Badge>
                    <span className="font-medium">Project Assignment</span>
                  </div>
                  <ul className="space-y-0.5 text-muted-foreground ml-2 text-xs">
                    <li>• Which project does this expense belong to?</li>
                    <li>• Required for all expenses</li>
                    <li>• Affects project-level budgets and reports</li>
                    <li>• Use "Reassign Project" action to change</li>
                  </ul>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs h-4 px-1.5">Allocated</Badge>
                    <span className="font-medium">Line Item Allocation</span>
                  </div>
                  <ul className="space-y-0.5 text-muted-foreground ml-2 text-xs">
                    <li>• Which estimate/quote line items does this match?</li>
                    <li>• Optional but recommended for detailed tracking</li>
                    <li>• Enables cost variance analysis by line item</li>
                    <li>• Use "Match to Line Items" action to allocate</li>
                  </ul>
                </div>
              </div>
              
              <div className="pt-1.5 border-t">
                <p className="text-xs text-muted-foreground">
                  <strong>Workflow:</strong> First assign expenses to projects, then optionally allocate 
                  them to specific line items for detailed cost tracking.
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Filters - Compact */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center space-x-1">
          <Search className="h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48 h-input-compact text-label"
          />
        </div>

        {/* Quick filter: Needs Allocation */}
        <Button
          variant={filterMatchStatus === 'unmatched' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterMatchStatus(filterMatchStatus === 'unmatched' ? 'all' : 'unmatched')}
          className="h-input-compact text-label"
        >
          <Target className="h-3 w-3 mr-1" />
          Needs Allocation
          {filterMatchStatus === 'unmatched' && (
            <span className="ml-1 px-1.5 py-0.5 bg-background rounded text-xs">
              {filteredExpenses.length}
            </span>
          )}
        </Button>
        
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-40 h-input-compact text-label">
            <SelectValue placeholder="Project" />
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

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-32 h-input-compact text-label">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(EXPENSE_CATEGORY_DISPLAY).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTransactionType} onValueChange={setFilterTransactionType}>
          <SelectTrigger className="w-28 h-input-compact text-label">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TRANSACTION_TYPE_DISPLAY).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterMatchStatus} onValueChange={setFilterMatchStatus}>
          <SelectTrigger className="w-48 h-input-compact text-label">
            <SelectValue placeholder="Allocation Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Expenses</SelectItem>
            <SelectItem value="unassigned">⚠️ Needs Project Assignment</SelectItem>
            <SelectItem value="unmatched">⚠️ Unallocated (No Line Item)</SelectItem>
            <SelectItem value="matched">✅ Allocated to Line Items</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterApprovalStatus} onValueChange={setFilterApprovalStatus}>
          <SelectTrigger className="w-32 h-input-compact text-label">
            <SelectValue placeholder="Approval Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSplitStatus} onValueChange={setFilterSplitStatus}>
          <SelectTrigger className="w-32 h-input-compact text-label">
            <SelectValue placeholder="Split Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="split">Split</SelectItem>
            <SelectItem value="unsplit">Not Split</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={exportToCsv} variant="outline" size="sm" className="h-input-compact text-label">
          <FileDown className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>

      <EntityTableTemplate
        title="All Expenses"
        description={`Manage your project expenses (${filteredExpenses.length} total) • Total: ${formatCurrency(filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0), { showCents: true })}`}
        data={displayData}
        columns={columns}
        isLoading={false}
        selectedItems={selectedExpenses}
        onSelectItem={(itemId) => {
          // Only allow selection of parent expenses, not split rows
          const row = displayData.find(d => d.id === itemId);
          if (!row?._isSplitRow) {
            handleSelectExpense(itemId);
          }
        }}
        onSelectAll={handleSelectAll}
        renderActions={renderActions}
        enablePagination={enablePagination}
        pageSize={pageSize}
        enableSorting={true}
        defaultSortColumn="expense_date"
        defaultSortDirection="desc"
        bulkActions={
          selectedExpenses.length > 0 ? (
            <ExpenseBulkActions
              selectedExpenseIds={selectedExpenses}
              onSelectionChange={(newSet) => setSelectedExpenses(Array.from(newSet))}
              onComplete={() => {
                setSelectedExpenses([]);
                onRefresh();
              }}
            />
          ) : null
        }
        emptyMessage="No expenses found. Add your first expense to get started."
        noResultsMessage="No expenses match your current filters."
      />

      <ReassignExpenseProjectDialog
        open={reassignDialogOpen}
        onClose={() => {
          setReassignDialogOpen(false);
          setExpenseToReassign(null);
        }}
        onSuccess={() => {
          setReassignDialogOpen(false);
          setExpenseToReassign(null);
          onRefresh();
        }}
        expenseIds={expenseToReassign ? [expenseToReassign.id] : []}
        currentProjectName={expenseToReassign?.project_name}
      />

      <ExpenseSplitDialog
        open={splitDialogOpen}
        onClose={() => {
          setSplitDialogOpen(false);
          setExpenseToSplit(null);
        }}
        expense={expenseToSplit}
        onSuccess={() => {
          setSplitDialogOpen(false);
          setExpenseToSplit(null);
          onRefresh();
        }}
      />
    </div>
  );
};