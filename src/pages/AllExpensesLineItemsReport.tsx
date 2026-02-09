import React, { useState, useEffect } from "react";
import { Receipt, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { parseDateOnly } from "@/utils/dateUtils";
import { ExpenseCategory, TRANSACTION_TYPE_DISPLAY, EXPENSE_CATEGORY_DISPLAY } from "@/types/expense";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ExportControls } from "@/components/reports/ExportControls";
import { ReportField } from "@/utils/reportExporter";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";

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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
      toast.error("Failed to load expenses: " + (error.message || "Unknown error"));
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
    <MobilePageWrapper className="w-full max-w-full overflow-x-hidden">
      <div className="px-3 py-4 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-full">
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" />
              <span className="truncate">All Expenses Line Items Report</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete listing of all expense transactions
          </p>
        </div>
          <div className="flex-shrink-0">
        <ExportControls
          data={exportData}
          fields={reportFields}
          reportName="All Expenses Line Items"
        />
          </div>
      </div>

        <Card className="w-full max-w-full overflow-hidden">
          <CardHeader className="px-3 sm:px-6 py-4">
          <CardTitle>Expense Summary</CardTitle>
          <CardDescription>
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        {/* Mobile Card View */}
        {isMobile ? (
          <div className="space-y-3 w-full max-w-full">
            {expenses.length === 0 ? (
              <Card className="w-full">
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">No expenses found</p>
                </CardContent>
              </Card>
            ) : (
              expenses.map((expense) => {
                const isExpanded = expandedCards.has(expense.id);
                const hasDetails = expense.payee_name || expense.description || expense.invoice_number || expense.account_full_name;

                return (
                  <Card key={expense.id} className="w-full max-w-full overflow-hidden hover:bg-muted/50 transition-colors">
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {format(parseDateOnly(expense.expense_date), 'MMM dd, yyyy')}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 space-y-3">
                      {/* Hero: Amount */}
                      <div className="text-center py-3 border-t">
                        <div className="text-3xl font-bold text-red-600">
                          {formatCurrency(expense.amount, { showCents: true })}
                        </div>
                      </div>

                      {/* Always Visible: Project Info */}
                      <div className="space-y-1 border-t pt-3">
                        <div className="font-mono text-sm font-medium">{expense.project_number}</div>
                        <div className="text-sm text-muted-foreground truncate">{expense.project_name}</div>
                      </div>

                      {/* Category and Type Badges */}
                      <div className="flex items-center gap-2 flex-wrap border-t pt-3">
                        <Badge variant="outline" className="text-xs">
                          {EXPENSE_CATEGORY_DISPLAY[expense.category] || expense.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {TRANSACTION_TYPE_DISPLAY[expense.transaction_type] || expense.transaction_type}
                        </Badge>
                      </div>

                      {/* Expandable Details */}
                      {hasDetails && (
                        <>
                          <div className="flex justify-center pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCard(expense.id)}
                              className="h-8"
                            >
                              <ChevronDown className={cn(
                                "h-4 w-4 transition-transform",
                                isExpanded ? 'rotate-180' : ''
                              )} />
                              <span className="ml-1 text-xs">View Details</span>
                            </Button>
                          </div>
                          <Collapsible open={isExpanded}>
                            <CollapsibleContent>
                              <div className="space-y-2 pt-2 border-t">
                                <div className="grid grid-cols-1 gap-3 text-sm">
                                  {expense.payee_name && (
                                    <div className="min-w-0">
                                      <div className="text-xs text-muted-foreground mb-1">Payee</div>
                                      <div className="font-medium truncate">{expense.payee_name}</div>
                                    </div>
                                  )}
                                  {expense.description && (
                                    <div className="min-w-0">
                                      <div className="text-xs text-muted-foreground mb-1">Description</div>
                                      <div className="text-sm break-words">{expense.description}</div>
                                    </div>
                                  )}
                                  {expense.invoice_number && (
                                    <div className="min-w-0">
                                      <div className="text-xs text-muted-foreground mb-1">Invoice #</div>
                                      <div className="font-mono text-sm truncate">{expense.invoice_number}</div>
                                    </div>
                                  )}
                                  {(expense.account_full_name || expense.account_name) && (
                                    <div className="min-w-0">
                                      <div className="text-xs text-muted-foreground mb-1">Account</div>
                                      <div className="text-sm truncate">{expense.account_full_name || expense.account_name}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader className="px-3 sm:px-6 py-4">
          <CardTitle>Expense Line Items</CardTitle>
        </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-4">
          <div className="rounded-md border overflow-x-auto">
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
                      <TableCell>{format(parseDateOnly(expense.expense_date), 'MMM dd, yyyy')}</TableCell>
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
        )}
    </div>
    </MobilePageWrapper>
  );
};

export default AllExpensesLineItemsReport;
