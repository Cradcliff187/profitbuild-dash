import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Filter, Search, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Expense, ExpenseCategory, TransactionType, EXPENSE_CATEGORY_DISPLAY, TRANSACTION_TYPE_DISPLAY } from '@/types/expense';
import { Project } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/usePagination';
import { CompletePagination } from '@/components/ui/complete-pagination';

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
  enablePagination = false,
  pageSize = 25 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'All'>('All');
  const [filterTransactionType, setFilterTransactionType] = useState<TransactionType | 'All'>('All');
  const [filterProject, setFilterProject] = useState<string>('All');
  const [projects, setProjects] = useState<Project[]>([]);
  const { toast } = useToast();

  // Load projects for filter dropdown
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('project_name');

        const transformedProjects = (data || []).map(project => ({
          ...project,
          start_date: project.start_date ? new Date(project.start_date) : undefined,
          end_date: project.end_date ? new Date(project.end_date) : undefined,
          created_at: new Date(project.created_at),
          updated_at: new Date(project.updated_at),
        }));
        setProjects(transformedProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };

    loadProjects();
  }, []);

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.payee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || expense.category === filterCategory;
    const matchesTransactionType = filterTransactionType === 'All' || expense.transaction_type === filterTransactionType;
    const matchesProject = filterProject === 'All' || expense.project_id === filterProject;

    return matchesSearch && matchesCategory && matchesTransactionType && matchesProject;
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      onDelete(id);
      toast({
        title: "Expense Deleted",
        description: "The expense has been successfully deleted.",
      });
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
    const headers = ['Date', 'Project', 'Description', 'Category', 'Transaction Type', 'Amount', 'Payee', 'Invoice Number'];
    const csvContent = [
      headers.join(','),
      ...filteredExpenses.map(expense => [
        expense.expense_date.toLocaleDateString(),
        `"${expense.project_name || 'Unknown Project'}"`,
        `"${expense.description || ''}"`,
        EXPENSE_CATEGORY_DISPLAY[expense.category],
        TRANSACTION_TYPE_DISPLAY[expense.transaction_type],
        expense.amount.toFixed(2),
        `"${expense.payee_name || ''}"`,
        `"${expense.invoice_number || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Pagination
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
  } = usePagination({
    totalItems: filteredExpenses.length,
    pageSize,
    initialPage: 1,
  });

  const sortedExpenses = filteredExpenses
    .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
  
  const paginatedExpenses = enablePagination 
    ? sortedExpenses.slice(startIndex, endIndex)
    : sortedExpenses;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expenses List</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={exportToCsv}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterProject} onValueChange={(value) => setFilterProject(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value as ExpenseCategory | 'All')}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {Object.entries(EXPENSE_CATEGORY_DISPLAY).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTransactionType} onValueChange={(value) => setFilterTransactionType(value as TransactionType | 'All')}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                {Object.entries(TRANSACTION_TYPE_DISPLAY).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Showing {filteredExpenses.length} of {expenses.length} expenses
              </span>
              <span className="text-lg font-semibold">
                Total: ${totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Expenses Table */}
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Filter className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
              <p>Try adjusting your filters or add some expenses.</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">
                        {expense.project_name || 'Unknown Project'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          {expense.invoice_number && (
                            <p className="text-xs text-muted-foreground">
                              Invoice: {expense.invoice_number}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{EXPENSE_CATEGORY_DISPLAY[expense.category]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TRANSACTION_TYPE_DISPLAY[expense.transaction_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${expense.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{expense.payee_name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this expense? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(expense.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {enablePagination && filteredExpenses.length > pageSize && (
            <div className="flex justify-center mt-6">
              <CompletePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};