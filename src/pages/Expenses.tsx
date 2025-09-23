import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Upload, BarChart3, List, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ExpenseDashboard } from "@/components/ExpenseDashboard";
import { ExpenseUpload } from "@/components/ExpenseUpload";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpensesList } from "@/components/ExpensesList";
import { ProjectExpenseTracker } from "@/components/ProjectExpenseTracker";
import { TransactionImportModal } from "@/components/TransactionImportModal";
import { EnhancedTransactionImportModal } from "@/components/EnhancedTransactionImportModal";
import { Expense, ExpenseCategory } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ViewMode = 'dashboard' | 'upload' | 'form' | 'list' | 'tracker';

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [loading, setLoading] = useState(true);
  const [showTransactionImport, setShowTransactionImport] = useState(false);
  const [showEnhancedImport, setShowEnhancedImport] = useState(false);
  const { toast } = useToast();

  // Load expenses from Supabase
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expensesResult, estimatesResult, changeOrdersResult] = await Promise.all([
        supabase.from('expenses')
          .select(`
            *,
            payees(payee_name),
            projects(project_name)
          `),
        supabase.from('estimates')
          .select(`
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
        supabase.from('change_orders')
          .select('*')
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (estimatesResult.error) throw estimatesResult.error;
      if (changeOrdersResult.error) throw changeOrdersResult.error;

      const transformedExpenses: Expense[] = (expensesResult.data || []).map(expense => ({
        ...expense,
        category: expense.category as ExpenseCategory, // Cast database value to enum
        expense_date: new Date(expense.expense_date),
        created_at: new Date(expense.created_at),
        updated_at: new Date(expense.updated_at),
        payee_name: expense.payees?.payee_name,
        project_name: expense.projects?.project_name,
      }));

      setExpenses(transformedExpenses);
      setEstimates(estimatesResult.data || []);
      setChangeOrders(changeOrdersResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
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
    setViewMode('list');
    setSelectedExpense(undefined);
  };

  const handleExpensesImported = (importedExpenses: Expense[]) => {
    fetchData(); // Refresh to show imported expenses
    setViewMode('list');
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setViewMode('form');
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleCreateNew = () => {
    setSelectedExpense(undefined);
    setViewMode('form');
  };

  const handleCancel = () => {
    setSelectedExpense(undefined);
    setViewMode('dashboard');
  };

  if (loading) {
    return (
      <LoadingSpinner 
        variant="spinner" 
        size="full" 
        message="Loading expenses..." 
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Receipt className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
            <p className="text-muted-foreground">Track project costs and manage expenses</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => setShowTransactionImport(true)} 
            variant="outline"
            className="flex items-center space-x-2"
          >
            <FileDown className="h-4 w-4" />
            <span>Import Transactions</span>
          </Button>
          <Button 
            onClick={() => setShowEnhancedImport(true)} 
            variant="secondary"
            className="flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>Enhanced QB Import</span>
          </Button>
          <Button onClick={handleCreateNew} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </Button>
        </div>
      </div>

      {viewMode === 'form' ? (
        <ExpenseForm
          expense={selectedExpense}
          onSave={handleSaveExpense}
          onCancel={handleCancel}
        />
      ) : (
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center space-x-2">
              <List className="h-4 w-4" />
              <span>All Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Import CSV</span>
            </TabsTrigger>
            <TabsTrigger value="tracker" className="flex items-center space-x-2">
              <Receipt className="h-4 w-4" />
              <span>Project Tracking</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <ExpenseDashboard expenses={expenses} estimates={estimates} />
          </TabsContent>

          <TabsContent value="list">
            <ExpensesList
              expenses={expenses}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="upload">
            <ExpenseUpload
              onExpensesImported={handleExpensesImported}
              estimates={estimates}
            />
          </TabsContent>

          <TabsContent value="tracker">
            <ProjectExpenseTracker expenses={expenses} estimates={estimates} changeOrders={changeOrders} />
          </TabsContent>
        </Tabs>
      )}
      
      <TransactionImportModal
        open={showTransactionImport}
        onOpenChange={setShowTransactionImport}
        onTransactionsImported={handleExpensesImported}
      />
      
      <EnhancedTransactionImportModal
        open={showEnhancedImport}
        onOpenChange={setShowEnhancedImport}
        onTransactionsImported={(expenses, revenues) => {
          handleExpensesImported(expenses);
          fetchData();
        }}
      />
    </div>
  );
};

export default Expenses;