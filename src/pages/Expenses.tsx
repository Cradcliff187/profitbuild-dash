import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Upload, BarChart3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseDashboard } from "@/components/ExpenseDashboard";
import { ExpenseUpload } from "@/components/ExpenseUpload";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpensesList } from "@/components/ExpensesList";
import { ProjectExpenseTracker } from "@/components/ProjectExpenseTracker";
import { Expense } from "@/types/expense";
import { Estimate } from "@/types/estimate";
import { useToast } from "@/hooks/use-toast";

type ViewMode = 'dashboard' | 'upload' | 'form' | 'list' | 'tracker';

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const { toast } = useToast();

  // Load data from localStorage on mount
  useEffect(() => {
    const savedExpenses = localStorage.getItem('expenses');
    const savedEstimates = localStorage.getItem('estimates');
    
    if (savedExpenses) {
      try {
        const parsedExpenses = JSON.parse(savedExpenses).map((expense: any) => ({
          ...expense,
          date: new Date(expense.date),
          createdAt: new Date(expense.createdAt),
        }));
        setExpenses(parsedExpenses);
      } catch (error) {
        console.error('Failed to parse expenses from localStorage:', error);
      }
    }

    if (savedEstimates) {
      try {
        const parsedEstimates = JSON.parse(savedEstimates).map((estimate: any) => ({
          ...estimate,
          date: new Date(estimate.date),
          createdAt: new Date(estimate.createdAt),
        }));
        setEstimates(parsedEstimates);
      } catch (error) {
        console.error('Failed to parse estimates from localStorage:', error);
      }
    }
  }, []);

  // Save expenses to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  const handleSaveExpense = (expense: Expense) => {
    const existingIndex = expenses.findIndex(e => e.id === expense.id);
    if (existingIndex >= 0) {
      const updatedExpenses = [...expenses];
      updatedExpenses[existingIndex] = expense;
      setExpenses(updatedExpenses);
      toast({
        title: "Expense Updated",
        description: "The expense has been successfully updated.",
      });
    } else {
      setExpenses([...expenses, expense]);
      toast({
        title: "Expense Added",
        description: "The expense has been successfully added.",
      });
    }
    setViewMode('list');
    setSelectedExpense(undefined);
  };

  const handleExpensesImported = (importedExpenses: Expense[]) => {
    setExpenses([...expenses, ...importedExpenses]);
    setViewMode('list');
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setViewMode('form');
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
    toast({
      title: "Expense Deleted",
      description: "The expense has been successfully deleted.",
    });
  };

  const handleCreateNew = () => {
    setSelectedExpense(undefined);
    setViewMode('form');
  };

  const handleCancel = () => {
    setSelectedExpense(undefined);
    setViewMode('dashboard');
  };

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
        <Button onClick={handleCreateNew} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Expense</span>
        </Button>
      </div>

      {viewMode === 'form' ? (
        <ExpenseForm
          estimates={estimates}
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
              estimates={estimates}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
            />
          </TabsContent>

          <TabsContent value="upload">
            <ExpenseUpload
              estimates={estimates}
              onExpensesImported={handleExpensesImported}
            />
          </TabsContent>

          <TabsContent value="tracker">
            <ProjectExpenseTracker expenses={expenses} estimates={estimates} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Expenses;