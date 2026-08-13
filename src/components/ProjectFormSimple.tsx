import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { generateProjectNumber } from "@/types/project";
import { toast } from "sonner";
import { ProjectFormFields, SelectedClientSummary } from "@/components/forms/ProjectFormFields";
import { projectFormSchema, ProjectFormValues } from "@/components/forms/projectFormSchema";

interface ProjectFormSimpleProps {
  onSave: (project: any) => void;
  onCancel: () => void;
  disableNavigate?: boolean;
  defaultProjectType?: 'construction_project' | 'work_order';
}

export function ProjectFormSimple({ onSave, onCancel, disableNavigate = false, defaultProjectType = 'construction_project' }: ProjectFormSimpleProps) {
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<SelectedClientSummary | null>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      project_name: "",
      client_id: "",
      address: "",
      customer_po_number: "",
      project_type: defaultProjectType,
      status: defaultProjectType === 'work_order' ? "in_progress" : "estimating",
      job_type: "",
      notes: "",
      payment_terms: "Net 30",
      minimum_margin_threshold: 10,
      target_margin: 20,
      do_not_exceed: "",
      owner_id: "",
      start_date: undefined,
      end_date: undefined,
    },
  });

  const isLoading = form.formState.isSubmitting;

  const handleClientChange = async (clientId: string) => {
    form.setValue("client_id", clientId, { shouldValidate: true });
    if (!clientId) {
      setSelectedClient(null);
      return;
    }
    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();
    if (client) {
      setSelectedClient(client as SelectedClientSummary);
      if (client.payment_terms) {
        form.setValue("payment_terms", client.payment_terms);
      }
    }
  };

  const onSubmit = async (data: ProjectFormValues) => {
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
          customer_po_number: data.customer_po_number || null,
          project_type: data.project_type,
          status: data.status,
          job_type: data.job_type,
          notes: data.notes?.trim() || null,
          payment_terms: data.payment_terms,
          minimum_margin_threshold: data.minimum_margin_threshold,
          target_margin: data.target_margin,
          do_not_exceed: data.do_not_exceed ? parseFloat(data.do_not_exceed) : null,
          owner_id: data.owner_id || null,
          start_date: data.start_date ? data.start_date.toISOString().split('T')[0] : null,
          end_date: data.end_date ? data.end_date.toISOString().split('T')[0] : null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Project created successfully");
      onSave(project);

      // Navigate based on project type (only if not disabled)
      if (!disableNavigate) {
        if (data.project_type === "construction_project") {
          navigate(`/estimates?project=${project.id}`);
        } else {
          navigate(`/projects/${project.id}`);
        }
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ProjectFormFields
          form={form}
          onClientChange={handleClientChange}
          selectedClient={selectedClient}
        />

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
