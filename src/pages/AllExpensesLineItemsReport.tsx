import React, { useState, useEffect } from "react";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ExpenseCategory, TRANSACTION_TYPE_DISPLAY, EXPENSE_CATEGORY_DISPLAY } from "@/types/expense";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ExportControls } from "@/components/reports/ExportControls";
import { ReportField } from "@/utils/reportExporter";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface ExpenseLineItem {
  id: string;
  expense_date: string;
  project_number: string;
  project_name: string;
  payee_name: string | null;
  description: string;
  category: ExpenseCategory;
  transaction_type: string;
  amount: number;
  invoice_number: string | null;
  account_name: string | null;
  account_full_name: string | null;
}

const AllExpensesLineItemsReport = () => {
  const [expenses, setExpenses] = useState<ExpenseLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          id,
          expense_date,
          description,
          category,
          transaction_type,
          amount,
          invoice_number,
          account_name,
          account_full_name,
          is_split,
          projects(project_number, project_name),
          payees(payee_name)
        `)
        .eq('is_split', false)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      const transformedExpenses: ExpenseLineItem[] = (data || []).map((expense: any) => ({
        id: expense.id,
        expense_date: expense.expense_date,
        project_number: expense.projects?.project_number || 'Unassigned',
        project_name: expense.projects?.project_name || 'Unassigned',
        payee_name: expense.payees?.payee_name || null,
        description: expense.description || '',
        category: expense.category,
        transaction_type: expense.transaction_type,
        amount: expense.amount,
        invoice_number: expense.invoice_number,
        account_name: expense.account_name,
        account_full_name: expense.account_full_name,
      }));

      setExpenses(transformedExpenses);
    } catch (error: any) {
      console.error("Error loading expenses:", error);
      toast({
        title: "Error",
        description: "Failed to load expenses: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reportFields: ReportField[] = [
    { key: 'expense_date', label: 'Date', type: 'date' },
    { key: 'project_number', label: 'Project #', type: 'text' },
    { key: 'project_name', label: 'Project Name', type: 'text' },
    { key: 'payee_name', label: 'Payee', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'transaction_type', label: 'Type', type: 'text' },
    { key: 'amount', label: 'Amount', type: 'currency' },
    { key: 'invoice_number', label: 'Invoice #', type: 'text' },
    { key: 'account_full_name', label: 'Account', type: 'text' },
  ];

  const exportData = expenses.map(exp => ({
    expense_date: exp.expense_date,
    project_number: exp.project_number,
    project_name: exp.project_name,
    payee_name: exp.payee_name || '',
    description: exp.description,
    category: EXPENSE_CATEGORY_DISPLAY[exp.category] || exp.category,
    transaction_type: TRANSACTION_TYPE_DISPLAY[exp.transaction_type] || exp.transaction_type,
    amount: exp.amount,
    invoice_number: exp.invoice_number || '',
    account_full_name: exp.account_full_name || exp.account_name || '',
  }));

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <BrandedLoader message="Loading expenses..." />
      </div>
    );
  }

  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const internalLaborTotal = expenses
    .filter(exp => exp.category === 'labor_internal')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const otherExpensesTotal = expenses
    .filter(exp => exp.category !== 'labor_internal')
    .reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/reports">Reports</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>All Expenses Line Items</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            All Expenses Line Items Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete listing of all expense transactions
          </p>
        </div>
        <ExportControls
          data={exportData}
          fields={reportFields}
          reportName="All Expenses Line Items"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Summary</CardTitle>
          <CardDescription>
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Internal Labor Costs</p>
              <p className="text-2xl font-bold">{formatCurrency(internalLaborTotal)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">All Other Expenses</p>
              <p className="text-2xl font-bold">{formatCurrency(otherExpensesTotal)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expense Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project #</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Payee</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No expenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.expense_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="font-mono text-sm">{expense.project_number}</TableCell>
                      <TableCell>{expense.project_name}</TableCell>
                      <TableCell>{expense.payee_name || '-'}</TableCell>
                      <TableCell className="max-w-md truncate">{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {EXPENSE_CATEGORY_DISPLAY[expense.category] || expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {TRANSACTION_TYPE_DISPLAY[expense.transaction_type] || expense.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(expense.amount, { showCents: true })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {expense.invoice_number || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {expense.account_full_name || expense.account_name || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllExpensesLineItemsReport;
