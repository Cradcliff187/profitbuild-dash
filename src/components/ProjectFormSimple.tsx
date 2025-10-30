import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ClientSelector } from "@/components/ClientSelector";
import { generateProjectNumber } from "@/types/project";
import { toast } from "sonner";
import { JOB_TYPES } from "@/types/project";

const formSchema = z.object({
  project_name: z.string().min(1, "Project name is required").max(200),
  client_id: z.string().uuid("Please select a client"),
  address: z.string().optional(),
  project_type: z.enum(["construction_project", "work_order"]),
  status: z.enum(["estimating", "quoted", "approved", "in_progress", "complete", "on_hold", "cancelled"]),
  job_type: z.string().optional(),
  payment_terms: z.string(),
  minimum_margin_threshold: z.number().min(0).max(100),
  target_margin: z.number().min(0).max(100),
});

type FormData = z.infer<typeof formSchema>;

interface ProjectFormSimpleProps {
  onSave: (project: any) => void;
  onCancel: () => void;
}

export function ProjectFormSimple({ onSave, onCancel }: ProjectFormSimpleProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_name: "",
      client_id: "",
      address: "",
      project_type: "construction_project",
      status: "estimating",
      job_type: "",
      payment_terms: "Net 30",
      minimum_margin_threshold: 10,
      target_margin: 20,
    },
  });

  const handleClientChange = async (clientId: string) => {
    form.setValue("client_id", clientId);
    
    // Fetch client details
    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();
    
    if (client) {
      setSelectedClient(client);
      if (client.payment_terms) {
        form.setValue("payment_terms", client.payment_terms);
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const projectNumber = await generateProjectNumber();
      
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          project_number: projectNumber,
          project_name: data.project_name,
          client_id: data.client_id,
          client_name: selectedClient?.client_name || "",
          address: data.address,
          project_type: data.project_type,
          status: data.status,
          job_type: data.job_type,
          payment_terms: data.payment_terms,
          minimum_margin_threshold: data.minimum_margin_threshold,
          target_margin: data.target_margin,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Project created successfully");
      onSave(project);

      // Navigate based on project type
      if (data.project_type === "construction_project") {
        navigate(`/estimates?project=${project.id}`);
      } else {
        navigate(`/projects/${project.id}`);
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
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
                <Input placeholder="Enter project name" {...field} />
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

        {/* Three column grid for selects */}
        <div className="grid grid-cols-3 gap-3">
          {/* Project Type */}
          <FormField
            control={form.control}
            name="project_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="construction_project">Construction Project</SelectItem>
                    <SelectItem value="work_order">Work Order</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="estimating">Estimating</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Job Type */}
          <FormField
            control={form.control}
            name="job_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
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
        </div>

        {/* Payment Terms and Margins */}
        <div className="grid grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="payment_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Terms</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Due on receipt">Due on Receipt</SelectItem>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minimum_margin_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Margin %</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="target_margin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Margin %</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? "Creating..." : "Create Project"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
