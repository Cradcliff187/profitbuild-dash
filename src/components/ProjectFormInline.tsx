import { useState, useEffect } from "react";
import { Building2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredLabel } from "@/components/ui/required-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Project, ProjectType, generateProjectNumber } from "@/types/project";
import { Client } from "@/types/client";
import { ClientSelector } from "@/components/ClientSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ProjectFormInlineProps {
  onSave: (project: Project) => void;
  onCancel: () => void;
}

export const ProjectFormInline = ({ onSave, onCancel }: ProjectFormInlineProps) => {
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedClientData, setSelectedClientData] = useState<Client | null>(null);
  const [projectType, setProjectType] = useState<ProjectType>('construction_project');
  const [projectNumber, setProjectNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Validation states
  const [clientError, setClientError] = useState("");
  const [projectNameError, setProjectNameError] = useState("");
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    const initProjectNumber = async () => {
      const number = await generateProjectNumber();
      setProjectNumber(number);
    };
    initProjectNumber();
  }, []);

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
    }
  };

  const handleClientChange = (clientId: string, clientName?: string) => {
    setSelectedClientId(clientId);
    if (clientId) {
      fetchClientData(clientId);
    } else {
      setSelectedClientData(null);
    }
  };

  const validateClient = () => {
    if (!selectedClientId) {
      return "Please select a client";
    }
    return "";
  };

  const validateProjectName = () => {
    if (!projectName.trim()) {
      return "Project name is required";
    }
    if (projectName.trim().length < 3) {
      return "Project name must be at least 3 characters";
    }
    return "";
  };

  const validateAllFields = () => {
    const clientErr = validateClient();
    const nameErr = validateProjectName();
    
    setClientError(clientErr);
    setProjectNameError(nameErr);
    
    return !clientErr && !nameErr;
  };

  const handleSave = async () => {
    setHasValidated(true);
    
    if (!validateAllFields()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const { data: insertedProject, error: insertError } = await supabase
        .from('projects')
        .insert({
          project_name: projectName.trim(),
          client_id: selectedClientId,
          client_name: selectedClientData?.client_name || '',
          project_type: projectType,
          project_number: projectNumber,
          status: 'estimating',
          minimum_margin_threshold: 10.0,
          target_margin: 20.0,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newProject: Project = {
        id: insertedProject.id,
        project_name: insertedProject.project_name,
        client_name: insertedProject.client_name,
        address: insertedProject.address,
        project_type: insertedProject.project_type,
        job_type: insertedProject.job_type,
        qb_formatted_number: insertedProject.qb_formatted_number,
        project_number: insertedProject.project_number,
        status: insertedProject.status as any,
        quickbooks_job_id: insertedProject.quickbooks_job_id,
        created_at: new Date(insertedProject.created_at),
        updated_at: new Date(insertedProject.updated_at),
        start_date: insertedProject.start_date ? new Date(insertedProject.start_date) : undefined,
        end_date: insertedProject.end_date ? new Date(insertedProject.end_date) : undefined,
      };

      onSave(newProject);

      toast({
        title: "Project Created",
        description: `Project ${projectNumber} has been created successfully.`
      });

    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectName(e.target.value);
    if (hasValidated) {
      setProjectNameError(validateProjectName());
    }
  };

  const handleClientBlur = () => {
    if (hasValidated) {
      setClientError(validateClient());
    }
  };

  const handleProjectNameBlur = () => {
    if (hasValidated) {
      setProjectNameError(validateProjectName());
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Project
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <RequiredLabel htmlFor="projectName">Project Name</RequiredLabel>
            <Input
              id="projectName"
              value={projectName}
              onChange={handleProjectNameChange}
              onBlur={handleProjectNameBlur}
              placeholder="Enter project name"
              className={cn(projectNameError && "border-destructive")}
            />
            {projectNameError && (
              <p className="text-sm font-medium text-destructive">{projectNameError}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <RequiredLabel>Client</RequiredLabel>
            <ClientSelector
              value={selectedClientId}
              onValueChange={handleClientChange}
              onBlur={handleClientBlur}
              placeholder="Select a client"
              required={true}
              error={clientError}
              showLabel={false}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Project Number</Label>
            <Input
              value={projectNumber}
              readOnly
              className="bg-muted font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label>Project Type</Label>
            <Select value={projectType} onValueChange={(value: ProjectType) => setProjectType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="construction_project">Construction Project</SelectItem>
                <SelectItem value="work_order">Work Order</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>Creating...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Project
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};