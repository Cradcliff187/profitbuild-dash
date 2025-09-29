import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PayeeSelector } from '@/components/PayeeSelector';
import { Expense, ExpenseCategory, TransactionType, EXPENSE_CATEGORY_DISPLAY, TRANSACTION_TYPE_DISPLAY } from '@/types/expense';
import { Project } from '@/types/project';
import { Payee } from '@/types/payee';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const expenseSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.nativeEnum(ExpenseCategory),
  transaction_type: z.enum(['expense', 'bill', 'check', 'credit_card', 'cash']),
  amount: z.string().min(1, 'Amount is required'),
  expense_date: z.date(),
  payee_id: z.string().optional(),
  invoice_number: z.string().optional(),
  is_planned: z.boolean().default(false),
  use_contingency: z.boolean().default(false),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  expense?: Expense;
  onSave: (expense: Expense) => void;
  onCancel: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, onSave, onCancel }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedPayee, setSelectedPayee] = useState<Payee | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectContingency, setProjectContingency] = useState<{
    available: number;
    used: number;
    total: number;
  } | null>(null);
  const { toast } = useToast();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      project_id: expense?.project_id || '',
      description: expense?.description || '',
      category: expense?.category || ExpenseCategory.MATERIALS,
      transaction_type: expense?.transaction_type || 'expense',
      amount: expense?.amount.toString() || '',
      expense_date: expense?.expense_date || new Date(),
      payee_id: expense?.payee_id || '',
      invoice_number: expense?.invoice_number || '',
      is_planned: expense?.is_planned || false,
      use_contingency: false,
    },
  });

  // Load projects
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load projects
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        const transformedProjects = (projectsData || []).map(project => ({
          ...project,
          start_date: project.start_date ? new Date(project.start_date) : undefined,
          end_date: project.end_date ? new Date(project.end_date) : undefined,
          created_at: new Date(project.created_at),
          updated_at: new Date(project.updated_at),
        }));
        setProjects(transformedProjects);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load projects.",
          variant: "destructive",
        });
      }
    };

    loadData();
  }, [toast]);

  // Load project contingency data when project is selected
  useEffect(() => {
    const loadProjectContingency = async (projectId: string) => {
      if (!projectId) {
        setProjectContingency(null);
        return;
      }

      try {
        const { data: estimateData, error } = await supabase
          .from('estimates')
          .select('contingency_amount, contingency_used')
          .eq('project_id', projectId)
          .eq('is_current_version', true)
          .single();

        if (error) {
          console.error('Error loading project contingency:', error);
          setProjectContingency(null);
          return;
        }

        const total = estimateData.contingency_amount || 0;
        const used = estimateData.contingency_used || 0;
        const available = Math.max(0, total - used);

        setProjectContingency({
          total,
          used,
          available,
        });
      } catch (error) {
        console.error('Error loading contingency:', error);
        setProjectContingency(null);
      }
    };

    const projectId = form.watch('project_id');
    if (projectId) {
      loadProjectContingency(projectId);
    }
  }, [form.watch('project_id')]);

  const onSubmit = async (data: ExpenseFormData) => {
    setLoading(true);
    try {
      const expenseData = {
        id: expense?.id,
        project_id: data.project_id,
        description: data.description,
        category: data.category as any, // Cast enum to database string
        transaction_type: data.transaction_type,
        amount: parseFloat(data.amount),
        expense_date: data.expense_date.toISOString().split('T')[0],
        payee_id: data.payee_id || null,
        invoice_number: data.invoice_number || null,
        is_planned: data.is_planned,
      };

      let result;
      if (expense?.id) {
        // Update existing expense
        const { data: updatedExpense, error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', expense.id)
          .select()
          .single();
        
        if (error) throw error;
        result = updatedExpense;
      } else {
        // Create new expense
        const { data: newExpense, error } = await supabase
          .from('expenses')
          .insert([expenseData] as any) // Cast to handle enum conversion
          .select()
          .single();
        
        if (error) throw error;
        result = newExpense;
      }

      // Handle contingency usage for unplanned expenses
      if (data.use_contingency && !data.is_planned && projectContingency) {
        const { error: contingencyError } = await supabase
          .from('estimates')
          .update({ 
            contingency_used: projectContingency.used + parseFloat(data.amount)
          })
          .eq('project_id', data.project_id)
          .eq('is_current_version', true);
          
        if (contingencyError) throw contingencyError;
      }

      // Transform result to include payee_name for display
      const transformedExpense: Expense = {
        ...result,
        expense_date: new Date(result.expense_date),
        created_at: new Date(result.created_at),
        updated_at: new Date(result.updated_at),
        payee_name: selectedPayee?.payee_name,
        project_name: projects.find(p => p.id === result.project_id)?.project_name,
      };

      onSave(transformedExpense);
      
      toast({
        title: expense ? "Expense Updated" : "Expense Added",
        description: `The expense has been successfully ${expense ? 'updated' : 'added'}.`,
      });
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: "Error",
        description: "Failed to save expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.project_name} - {project.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(EXPENSE_CATEGORY_DISPLAY).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transaction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TRANSACTION_TYPE_DISPLAY).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter expense description..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expense_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="payee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payee</FormLabel>
                     <FormControl>
                       <PayeeSelector
                         value={field.value || ''}
                         onValueChange={(payeeId, payeeName, payee) => {
                           field.onChange(payeeId);
                           setSelectedPayee(payee || null);
                         }}
                         placeholder="Select payee"
                         error={form.formState.errors.payee_id?.message}
                         showLabel={false}
                       />
                     </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Invoice #"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Planned/Unplanned and Contingency Usage */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="is_planned"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Planned Expense</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Check if this expense was included in the original estimate
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {/* Contingency Usage Checkbox - only show for unplanned expenses */}
              {!form.watch('is_planned') && projectContingency && projectContingency.available > 0 && (
                <FormField
                  control={form.control}
                  name="use_contingency"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Use Contingency?</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Available contingency: {formatCurrency(projectContingency.available)}
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (expense ? 'Update Expense' : 'Add Expense')}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};