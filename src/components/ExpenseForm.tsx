import React from 'react';
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
import { Expense, ExpenseCategory, ExpenseType } from '@/types/expense';
import { Estimate } from '@/types/estimate';
import { ProjectSelector } from './ProjectSelector';
import { cn } from '@/lib/utils';

const expenseSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['Labor', 'Materials', 'Equipment', 'Other']),
  type: z.enum(['Planned', 'Unplanned']),
  amount: z.string().min(1, 'Amount is required'),
  date: z.date(),
  vendor: z.string().optional(),
  invoiceNumber: z.string().optional(),
  estimateLineItemId: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  estimates: Estimate[];
  expense?: Expense;
  onSave: (expense: Expense) => void;
  onCancel: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ estimates, expense, onSave, onCancel }) => {
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      projectId: expense?.projectId || '',
      description: expense?.description || '',
      category: expense?.category || 'Materials',
      type: expense?.type || 'Unplanned',
      amount: expense?.amount.toString() || '',
      date: expense?.date || new Date(),
      vendor: expense?.vendor || '',
      invoiceNumber: expense?.invoiceNumber || '',
      estimateLineItemId: expense?.estimateLineItemId || '',
    },
  });

  const selectedProject = form.watch('projectId');
  const selectedType = form.watch('type');
  const selectedEstimate = estimates.find(e => e.id === selectedProject);

  const onSubmit = (data: ExpenseFormData) => {
    const expenseData: Expense = {
      id: expense?.id || crypto.randomUUID(),
      projectId: data.projectId,
      description: data.description,
      category: data.category as ExpenseCategory,
      type: data.type as ExpenseType,
      amount: parseFloat(data.amount),
      date: data.date,
      vendor: data.vendor,
      invoiceNumber: data.invoiceNumber,
      estimateLineItemId: data.estimateLineItemId,
      createdAt: expense?.createdAt || new Date(),
      source: 'manual',
    };

    onSave(expenseData);
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
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project *</FormLabel>
                  <FormControl>
                    <ProjectSelector
                      estimates={estimates}
                      selectedEstimate={estimates.find(e => e.id === field.value)}
                      onSelect={(estimate) => field.onChange(estimate.id)}
                      placeholder="Select a project"
                    />
                  </FormControl>
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
                        <SelectItem value="Labor">Labor</SelectItem>
                        <SelectItem value="Materials">Materials</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Planned">Planned (In Estimate)</SelectItem>
                        <SelectItem value="Unplanned">Unplanned (Additional)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedType === 'Planned' && selectedEstimate && (
              <FormField
                control={form.control}
                name="estimateLineItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Estimate Line Item</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select estimate line item" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedEstimate.lineItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.description} - ${item.total.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                name="date"
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
                          className="pointer-events-auto"
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
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Vendor name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceNumber"
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
              <Button type="submit">
                {expense ? 'Update Expense' : 'Add Expense'}
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