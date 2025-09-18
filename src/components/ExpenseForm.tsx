import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Expense, ExpenseCategory, TransactionType, EXPENSE_CATEGORY_DISPLAY, TRANSACTION_TYPE_DISPLAY } from '@/types/expense';
import { Project } from '@/types/project';
import { Payee } from '@/types/payee';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const expenseSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['labor_internal', 'subcontractors', 'materials', 'equipment', 'other']),
  transaction_type: z.enum(['expense', 'bill', 'check', 'credit_card', 'cash']),
  amount: z.string().min(1, 'Amount is required'),
  expense_date: z.date(),
  payee_id: z.string().optional(),
  invoice_number: z.string().optional(),
  is_planned: z.boolean().default(false),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  expense?: Expense;
  onSave: (expense: Expense) => void;
  onCancel: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, onSave, onCancel }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [payeeOpen, setPayeeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      project_id: expense?.project_id || '',
      description: expense?.description || '',
      category: expense?.category || 'materials',
      transaction_type: expense?.transaction_type || 'expense',
      amount: expense?.amount.toString() || '',
      expense_date: expense?.expense_date || new Date(),
      payee_id: expense?.payee_id || '',
      invoice_number: expense?.invoice_number || '',
      is_planned: expense?.is_planned || false,
    },
  });

  // Load projects and vendors
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

        // Load payees
        const { data: payeesData, error: payeesError } = await supabase
          .from('payees')
          .select('*')
          .eq('is_active', true)
          .order('vendor_name');

        if (payeesError) {
          console.error('Error loading payees:', payeesError);
        } else {
          setPayees(payeesData as Payee[] || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load projects and payees.",
          variant: "destructive",
        });
      }
    };

    loadData();
  }, [toast]);

  const onSubmit = async (data: ExpenseFormData) => {
    setLoading(true);
    try {
      const expenseData = {
        id: expense?.id,
        project_id: data.project_id,
        description: data.description,
        category: data.category,
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
          .insert([expenseData])
          .select()
          .single();
        
        if (error) throw error;
        result = newExpense;
      }

      // Transform result to include vendor_name for display
      const transformedExpense: Expense = {
        ...result,
        expense_date: new Date(result.expense_date),
        created_at: new Date(result.created_at),
        updated_at: new Date(result.updated_at),
        vendor_name: result.payee_id ? payees.find(v => v.id === result.payee_id)?.vendor_name : undefined,
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payee</FormLabel>
                    <Popover open={payeeOpen} onOpenChange={setPayeeOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="justify-between"
                          >
                            {field.value
                              ? payees.find(payee => payee.id === field.value)?.vendor_name || "Select payee"
                              : "Select payee"}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search payees..." />
                          <CommandList>
                            <CommandEmpty>No payee found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value=""
                                onSelect={() => {
                                  field.onChange("");
                                  setPayeeOpen(false);
                                }}
                              >
                                No payee
                              </CommandItem>
                              {payees.map((payee) => (
                                <CommandItem
                                  value={payee.vendor_name}
                                  key={payee.id}
                                  onSelect={() => {
                                    field.onChange(payee.id);
                                    setPayeeOpen(false);
                                  }}
                                >
                                  {payee.vendor_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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