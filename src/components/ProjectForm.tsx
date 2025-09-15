import { useState, useEffect } from "react";
import { Building2, Save, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Project, ProjectType, CreateProjectRequest, generateProjectNumber } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProjectFormProps {
  onSave: (project: Project) => void;
  onCancel: () => void;
  onContinueToEstimate?: (project: Project) => void;
  onContinueToExpenses?: (project: Project) => void;
}

export const ProjectForm = ({ onSave, onCancel, onContinueToEstimate, onContinueToExpenses }: ProjectFormProps) => {
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>('construction_project');
  const [projectNumber, setProjectNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Auto-generate project number on form load
    setProjectNumber(generateProjectNumber());
  }, []);

  const handleSave = async () => {
    if (!projectName.trim() || !clientName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in project name and client name.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Use RLS to automatically set company_id  
      const { data: insertedProject, error: insertError } = await supabase
        .from('projects')
        .insert({
          project_name: projectName.trim(),
          client_name: clientName.trim(),
          address: address.trim() || null,
          project_type: projectType,
          project_number: projectNumber,
          status: 'estimating' as const,
          company_id: '00000000-0000-0000-0000-000000000000' // Placeholder, RLS will handle
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
        project_number: insertedProject.project_number,
        status: insertedProject.status as any,
        company_id: insertedProject.company_id,
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

      // Navigate based on project type
      if (projectType === 'construction_project' && onContinueToEstimate) {
        onContinueToEstimate(newProject);
      } else if (projectType === 'work_order' && onContinueToExpenses) {
        onContinueToExpenses(newProject);
      }

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

  const regenerateProjectNumber = () => {
    setProjectNumber(generateProjectNumber());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Project
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Number */}
          <div className="space-y-2">
            <Label>Project Number</Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-lg px-4 py-2 font-mono">
                {projectNumber}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={regenerateProjectNumber}
              >
                Regenerate
              </Button>
            </div>
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
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Project Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter project address"
              rows={3}
            />
          </div>

          {/* Project Type */}
          <div className="space-y-2">
            <Label>Project Type *</Label>
            <Select value={projectType} onValueChange={(value: ProjectType) => setProjectType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="construction_project">
                  <div className="flex flex-col items-start">
                    <span>Construction Project</span>
                    <span className="text-sm text-muted-foreground">Requires estimate creation</span>
                  </div>
                </SelectItem>
                <SelectItem value="work_order">
                  <div className="flex flex-col items-start">
                    <span>Work Order</span>
                    <span className="text-sm text-muted-foreground">Skip estimate, go directly to expenses</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Next Steps Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ArrowRight className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">Next Step:</p>
                  <p className="text-sm text-muted-foreground">
                    {projectType === 'construction_project' 
                      ? "After creating this project, you'll be taken to create an estimate."
                      : "After creating this project, you'll be taken directly to expense tracking."
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
            <Button onClick={onCancel} variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};