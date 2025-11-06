import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileDown, MoreHorizontal, Edit2, Trash2, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EntityTableTemplate } from "./EntityTableTemplate";
import { ExpenseBulkActions } from "./ExpenseBulkActions";
import { Expense, ExpenseCategory, TransactionType, EXPENSE_CATEGORY_DISPLAY, TRANSACTION_TYPE_DISPLAY } from "@/types/expense";
import { formatCurrency } from "@/lib/utils";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTransactionType, setFilterTransactionType] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterMatchStatus, setFilterMatchStatus] = useState<string>("all");
  const [filterApprovalStatus, setFilterApprovalStatus] = useState<string>("all");
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [expenseMatches, setExpenseMatches] = useState<Record<string, { matched: boolean; type?: 'estimate' | 'quote' | 'change_order' }>>({});
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

  // Load expense line item matches
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

    fetchExpenseMatches();
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

      return matchesSearch && matchesCategory && matchesType && matchesProject && matchesMatchStatus && matchesApprovalStatus;
    });
  }, [expenses, searchTerm, filterCategory, filterTransactionType, filterProject, filterMatchStatus, filterApprovalStatus, expenseMatches]);

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

  const exportToCsv = () => {
    const headers = ['Date', 'Project', 'Project Assignment', 'Payee', 'Category', 'Transaction Type', 'Amount', 'Approval Status', 'Line Item Allocation'];
    const csvContent = [
      headers.join(','),
      ...filteredExpenses.map(expense => {
        const isPlaceholder = expense.project_id === "000-UNASSIGNED" || 
                             expense.project_name?.includes("Unassigned") ||
                             expense.project_id === "SYS-000";
        return [
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
            : 'Unallocated')
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const columns = [
    {
      key: 'expense_date',
      label: 'Date',
      sortable: true,
      render: (expense: Expense) => (
        <div className="text-data font-mono">
          {expense.expense_date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
        </div>
      )
    },
    {
      key: 'project_name',
      label: 'Project',
      sortable: true,
      render: (expense: Expense) => (
        <div className={expense.project_name?.includes("Unassigned") ? "text-muted-foreground italic" : ""}>
          {expense.project_name}
        </div>
      )
    },
    {
      key: 'project_status',
      label: 'Project Assignment',
      sortable: false,
      render: (expense: Expense) => {
        const isPlaceholder = expense.project_id === "000-UNASSIGNED" || 
                             expense.project_name?.includes("Unassigned") ||
                             expense.project_id === "SYS-000";
        
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
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (expense: Expense) => (
        <div className="text-right text-data font-mono font-medium">
          {formatCurrency(expense.amount, { showCents: true })}
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (expense: Expense) => (
        <Badge variant={getCategoryBadgeVariant(expense.category)} className="compact-badge">
          {EXPENSE_CATEGORY_DISPLAY[expense.category]}
        </Badge>
      )
    },
    {
      key: 'transaction_type',
      label: 'Type',
      sortable: true,
      render: (expense: Expense) => (
        <Badge variant={getTypeBadgeVariant(expense.transaction_type)} className="compact-badge">
          {TRANSACTION_TYPE_DISPLAY[expense.transaction_type]}
        </Badge>
      )
    },
    {
      key: 'approval_status',
      label: 'Status',
      sortable: true,
      render: (expense: Expense) => {
        const status = expense.approval_status || 'pending';
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
      render: (expense: Expense) => {
        const isPlaceholder = expense.project_id === "000-UNASSIGNED" || 
                             expense.project_name?.includes("Unassigned") ||
                             expense.project_id === "SYS-000";
        
        // Show dash for placeholder projects
        if (isPlaceholder) {
          return <span className="text-muted-foreground">—</span>;
        }
        
        // Show allocation status for real projects
        const match = expenseMatches[expense.id];
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

  const renderActions = (expense: Expense) => {
    const status = expense.approval_status || 'pending';
    
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
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onEdit(expense)}>
            <Edit2 className="h-3 w-3 mr-2" />
            Edit Expense
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => handleDelete(expense.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Delete Expense
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {status === 'pending' && (
            <>
              <DropdownMenuItem onClick={() => handleApprovalAction(expense.id, 'approve')}>
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleApprovalAction(expense.id, 'reject')}>
                Reject
              </DropdownMenuItem>
            </>
          )}

          {expense.project_id && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = `/projects/${expense.project_id}`}>
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

        <Button onClick={exportToCsv} variant="outline" size="sm" className="h-input-compact text-label">
          <FileDown className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>

      <EntityTableTemplate
        title="All Expenses"
        description={`Manage your project expenses (${filteredExpenses.length} total) • Total: ${formatCurrency(filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0), { showCents: true })}`}
        data={filteredExpenses}
        columns={columns}
        isLoading={false}
        selectedItems={selectedExpenses}
        onSelectItem={handleSelectExpense}
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
    </div>
  );
};