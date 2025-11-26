import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { generateProjectNumber, JOB_TYPES } from "@/types/project";
import { toast } from "sonner";
import { ClientSelector } from "@/components/ClientSelector";

const formSchema = z.object({
  project_name: z.string().min(1, "Project name is required").max(200),
  client_id: z.string().uuid("Please select a client"),
  address: z.string().optional(),
  customer_po_number: z.string().optional(),
  job_type: z.string().optional(),
  estimated_cost: z.string().optional(),
  quoted_price: z.string().optional(),
  do_not_exceed: z.string().optional(),
  notes: z.string().optional(),
  start_date: z.date(),
  end_date: z.date().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface QuickWorkOrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const QuickWorkOrderForm = ({ onSuccess, onCancel }: QuickWorkOrderFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_name: "",
      client_id: "",
      address: "",
      customer_po_number: "",
      job_type: "",
      estimated_cost: "",
      quoted_price: "",
      do_not_exceed: "",
      notes: "",
      start_date: new Date(),
      end_date: undefined,
    },
  });

  const handleClientChange = async (clientId: string, clientName?: string) => {
    form.setValue("client_id", clientId);
    
    // Fetch client details
    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();
    
    if (client) {
      setSelectedClient(client);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);

    try {
      // Generate project number
      const generatedNumber = await generateProjectNumber();
      
      // Create the work order project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          project_number: generatedNumber,
          project_name: data.project_name,
          client_id: data.client_id || null,
          client_name: selectedClient?.client_name || "",
          address: data.address || null,
          customer_po_number: data.customer_po_number || null,
          job_type: data.job_type || null,
          project_type: 'work_order',
          category: 'construction',
          status: 'in_progress',
          start_date: data.start_date.toISOString().split('T')[0],
          end_date: data.end_date ? data.end_date.toISOString().split('T')[0] : null,
          original_est_costs: data.estimated_cost ? parseFloat(data.estimated_cost) : null,
          contracted_amount: data.quoted_price ? parseFloat(data.quoted_price) : null,
          do_not_exceed: data.do_not_exceed ? parseFloat(data.do_not_exceed) : null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (projectError) {
        throw new Error('Failed to create work order');
      }

      // If there's an estimated cost, create a simple estimate
      let estimateCreated = false;
      let estimateNumber = '';
      if (data.estimated_cost && parseFloat(data.estimated_cost) > 0) {
        estimateNumber = `EST-${generatedNumber}`;
        const { error: estimateError } = await supabase
          .from('estimates')
          .insert({
            project_id: project.id,
            estimate_number: estimateNumber,
            total_amount: parseFloat(data.estimated_cost),
            status: 'approved',
            date_created: new Date().toISOString().split('T')[0],
            is_auto_generated: true,
          });

        if (estimateError) {
          console.warn('Failed to create estimate, but work order was created successfully');
        } else {
          estimateCreated = true;
        }
      }

      if (estimateCreated) {
        toast.success(`Work order created successfully. Estimate ${estimateNumber} was automatically created.`);
      } else {
        toast.success("Work order created successfully");
      }
      onSuccess();
    } catch (error) {
      console.error('Error creating work order:', error);
      toast.error("Failed to create work order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Project Name */}
        <FormField
          control={form.control}
          name="project_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter project name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Project Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add project notes, requirements, or special instructions..."
                  className="min-h-[60px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Client */}
        <FormField
          control={form.control}
          name="client_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client *</FormLabel>
              <FormControl>
                <ClientSelector
                  value={field.value}
                  onValueChange={handleClientChange}
                  placeholder="Select a client"
                  required={true}
                  showLabel={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Client Details */}
        {selectedClient && (
          <div className="p-3 bg-muted/50 rounded-md border text-xs space-y-1">
            <div className="font-medium">{selectedClient.client_name}</div>
            {selectedClient.company_name && (
              <div className="text-muted-foreground">{selectedClient.company_name}</div>
            )}
            {selectedClient.email && (
              <div className="text-muted-foreground">{selectedClient.email}</div>
            )}
            {selectedClient.phone && (
              <div className="text-muted-foreground">{selectedClient.phone}</div>
            )}
          </div>
        )}

        {/* Address */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter project address" 
                  className="min-h-[60px] resize-none"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Customer PO Number */}
        <FormField
          control={form.control}
          name="customer_po_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer PO Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter PO number (optional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Job Type and Start Date - Responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="job_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {JOB_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
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
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
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
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target/End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
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
        </div>

        {/* Financial Fields - Three column grid on desktop, responsive on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="estimated_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Cost</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Your estimated costs. Entering a value will automatically create an approved estimate.</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quoted_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quoted Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Amount to charge client</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="do_not_exceed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Do Not Exceed</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Maximum billable amount</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Creating..." : "Create Work Order"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default QuickWorkOrderForm;
