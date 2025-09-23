import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EntityTableTemplate } from "./EntityTableTemplate";
import { ExpenseBulkActions } from "./ExpenseBulkActions";
import { Expense, ExpenseCategory, TransactionType, EXPENSE_CATEGORY_DISPLAY, TRANSACTION_TYPE_DISPLAY } from "@/types/expense";

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
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [expenseMatches, setExpenseMatches] = useState<Record<string, boolean>>({});
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
          .select("expense_id")
          .in("expense_id", expenses.map(e => e.id));
        
        if (error) throw error;
        
        const matches: Record<string, boolean> = {};
        expenses.forEach(expense => {
          matches[expense.id] = data?.some(correlation => correlation.expense_id === expense.id) || false;
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
      
      let matchesMatchStatus = true;
      if (filterMatchStatus === "matched") {
        matchesMatchStatus = expenseMatches[expense.id] === true;
      } else if (filterMatchStatus === "unmatched") {
        matchesMatchStatus = expenseMatches[expense.id] === false;
      } else if (filterMatchStatus === "unassigned") {
        matchesMatchStatus = expense.project_id === "000-UNASSIGNED" || expense.project_name?.includes("Unassigned");
      }

      return matchesSearch && matchesCategory && matchesType && matchesProject && matchesMatchStatus;
    });
  }, [expenses, searchTerm, filterCategory, filterTransactionType, filterProject, filterMatchStatus, expenseMatches]);

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

  const exportToCsv = () => {
    const headers = ['Date', 'Project', 'Description', 'Category', 'Transaction Type', 'Amount', 'Payee', 'Line Item Match'];
    const csvContent = [
      headers.join(','),
      ...filteredExpenses.map(expense =>
        [
          expense.expense_date.toLocaleDateString(),
          `"${expense.project_name || ''}"`,
          `"${expense.description || ''}"`,
          `"${EXPENSE_CATEGORY_DISPLAY[expense.category] || expense.category}"`,
          `"${TRANSACTION_TYPE_DISPLAY[expense.transaction_type] || expense.transaction_type}"`,
          expense.amount,
          `"${expense.payee_name || ''}"`,
          expenseMatches[expense.id] ? 'Matched' : 'Unmatched'
        ].join(',')
      )
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
      render: (expense: Expense) => (
        <div className="font-medium">
          {expense.expense_date.toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'project_name',
      label: 'Project',
      render: (expense: Expense) => (
        <div className={expense.project_name?.includes("Unassigned") ? "text-muted-foreground italic" : ""}>
          {expense.project_name}
        </div>
      )
    },
    {
      key: 'description',
      label: 'Description'
    },
    {
      key: 'category',
      label: 'Category',
      render: (expense: Expense) => (
        <Badge variant={getCategoryBadgeVariant(expense.category)}>
          {EXPENSE_CATEGORY_DISPLAY[expense.category]}
        </Badge>
      )
    },
    {
      key: 'transaction_type',
      label: 'Type',
      render: (expense: Expense) => (
        <Badge variant={getTypeBadgeVariant(expense.transaction_type)}>
          {TRANSACTION_TYPE_DISPLAY[expense.transaction_type]}
        </Badge>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (expense: Expense) => (
        <div className="text-right font-medium">
          ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      )
    },
    {
      key: 'payee_name',
      label: 'Payee'
    },
    {
      key: 'line_item_match',
      label: 'Line Item Match',
      render: (expense: Expense) => (
        <Badge variant={expenseMatches[expense.id] ? 'default' : 'outline'}>
          {expenseMatches[expense.id] ? 'Matched' : 'Unmatched'}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by project" />
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
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
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
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
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
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by match status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Expenses</SelectItem>
            <SelectItem value="matched">Matched to Line Items</SelectItem>
            <SelectItem value="unmatched">Unmatched</SelectItem>
            <SelectItem value="unassigned">Unassigned Project</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={exportToCsv} variant="outline" size="sm">
          <FileDown className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <EntityTableTemplate
        title="All Expenses"
        description={`Manage your project expenses (${filteredExpenses.length} total) • Total: $${filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        data={filteredExpenses}
        columns={columns}
        isLoading={false}
        selectedItems={selectedExpenses}
        onSelectItem={handleSelectExpense}
        onSelectAll={handleSelectAll}
        onEdit={onEdit}
        onDelete={handleDelete}
        enablePagination={enablePagination}
        pageSize={pageSize}
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