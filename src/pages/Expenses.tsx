import React, { useState, useEffect, useRef } from "react";
import { Receipt, Plus, Upload, BarChart3, List, Target, Clock, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { ExpenseDashboard } from "@/components/ExpenseDashboard";
import { ExpenseFormSheet } from "@/components/ExpenseFormSheet";
import { ExpensesList, ExpensesListRef } from "@/components/ExpensesList";
import { ExpenseImportModal } from "@/components/ExpenseImportModal";
import { TimesheetGridView } from "@/components/TimesheetGridView";
import { Expense, ExpenseCategory } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "overview" | "list";

// Helper to filter out SYS-000 split parent expenses
const filterDisplayableExpenses = (expenses: Expense[]): Expense[] => {
  return expenses.filter((expense) => {
    // Hide split parent containers (SYS-000 project with is_split=true)
    const isSplitParent = expense.is_split && expense.project_id === "SYS-000";
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
  const expensesListRef = useRef<ExpensesListRef>(null);
  const { toast } = useToast();

  // Load expenses from Supabase
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expensesResult, estimatesResult] = await Promise.all([
        supabase.from("expenses").select(`
            *,
            payees(payee_name),
            projects(project_name, project_number)
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
        project_name: expense.projects?.project_name,
        project_number: expense.projects?.project_number,
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Receipt className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Expenses</h1>
            <p className="text-muted-foreground">Track project costs and manage expenses</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => navigate("/expenses/matching")} size="sm">
            <Target className="h-4 w-4 mr-2" />
            <span>Match Expenses</span>
          </Button>
          <Button onClick={handleCreateNew} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            <span>Add Expense</span>
          </Button>
          <Button onClick={() => setShowImportModal(true)} variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            <span>Import</span>
          </Button>
          <Button onClick={() => expensesListRef.current?.exportToCsv()} variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            <span>Export</span>
          </Button>
          <Button onClick={() => setShowTimesheetModal(true)} variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            <span>Timesheet</span>
          </Button>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={handleTabChange}>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-auto">
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
    </div>
  );
};

export default Expenses;
