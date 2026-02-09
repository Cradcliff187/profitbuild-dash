/**
 * @file RevenueForm.tsx
 * @description Form component for creating/editing invoices with split support
 * 
 * UPDATED: Added split invoice functionality
 * - Split button for existing invoices
 * - Read-only amount field when split
 * - Visual indicator for split status
 * 
 * Pattern mirrors existing src/components/ExpenseForm.tsx
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Split } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ProjectRevenue, CreateProjectRevenueData } from '@/types/revenue';
import { Project } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { RevenueSplitDialog } from '@/components/RevenueSplitDialog';
import { parseDateOnly } from '@/utils/dateUtils';

// ============================================================================
// SCHEMA
// ============================================================================

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

// ============================================================================
// INTERFACES
// ============================================================================

interface RevenueFormProps {
  revenue?: ProjectRevenue;
  onSave: (revenue: ProjectRevenue) => void;
  onCancel: () => void;
  defaultProjectId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const RevenueForm: React.FC<RevenueFormProps> = ({
  revenue,
  onSave,
  onCancel,
  defaultProjectId,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);


  const form = useForm<RevenueFormData>({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      project_id: revenue?.project_id || defaultProjectId || '',
      invoice_date: revenue?.invoice_date
        ? revenue.invoice_date instanceof Date
          ? revenue.invoice_date
          : new Date(revenue.invoice_date)
        : new Date(),
      invoice_number: revenue?.invoice_number || '',
      amount: revenue?.amount?.toString() || '',
      description: revenue?.description || '',
      account_name: revenue?.account_name || '',
      account_full_name: revenue?.account_full_name || '',
      quickbooks_transaction_id: revenue?.quickbooks_transaction_id || '',
      client_id: revenue?.client_id || '',
    },
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load projects
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('category', 'construction')
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;

        const transformedProjects = (projectsData || []).map(project => ({
          ...project,
          start_date: project.start_date
            ? new Date(project.start_date)
            : undefined,
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
        toast.error('Failed to load projects.');
      }
    };

    loadData();
  }, [defaultProjectId, revenue]);

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

  // ============================================================================
  // HANDLERS
  // ============================================================================

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
        // Don't update project_id if revenue is split (it's set to SYS-000)
        const updateData: any = {
          invoice_date: revenueData.invoice_date.toISOString().split('T')[0],
          invoice_number: revenueData.invoice_number || null,
          amount: revenueData.amount,
          description: revenueData.description || null,
          account_name: revenueData.account_name || null,
          account_full_name: revenueData.account_full_name || null,
          quickbooks_transaction_id:
            revenueData.quickbooks_transaction_id || null,
          client_id: revenueData.client_id || null,
        };
        
        // Only update project_id if revenue is not split
        if (!revenue.is_split) {
          updateData.project_id = revenueData.project_id;
        }
        
        const { data: updatedRevenue, error } = await supabase
          .from('project_revenues')
          .update(updateData)
          .eq('id', revenue.id)
          .select()
          .single();

        if (error) throw error;
        result = updatedRevenue;
      } else {
        // Create new revenue
        const { data: newRevenue, error } = await supabase
          .from('project_revenues')
          .insert([
            {
              project_id: revenueData.project_id,
              invoice_date: revenueData.invoice_date.toISOString().split('T')[0],
              invoice_number: revenueData.invoice_number || null,
              amount: revenueData.amount,
              description: revenueData.description || null,
              account_name: revenueData.account_name || null,
              account_full_name: revenueData.account_full_name || null,
              quickbooks_transaction_id:
                revenueData.quickbooks_transaction_id || null,
              client_id: revenueData.client_id || null,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        result = newRevenue;
      }

      // Transform result to match ProjectRevenue interface
      const transformedRevenue: ProjectRevenue = {
        ...result,
        invoice_date: parseDateOnly(result.invoice_date),
        created_at: new Date(result.created_at),
        updated_at: new Date(result.updated_at),
        is_split: result.is_split || false, // Preserve is_split flag
        project_name: selectedProject?.project_name,
        project_number: selectedProject?.project_number,
        client_name: selectedProject?.client_name,
      };

      onSave(transformedRevenue);

      toast.success(revenue ? 'Invoice Updated' : 'Invoice Added', { description: `The invoice has been successfully ${
          revenue ? 'updated' : 'added'
        }.` });
    } catch (error: any) {
      console.error('Error saving revenue:', error);
      toast.error(error?.message || 'Failed to save invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSplitsUpdated = async () => {
    if (!revenue?.id) {
      setShowSplitDialog(false);
      return;
    }

    setShowSplitDialog(false);
    
    try {
      // Refetch updated revenue data from database
      const { data: updatedRevenue, error } = await supabase
        .from('project_revenues')
        .select(`
          *,
          projects (
            project_name,
            project_number,
            client_name
          )
        `)
        .eq('id', revenue.id)
        .single();

      if (error) throw error;
      if (!updatedRevenue) {
        throw new Error('Revenue not found');
      }

      // Transform to match ProjectRevenue interface
      const transformedRevenue: ProjectRevenue = {
        ...updatedRevenue,
        invoice_date: parseDateOnly(updatedRevenue.invoice_date),
        created_at: new Date(updatedRevenue.created_at),
        updated_at: new Date(updatedRevenue.updated_at),
        is_split: updatedRevenue.is_split || false,
        project_name: updatedRevenue.projects?.project_name,
        project_number: updatedRevenue.projects?.project_number,
        client_name: updatedRevenue.projects?.client_name,
      };

      // Call onSave to trigger parent refresh
      onSave(transformedRevenue);

      toast.success('Splits Updated', { description: 'Invoice allocation has been updated successfully.' });
    } catch (error) {
      console.error('Error refreshing revenue after split update:', error);
      toast.warning('Splits were updated, but failed to refresh invoice data. Please refresh the page.');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Card className="compact-card">
      <CardHeader className="p-compact">
        <CardTitle className="text-interface">
          {revenue ? 'Edit Invoice' : 'Add New Invoice'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-compact">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="form-dense">
            {/* Project Selection */}
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={revenue?.is_split}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.project_number} - {project.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {revenue?.is_split && (
                    <p className="text-xs text-warning">
                      ⚠️ This invoice is split across multiple projects.
                    </p>
                  )}
                  {selectedProject && !revenue?.is_split && (
                    <p className="text-xs text-muted-foreground">
                      Client: {selectedProject.client_name || 'N/A'}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Invoice Number Row */}
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
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value
                              ? format(field.value, 'PPP')
                              : 'Pick a date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
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
                name="invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice #</FormLabel>
                    <FormControl>
                      <Input placeholder="INV-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Amount Field with Split Button */}
            <div className="grid grid-cols-2 gap-2">
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
                        readOnly={revenue?.is_split}
                      />
                    </FormControl>
                    {revenue?.is_split && (
                      <p className="text-xs text-warning">
                        ⚠️ Amount is read-only for split invoices.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Split Button - Only show for existing invoices */}
              {revenue && (
                <div className="flex items-end">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant={revenue.is_split ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => setShowSplitDialog(true)}
                          className="w-full h-btn-compact"
                        >
                          <Split className="h-4 w-4 mr-2" />
                          {revenue.is_split ? 'Manage Splits' : 'Split Invoice'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {revenue.is_split
                          ? 'View and edit how this invoice is allocated across projects'
                          : 'Allocate this invoice across multiple projects'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>

            {/* Split Info Display */}
            {revenue?.is_split && (
              <div className="rounded-md bg-muted p-2 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <Split className="h-3 w-3" />
                  <span className="font-medium">Split Invoice</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This {formatCurrency(revenue.amount)} invoice is allocated
                  across multiple projects. Click "Manage Splits" to view or
                  edit allocations.
                </p>
              </div>
            )}

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter invoice description..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* QuickBooks Fields (Collapsible in future) */}
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="account_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="QB Account" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quickbooks_transaction_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>QB Transaction ID</FormLabel>
                    <FormControl>
                      <Input placeholder="QB-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-1 justify-end mt-4">
              <Button
                type="submit"
                disabled={loading}
                size="sm"
                className="h-btn-compact"
              >
                {loading
                  ? 'Saving...'
                  : revenue
                  ? 'Update Invoice'
                  : 'Add Invoice'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                size="sm"
                className="h-btn-compact"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>

        {/* Split Dialog */}
        {revenue && (
          <RevenueSplitDialog
            revenue={revenue}
            open={showSplitDialog}
            onClose={() => setShowSplitDialog(false)}
            onSuccess={handleSplitsUpdated}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default RevenueForm;
