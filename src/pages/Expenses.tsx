import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Upload, BarChart3, List, FileDown, Target, Clock, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ExpenseDashboard } from "@/components/ExpenseDashboard";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpensesList } from "@/components/ExpensesList";
import { ProjectExpenseTracker } from "@/components/ProjectExpenseTracker";
import { ExpenseImportModal } from "@/components/ExpenseImportModal";
import { GlobalExpenseMatching } from "@/components/GlobalExpenseMatching";
import { TimesheetGridView } from "@/components/TimesheetGridView";
import { Expense, ExpenseCategory } from "@/types/expense";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ViewMode = 'dashboard' | 'form' | 'list' | 'tracker' | 'matching';

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTimesheetModal, setShowTimesheetModal] = useState(false);
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

  const handleImportSuccess = () => {
    fetchData();
    setViewMode('list');
  };

  const handleTimesheetSuccess = () => {
    fetchData();
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
          <Button 
            onClick={() => setViewMode('matching')} 
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Target className="h-4 w-4" />
            <span>Match Expenses</span>
          </Button>
          <Button 
            onClick={() => setShowTimesheetModal(true)} 
            variant="outline"
            size="sm"
          >
            <Clock className="h-4 w-4 mr-2" />
            <span>Timesheet</span>
          </Button>
          <Button 
            onClick={() => setShowImportModal(true)} 
            variant="outline"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            <span>Import</span>
          </Button>
          <Button onClick={handleCreateNew} size="sm" className="flex items-center space-x-2">
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
      ) : viewMode === 'matching' ? (
        <GlobalExpenseMatching
          onClose={() => setViewMode('dashboard')}
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
            <TabsTrigger value="tracker" className="flex items-center space-x-2">
              <Receipt className="h-4 w-4" />
              <span>Project Tracking</span>
            </TabsTrigger>
            <TabsTrigger value="matching" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Match Expenses</span>
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

          <TabsContent value="tracker">
            <ProjectExpenseTracker expenses={expenses} estimates={estimates} changeOrders={changeOrders} />
          </TabsContent>

          <TabsContent value="matching">
            <GlobalExpenseMatching onClose={() => setViewMode('dashboard')} />
          </TabsContent>
        </Tabs>
      )}
      
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