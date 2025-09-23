import { useState, useEffect } from "react";
import { Building2, Save, Mail, Phone, MapPin, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project, ProjectType, ProjectStatus, JOB_TYPES, PROJECT_STATUSES } from "@/types/project";
import { Client } from "@/types/client";
import { ClientSelector } from "@/components/ClientSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProjectEditFormProps {
  project: Project;
  onSave: (project: Project) => void;
  onCancel: () => void;
}

export const ProjectEditForm = ({ project, onSave, onCancel }: ProjectEditFormProps) => {
  const { toast } = useToast();
  
  const [projectName, setProjectName] = useState(project.project_name);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedClientData, setSelectedClientData] = useState<Client | null>(null);
  const [address, setAddress] = useState(project.address || "");
  const [projectType, setProjectType] = useState<ProjectType>(project.project_type);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [jobType, setJobType] = useState(project.job_type || "");
  const [startDate, setStartDate] = useState<Date | undefined>(project.start_date);
  const [endDate, setEndDate] = useState<Date | undefined>(project.end_date);
  const [isLoading, setIsLoading] = useState(false);
  const [statusValidationError, setStatusValidationError] = useState<string | null>(null);

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
      toast({
        title: "Missing Information",
        description: "Project name is required.",
        variant: "destructive"
      });
      return false;
    }

    if (!selectedClientId) {
      toast({
        title: "Missing Information",
        description: "Client selection is required.",
        variant: "destructive"
      });
      return false;
    }

    // Validate status change workflow
    if (status === 'approved') {
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
          project_type: projectType,
          status: status as any, // Cast to any to avoid Supabase type conflicts
          job_type: jobType.trim() || null,
          start_date: startDate?.toISOString().split('T')[0] || null,
          end_date: endDate?.toISOString().split('T')[0] || null,
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
      
      toast({
        title: "Project Updated",
        description: `Project "${projectName}" has been updated successfully.`
      });

    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Edit Project
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Number - Read Only */}
          <div className="space-y-2">
            <Label>Project Number</Label>
            <Badge variant="outline" className="text-lg px-4 py-2 font-mono">
              {project.project_number}
            </Badge>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              />
            </div>
          </div>

          {/* Client Details Card */}
          {selectedClientData && (
            <Card className="border-muted">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Client Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-muted-foreground">Client:</span>
                      <p className="font-medium">{selectedClientData.client_name}</p>
                    </div>
                    {selectedClientData.company_name && (
                      <div>
                        <span className="font-medium text-muted-foreground">Company:</span>
                        <p>{selectedClientData.company_name}</p>
                      </div>
                    )}
                    {selectedClientData.contact_person && (
                      <div>
                        <span className="font-medium text-muted-foreground">Contact:</span>
                        <p>{selectedClientData.contact_person}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {selectedClientData.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{selectedClientData.email}</span>
                      </div>
                    )}
                    {selectedClientData.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{selectedClientData.phone}</span>
                      </div>
                    )}
                    {selectedClientData.billing_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                        <span className="text-sm">{selectedClientData.billing_address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Project Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter project address"
              rows={2}
            />
          </div>

          {/* Project Type, Status and Job Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {statusValidationError && (
                <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {statusValidationError}
                  </AlertDescription>
                </Alert>
              )}
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
              <div className="text-xs text-muted-foreground">
                Workflow: Estimating → Quoted → Approved → In Progress → Complete
              </div>
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

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSave} 
              className="flex-1"
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Updating..." : "Update Project"}
            </Button>
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};