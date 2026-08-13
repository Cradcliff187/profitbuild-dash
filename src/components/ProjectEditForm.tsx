import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Project } from "@/types/project";
import { ProjectFormFields, SelectedClientSummary } from "@/components/forms/ProjectFormFields";
import { projectFormSchema, ProjectFormValues } from "@/components/forms/projectFormSchema";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProjectEditFormProps {
  project: Project;
  onSave: (project: Project) => void;
  onCancel: () => void;
  /**
   * `page` (default) — renders inline for a routed page (e.g. /projects/:id/edit),
   * actions sit at the end of the form.
   * `sheet` — fills the height of a slide-out: scrollable body + a pinned footer
   * with the actions. The containing Sheet owns the title/header.
   */
  variant?: "page" | "sheet";
}

export const ProjectEditForm = ({ project, onSave, onCancel, variant = "page" }: ProjectEditFormProps) => {
  const [selectedClient, setSelectedClient] = useState<SelectedClientSummary | null>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      project_name: project.project_name,
      client_id: "",
      address: project.address || "",
      customer_po_number: project.customer_po_number || "",
      project_type: project.project_type,
      status: project.status,
      job_type: project.job_type || "",
      notes: project.notes || "",
      payment_terms: project.payment_terms || "Net 30",
      minimum_margin_threshold: project.minimum_margin_threshold ?? 10,
      target_margin: project.target_margin ?? 20,
      do_not_exceed: project.do_not_exceed != null ? String(project.do_not_exceed) : "",
      owner_id: project.owner_id || "",
      start_date: project.start_date,
      end_date: project.end_date,
    },
  });

  const isLoading = form.formState.isSubmitting;

  // Resolve the existing client (legacy: projects reference by client_name).
  // Sets client_id + the details summary WITHOUT overwriting the saved
  // payment_terms (that only changes when the user picks a different client).
  useEffect(() => {
    const loadInitialClient = async () => {
      if (!project.client_name) return;
      const { data: client, error } = await supabase
        .from("clients")
        .select("*")
        .eq("client_name", project.client_name)
        .maybeSingle();
      if (error) { console.error("Error loading initial client:", error); return; }
      if (client) {
        form.setValue("client_id", client.id, { shouldValidate: true });
        setSelectedClient(client as SelectedClientSummary);
      }
    };
    loadInitialClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.client_name]);

  // User picked a client: set id, load details, and adopt the client's terms.
  const handleClientChange = async (clientId: string) => {
    form.setValue("client_id", clientId, { shouldValidate: true });
    if (!clientId) {
      setSelectedClient(null);
      return;
    }
    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .maybeSingle();
    if (error) { console.error("Error fetching client data:", error); setSelectedClient(null); return; }
    if (client) {
      setSelectedClient(client as SelectedClientSummary);
      if (client.payment_terms) form.setValue("payment_terms", client.payment_terms);
    }
  };

  const onSubmit = async (data: ProjectFormValues) => {
    // Status workflow guard (construction projects only, not work orders).
    if (data.status === "approved" && data.project_type !== "work_order") {
      const { data: estimates } = await supabase
        .from("estimates")
        .select("status")
        .eq("project_id", project.id)
        .eq("status", "approved");
      if (!estimates || estimates.length === 0) {
        const message =
          "Cannot approve project without an approved estimate. Go to Estimates and approve an estimate first for accurate financial tracking.";
        form.setError("status", { message });
        toast.error("Cannot approve project", { description: message });
        return;
      }
    }

    try {
      const clientName = selectedClient?.client_name || project.client_name;

      const { data: updatedProject, error } = await supabase
        .from("projects")
        .update({
          project_name: data.project_name.trim(),
          client_name: clientName,
          address: data.address?.trim() || null,
          customer_po_number: data.customer_po_number?.trim() || null,
          project_type: data.project_type,
          status: data.status as any, // Cast to any to avoid Supabase type conflicts
          job_type: data.job_type?.trim() || null,
          notes: data.notes?.trim() || null,
          payment_terms: data.payment_terms,
          minimum_margin_threshold: data.minimum_margin_threshold,
          target_margin: data.target_margin,
          do_not_exceed: data.do_not_exceed ? parseFloat(data.do_not_exceed) : null,
          owner_id: data.owner_id || null,
          start_date: data.start_date?.toISOString().split("T")[0] || null,
          end_date: data.end_date?.toISOString().split("T")[0] || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id)
        .select()
        .single();

      if (error) throw error;

      const formattedProject: Project = {
        ...updatedProject,
        created_at: new Date(updatedProject.created_at),
        updated_at: new Date(updatedProject.updated_at),
        start_date: updatedProject.start_date ? new Date(updatedProject.start_date) : undefined,
        end_date: updatedProject.end_date ? new Date(updatedProject.end_date) : undefined,
      };

      onSave(formattedProject);

      const label = data.project_type === "work_order" ? "Work order" : "Project";
      toast.success(`${label} Updated`, { description: `"${data.project_name}" has been updated successfully.` });
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to save changes. Please try again.");
    }
  };

  const fields = (
    <ProjectFormFields
      form={form}
      onClientChange={handleClientChange}
      selectedClient={selectedClient}
      projectNumber={project.project_number}
    />
  );

  const actions = (
    <div className="flex gap-2">
      <Button type="submit" className="flex-1" disabled={isLoading}>
        <Save className="h-4 w-4 mr-2" />
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
      <Button type="button" onClick={onCancel} variant="outline" disabled={isLoading}>
        Cancel
      </Button>
    </div>
  );

  return (
    <Form {...form}>
      {variant === "sheet" ? (
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
            {fields}
          </div>
          <div className="shrink-0 border-t bg-background px-4 sm:px-6 py-3">
            {actions}
          </div>
        </form>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {fields}
          <div className="pt-2">{actions}</div>
        </form>
      )}
    </Form>
  );
};
