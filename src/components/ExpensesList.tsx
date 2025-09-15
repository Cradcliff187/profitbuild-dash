import React, { useState } from 'react';
import { Edit, Trash2, Filter, Search, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Expense, ExpenseCategory, ExpenseType } from '@/types/expense';
import { Estimate } from '@/types/estimate';

interface ExpensesListProps {
  expenses: Expense[];
  estimates: Estimate[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export const ExpensesList: React.FC<ExpensesListProps> = ({ expenses, estimates, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'All'>('All');
  const [filterType, setFilterType] = useState<ExpenseType | 'All'>('All');
  const [filterProject, setFilterProject] = useState<string>('All');

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || expense.category === filterCategory;
    const matchesType = filterType === 'All' || expense.type === filterType;
    const matchesProject = filterProject === 'All' || expense.projectId === filterProject;

    return matchesSearch && matchesCategory && matchesType && matchesProject;
  });

  const getProjectName = (projectId: string) => {
    const estimate = estimates.find(e => e.id === projectId);
    return estimate ? estimate.projectName : 'Unknown Project';
  };

  const exportToCsv = () => {
    const headers = ['Date', 'Project', 'Description', 'Category', 'Type', 'Amount', 'Vendor', 'Invoice Number'];
    const csvContent = [
      headers.join(','),
      ...filteredExpenses.map(expense => [
        expense.date.toLocaleDateString(),
        `"${getProjectName(expense.projectId)}"`,
        `"${expense.description}"`,
        expense.category,
        expense.type,
        expense.amount.toFixed(2),
        `"${expense.vendor || ''}"`,
        `"${expense.invoiceNumber || ''}"`
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
                {estimates.map(estimate => (
                  <SelectItem key={estimate.id} value={estimate.id}>
                    {estimate.projectName}
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
                <SelectItem value="Labor">Labor</SelectItem>
                <SelectItem value="Materials">Materials</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={(value) => setFilterType(value as ExpenseType | 'All')}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="Planned">Planned</SelectItem>
                <SelectItem value="Unplanned">Unplanned</SelectItem>
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
                    <TableHead>Vendor</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.date.toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">
                        {getProjectName(expense.projectId)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          {expense.invoiceNumber && (
                            <p className="text-xs text-muted-foreground">
                              Invoice: {expense.invoiceNumber}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={expense.type === 'Planned' ? 'default' : 'secondary'}>
                          {expense.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${expense.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{expense.vendor || '-'}</TableCell>
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
                                <AlertDialogAction onClick={() => onDelete(expense.id)}>
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
        </CardContent>
      </Card>
    </div>
  );
};