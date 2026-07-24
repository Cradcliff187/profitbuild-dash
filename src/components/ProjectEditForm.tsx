import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project, ProjectType, ProjectStatus, JOB_TYPES, PROJECT_STATUSES } from "@/types/project";
import { Client } from "@/types/client";
import { ClientSelector } from "@/components/ClientSelector";
import { FormSection } from "@/components/forms/FormSection";
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
  const [projectName, setProjectName] = useState(project.project_name);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedClientData, setSelectedClientData] = useState<Client | null>(null);
  const [address, setAddress] = useState(project.address || "");
  const [projectType, setProjectType] = useState<ProjectType>(project.project_type);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [jobType, setJobType] = useState(project.job_type || "");
  const [notes, setNotes] = useState(project.notes || "");
  const [customerPoNumber, setCustomerPoNumber] = useState(project.customer_po_number || "");
  const [startDate, setStartDate] = useState<Date | undefined>(project.start_date);
  const [endDate, setEndDate] = useState<Date | undefined>(project.end_date);
  const [doNotExceed, setDoNotExceed] = useState<string>(project.do_not_exceed?.toString() || '');
  const [ownerId, setOwnerId] = useState<string>(project.owner_id || '');
  const [internalEmployees, setInternalEmployees] = useState<Array<{ id: string; payee_name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusValidationError, setStatusValidationError] = useState<string | null>(null);

  // Fetch internal employees for owner selector
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from('payees')
        .select('id, payee_name')
        .eq('is_internal', true)
        .order('payee_name');
      if (error) { console.error('Failed to load employees:', error); return; }
      if (data) setInternalEmployees(data);
    };
    fetchEmployees();
  }, []);

  // Fetch client data when component loads or client changes
  const fetchClientData = async (clientId: string) => {
    try {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (error) throw error;
      setSelectedClientData(client as Client);
    } catch (error) {
      console.error('Error fetching client data:', error);
      setSelectedClientData(null);
    }
  };

  // Load initial client data based on client_name (legacy support)
  useEffect(() => {
    const loadInitialClient = async () => {
      if (project.client_name) {
        try {
          const { data: client, error } = await supabase
            .from('clients')
            .select('*')
            .eq('client_name', project.client_name)
            .maybeSingle();

          if (error) throw error;
          if (client) {
            setSelectedClientId(client.id);
            setSelectedClientData(client as Client);
          }
        } catch (error) {
          console.error('Error loading initial client:', error);
        }
      }
    };
    loadInitialClient();
  }, [project.client_name]);

  const handleClientChange = (clientId: string, clientName?: string) => {
    setSelectedClientId(clientId);
    if (clientId) {
      fetchClientData(clientId);
    } else {
      setSelectedClientData(null);
    }
  };

  const validateForm = async () => {
    if (!projectName.trim()) {
      toast.error("Missing Information", { description: "Project name is required." });
      return false;
    }

    if (!selectedClientId) {
      toast.error("Missing Information", { description: "Client selection is required." });
      return false;
    }

    // Validate status change workflow (only for construction projects, not work orders)
    if (status === 'approved' && projectType !== 'work_order') {
      // Check if project has an approved estimate
      const { data: estimates } = await supabase
        .from('estimates')
        .select('status')
        .eq('project_id', project.id)
        .eq('status', 'approved');

      if (!estimates || estimates.length === 0) {
        setStatusValidationError(
          "Cannot approve project without an approved estimate. Go to Estimates and approve an estimate first for accurate financial tracking."
        );
        return false;
      }
    }

    setStatusValidationError(null);
    return true;
  };

  const handleSave = async () => {
    if (!await validateForm()) return;

    setIsLoading(true);

    try {
      const clientName = selectedClientData?.client_name || project.client_name;

      const { data: updatedProject, error } = await supabase
        .from('projects')
        .update({
          project_name: projectName.trim(),
          client_name: clientName,
          address: address.trim() || null,
          customer_po_number: customerPoNumber.trim() || null,
          project_type: projectType,
          status: status as any, // Cast to any to avoid Supabase type conflicts
          job_type: jobType.trim() || null,
          notes: notes.trim() || null,
          start_date: startDate?.toISOString().split('T')[0] || null,
          end_date: endDate?.toISOString().split('T')[0] || null,
          do_not_exceed: doNotExceed ? parseFloat(doNotExceed) : null,
          owner_id: ownerId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id)
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

      const label = projectType === 'work_order' ? 'Work order' : 'Project';
      toast.success(`${label} Updated`, { description: `"${projectName}" has been updated successfully.` });

    } catch (error) {
      console.error('Error updating project:', error);
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Field sections (shared by both variants) ----
  const sections = (
    <>
      {/* Read-only project number for context (the container already shows it,
          this keeps it visible while scrolled). */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Project #</span>
        <Badge variant="outline" className="font-mono">{project.project_number}</Badge>
      </div>

      <FormSection title="Basics" withDivider>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name *</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>

          <div className="space-y-2">
            <Label>Client *</Label>
            <ClientSelector
              value={selectedClientId}
              onValueChange={handleClientChange}
              placeholder="Select a client"
              required
              showLabel={false}
            />
          </div>
        </div>

        {/* Client Details — compact muted box (mirrors the create form) */}
        {selectedClientData && (
          <div className="rounded-md border bg-muted/50 p-3 text-xs space-y-1">
            <div className="font-medium">{selectedClientData.client_name}</div>
            {selectedClientData.company_name && (
              <div className="text-muted-foreground">{selectedClientData.company_name}</div>
            )}
            {selectedClientData.email && (
              <div className="text-muted-foreground">{selectedClientData.email}</div>
            )}
            {selectedClientData.phone && (
              <div className="text-muted-foreground">{selectedClientData.phone}</div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="customerPoNumber">Customer PO Number</Label>
          <Input
            id="customerPoNumber"
            value={customerPoNumber}
            onChange={(e) => setCustomerPoNumber(e.target.value)}
            placeholder="Enter PO number (optional)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Project Address</Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter project address"
            className="min-h-[60px] resize-none"
          />
        </div>
      </FormSection>

      <FormSection title="Classification" withDivider>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Project Type</Label>
            <Select value={projectType} onValueChange={(value: ProjectType) => setProjectType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="construction_project">Construction Project</SelectItem>
                <SelectItem value="work_order">Work Order</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value: ProjectStatus) => {
              setStatus(value);
              setStatusValidationError(null); // Clear error when status changes
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((statusOption) => (
                  <SelectItem key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobType">Job Type</Label>
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger>
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {statusValidationError && (
          <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {statusValidationError}
            </AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-muted-foreground">
          Workflow: Estimating → Quoted → Approved → In Progress → Complete
        </p>
      </FormSection>

      <FormSection title="Schedule" withDivider>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <DatePickerPopover value={startDate} onSelect={setStartDate} />
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <DatePickerPopover value={endDate} onSelect={setEndDate} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Budget & Ownership" withDivider>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="doNotExceed">Do Not Exceed (Optional)</Label>
            <Input
              id="doNotExceed"
              type="number"
              step="0.01"
              min="0"
              placeholder="Budget ceiling"
              value={doNotExceed}
              onChange={(e) => setDoNotExceed(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Maximum budget cap. Dashboard will alert when expenses approach this limit.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Project Owner (Optional)</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {internalEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.payee_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>

      <FormSection title="Notes" withDivider>
        <div className="space-y-2">
          <Label htmlFor="notes" className="sr-only">Project Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add project notes, requirements, or special instructions..."
            rows={3}
            className="resize-none"
          />
        </div>
      </FormSection>
    </>
  );

  const actions = (
    <div className="flex gap-2">
      <Button onClick={handleSave} className="flex-1" disabled={isLoading}>
        <Save className="h-4 w-4 mr-2" />
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
      <Button onClick={onCancel} variant="outline" disabled={isLoading}>
        Cancel
      </Button>
    </div>
  );

  // Sheet variant: scrollable body + pinned footer that fills the Sheet height.
  if (variant === "sheet") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
          {sections}
        </div>
        <div className="shrink-0 border-t bg-background px-4 sm:px-6 py-3">
          {actions}
        </div>
      </div>
    );
  }

  // Page variant: inline flow (the page scrolls).
  return (
    <div className={cn("space-y-6")}>
      {sections}
      <div className="pt-2">{actions}</div>
    </div>
  );
};
