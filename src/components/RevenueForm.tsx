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
import { ProjectRevenue, CreateProjectRevenueData } from '@/types/revenue';
import { Project } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const revenueSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  invoice_date: z.date(),
  invoice_number: z.string().optional(),
  amount: z.string().min(1, 'Amount is required'),
  description: z.string().optional(),
  account_name: z.string().optional(),
  account_full_name: z.string().optional(),
  quickbooks_transaction_id: z.string().optional(),
  client_id: z.string().optional(),
});

type RevenueFormData = z.infer<typeof revenueSchema>;

interface RevenueFormProps {
  revenue?: ProjectRevenue;
  onSave: (revenue: ProjectRevenue) => void;
  onCancel: () => void;
  defaultProjectId?: string;
}

export const RevenueForm: React.FC<RevenueFormProps> = ({ revenue, onSave, onCancel, defaultProjectId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<RevenueFormData>({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      project_id: revenue?.project_id || defaultProjectId || '',
      invoice_date: revenue?.invoice_date ? (revenue.invoice_date instanceof Date ? revenue.invoice_date : new Date(revenue.invoice_date)) : new Date(),
      invoice_number: revenue?.invoice_number || '',
      amount: revenue?.amount?.toString() || '',
      description: revenue?.description || '',
      account_name: revenue?.account_name || '',
      account_full_name: revenue?.account_full_name || '',
      quickbooks_transaction_id: revenue?.quickbooks_transaction_id || '',
      client_id: revenue?.client_id || '',
    },
  });

  // Load projects
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load construction projects (revenues are typically for construction projects)
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('category', 'construction')
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;

        const transformedProjects = (projectsData || []).map(project => ({
          ...project,
          start_date: project.start_date ? new Date(project.start_date) : undefined,
          end_date: project.end_date ? new Date(project.end_date) : undefined,
          created_at: new Date(project.created_at),
          updated_at: new Date(project.updated_at),
        }));
        setProjects(transformedProjects);

        // Set selected project if defaultProjectId or revenue exists
        if (defaultProjectId || revenue?.project_id) {
          const projectId = revenue?.project_id || defaultProjectId;
          const project = transformedProjects.find(p => p.id === projectId);
          if (project) {
            setSelectedProject(project);
          }
        }
      } catch (error) {
        console.error('Error loading projects:', error);
        toast({
          title: "Error",
          description: "Failed to load projects.",
          variant: "destructive",
        });
      }
    };

    loadData();
  }, [toast, defaultProjectId, revenue]);

  // Update selected project when project_id changes
  useEffect(() => {
    const projectId = form.watch('project_id');
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        // Auto-populate client_id from project if available
        if (project.client_id) {
          form.setValue('client_id', project.client_id);
        }
      } else {
        setSelectedProject(null);
      }
    } else {
      setSelectedProject(null);
    }
  }, [form.watch('project_id'), projects, form]);

  const onSubmit = async (data: RevenueFormData) => {
    setLoading(true);
    try {
      const revenueData: CreateProjectRevenueData = {
        project_id: data.project_id,
        invoice_date: data.invoice_date,
        invoice_number: data.invoice_number || undefined,
        amount: parseFloat(data.amount),
        description: data.description || undefined,
        account_name: data.account_name || undefined,
        account_full_name: data.account_full_name || undefined,
        quickbooks_transaction_id: data.quickbooks_transaction_id || undefined,
        client_id: data.client_id || undefined,
      };

      let result;
      if (revenue?.id) {
        // Update existing revenue
        const { data: updatedRevenue, error } = await supabase
          .from('project_revenues')
          .update({
            project_id: revenueData.project_id,
            invoice_date: revenueData.invoice_date.toISOString().split('T')[0],
            invoice_number: revenueData.invoice_number || null,
            amount: revenueData.amount,
            description: revenueData.description || null,
            account_name: revenueData.account_name || null,
            account_full_name: revenueData.account_full_name || null,
            quickbooks_transaction_id: revenueData.quickbooks_transaction_id || null,
            client_id: revenueData.client_id || null,
          })
          .eq('id', revenue.id)
          .select()
          .single();
        
        if (error) throw error;
        result = updatedRevenue;
      } else {
        // Create new revenue
        const { data: newRevenue, error } = await supabase
          .from('project_revenues')
          .insert([{
            project_id: revenueData.project_id,
            invoice_date: revenueData.invoice_date.toISOString().split('T')[0],
            invoice_number: revenueData.invoice_number || null,
            amount: revenueData.amount,
            description: revenueData.description || null,
            account_name: revenueData.account_name || null,
            account_full_name: revenueData.account_full_name || null,
            quickbooks_transaction_id: revenueData.quickbooks_transaction_id || null,
            client_id: revenueData.client_id || null,
          }])
          .select()
          .single();
        
        if (error) throw error;
        result = newRevenue;
      }

      // Transform result to match ProjectRevenue interface
      const transformedRevenue: ProjectRevenue = {
        ...result,
        invoice_date: new Date(result.invoice_date),
        created_at: new Date(result.created_at),
        updated_at: new Date(result.updated_at),
        project_name: selectedProject?.project_name,
        project_number: selectedProject?.project_number,
        client_name: selectedProject?.client_name,
      };

      onSave(transformedRevenue);
      
      toast({
        title: revenue ? "Invoice Updated" : "Invoice Added",
        description: `The invoice has been successfully ${revenue ? 'updated' : 'added'}.`,
      });
    } catch (error: any) {
      console.error('Error saving revenue:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="compact-card">
      <CardHeader className="p-compact">
        <CardTitle className="text-interface">{revenue ? 'Edit Invoice' : 'Add New Invoice'}</CardTitle>
      </CardHeader>
      <CardContent className="p-compact">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="form-dense">
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.project_number} - {project.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProject && (
                    <p className="text-xs text-muted-foreground">
                      Client: {selectedProject.client_name || 'N/A'}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="invoice_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date *</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="invoice_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter invoice number (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter invoice description (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="account_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="QuickBooks account (optional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Full account path (optional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="quickbooks_transaction_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>QuickBooks Transaction ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="QB transaction ID (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : revenue ? 'Update Invoice' : 'Add Invoice'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
