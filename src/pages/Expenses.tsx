import React, { useState, useEffect, useRef } from "react";
import { Plus, Upload, BarChart3, List, Clock, FileDown, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { ExpenseDashboard } from "@/components/ExpenseDashboard";
import { ExpenseFormSheet } from "@/components/ExpenseFormSheet";
import { ExpensesList, ExpensesListRef } from "@/components/ExpensesList";
import { ExpenseImportModal } from "@/components/ExpenseImportModal";
import { ExpenseExportModal } from "@/components/ExpenseExportModal";
import { TimesheetGridView } from "@/components/TimesheetGridView";
import { Expense, ExpenseCategory } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ColumnSelector } from "@/components/ui/column-selector";
import { MobileResponsiveHeader } from "@/components/ui/mobile-responsive-header";

type ViewMode = "overview" | "list";

// Helper to filter out all split parent expenses (defensive)
const filterDisplayableExpenses = (expenses: Expense[]): Expense[] => {
  return expenses.filter((expense) => {
    // Hide split parent containers regardless of project assignment
    const isSplitParent = expense.is_split === true;
    return !isSplitParent;
  });
};

const Expenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const tabOptions = [
    { value: "overview", label: "Overview", icon: BarChart3 },
    { value: "list", label: "All Expenses", icon: List },
  ];
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTimesheetModal, setShowTimesheetModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const expensesListRef = useRef<ExpensesListRef>(null);
  const { toast } = useToast();

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('expenses-visible-columns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Invalid JSON, use defaults
      }
    }
    // Default visible columns - matching ExpensesList defaults
    const defaultColumns = [
      'checkbox', 'split', 'date', 'project', 'payee', 'description', 
      'category', 'amount', 'status_assigned', 'status_allocated', 'actions'
    ];
    return defaultColumns;
  });

  // Column order state with localStorage persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('expenses-column-order');
    if (saved) {
      try {
        const savedOrder = JSON.parse(saved);
        // Add any new columns not in saved order
        const allColumns = [
          'checkbox', 'split', 'date', 'project', 'payee', 'description', 
          'category', 'transaction_type', 'amount', 'invoice_number', 
          'status_assigned', 'status_allocated', 'approval_status', 'actions'
        ];
        const newColumns = allColumns.filter(key => !savedOrder.includes(key));
        return [...savedOrder, ...newColumns];
      } catch {
        // Invalid JSON, use defaults
      }
    }
    return [
      'checkbox', 'split', 'date', 'project', 'payee', 'description', 
      'category', 'transaction_type', 'amount', 'invoice_number', 
      'status_assigned', 'status_allocated', 'approval_status', 'actions'
    ];
  });

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('expenses-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('expenses-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Column definitions for ColumnSelector
  const expenseColumnDefinitions = [
    { key: 'checkbox', label: 'Select', required: true },
    { key: 'split', label: 'Split', required: false },
    { key: 'date', label: 'Date', required: false },
    { key: 'project', label: 'Project', required: false },
    { key: 'payee', label: 'Payee', required: false },
    { key: 'description', label: 'Description', required: false },
    { key: 'category', label: 'Category', required: false },
    { key: 'transaction_type', label: 'Type', required: false },
    { key: 'amount', label: 'Amount', required: false },
    { key: 'invoice_number', label: 'Invoice #', required: false },
    { key: 'status_assigned', label: 'Assigned', required: false },
    { key: 'status_allocated', label: 'Allocated', required: false },
    { key: 'approval_status', label: 'Approval', required: false },
    { key: 'actions', label: 'Actions', required: true },
  ];

  // Load expenses from Supabase
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expensesResult, estimatesResult] = await Promise.all([
        supabase.from("expenses").select(`
            *,
            payees(payee_name, payee_type),
            projects(project_name, project_number, category)
          `),
        supabase.from("estimates").select(`
            *,
            projects(project_name, client_name),
            estimate_line_items(
              id,
              category,
              cost_per_unit,
              total_cost,
              quantity,
              description
            )
          `),
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (estimatesResult.error) throw estimatesResult.error;

      const transformedExpenses: Expense[] = (expensesResult.data || []).map((expense) => ({
        ...expense,
        category: expense.category as ExpenseCategory,
        expense_date: new Date(expense.expense_date),
        created_at: new Date(expense.created_at),
        updated_at: new Date(expense.updated_at),
        payee_name: expense.payees?.payee_name,
        payee_type: expense.payees?.payee_type,
        project_name: expense.projects?.project_name,
        project_number: expense.projects?.project_number,
        project_category: expense.projects?.category,
      }));

      // Filter out split parent containers before setting state
      const displayableExpenses = filterDisplayableExpenses(transformedExpenses);

      setExpenses(displayableExpenses);
      setEstimates(estimatesResult.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpense = (expense: Expense) => {
    // Refresh the expenses list
    fetchData();
    setSelectedExpense(undefined);
  };

  const handleImportSuccess = () => {
    fetchData();
    setViewMode("list");
  };

  const handleTimesheetSuccess = () => {
    fetchData();
    setViewMode("list");
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setExpenseFormOpen(true);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const handleCreateNew = () => {
    setSelectedExpense(undefined);
    setExpenseFormOpen(true);
  };

  const handleTabChange = (value: string) => {
    if (value === "overview" || value === "list") {
      setViewMode(value as ViewMode);
    }
  };

  if (loading) {
    return <BrandedLoader message="Loading expenses..." />;
  }

  return (
    <div className="w-full overflow-x-hidden space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Receipt className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Expenses</h1>
            <p className="text-sm text-muted-foreground">Track project costs and manage expenses</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateNew} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
          <Button variant="outline" onClick={() => setShowImportModal(true)} size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={() => setShowExportModal(true)} size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setShowTimesheetModal(true)} size="sm">
            <Clock className="h-4 w-4 mr-2" />
            Timesheet
          </Button>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={handleTabChange}>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-auto sm:order-1">
              <div className="sm:hidden">
                <Select value={viewMode} onValueChange={handleTabChange}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tabOptions.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <SelectItem key={tab.value} value={tab.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <TabsList className="hidden w-full flex-wrap justify-start gap-2 rounded-full bg-muted/40 p-1 sm:flex">
                {tabOptions.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            {viewMode === "list" && (
              <div className="flex justify-end sm:order-2">
                <ColumnSelector
                  columns={expenseColumnDefinitions}
                  visibleColumns={visibleColumns}
                  onVisibilityChange={setVisibleColumns}
                  columnOrder={columnOrder}
                  onColumnOrderChange={setColumnOrder}
                />
              </div>
            )}
          </div>

          <TabsContent value="overview">
            <ExpenseDashboard expenses={expenses} estimates={estimates} />
          </TabsContent>

          <TabsContent value="list">
            <ExpensesList
              ref={expensesListRef}
              expenses={expenses}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
              onRefresh={fetchData}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
            />
          </TabsContent>
        </Tabs>

      <ExpenseFormSheet
        open={expenseFormOpen}
        onOpenChange={setExpenseFormOpen}
        expense={selectedExpense}
        onSave={handleSaveExpense}
      />

      <ExpenseImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
        estimates={estimates}
      />

      <TimesheetGridView
        open={showTimesheetModal}
        onClose={() => setShowTimesheetModal(false)}
        onSuccess={handleTimesheetSuccess}
      />

      <ExpenseExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        expenses={expenses}
      />
    </div>
  );
};

export default Expenses;
