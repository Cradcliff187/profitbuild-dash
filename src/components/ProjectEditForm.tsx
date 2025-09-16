import { useState, useEffect } from "react";
import { Building2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project, ProjectType, ProjectStatus } from "@/types/project";
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
  const [clientName, setClientName] = useState(project.client_name);
  const [address, setAddress] = useState(project.address || "");
  const [projectType, setProjectType] = useState<ProjectType>(project.project_type);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [jobType, setJobType] = useState(project.job_type || "");
  const [startDate, setStartDate] = useState<Date | undefined>(project.start_date);
  const [endDate, setEndDate] = useState<Date | undefined>(project.end_date);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!projectName.trim()) {
      toast({
        title: "Missing Information",
        description: "Project name is required.",
        variant: "destructive"
      });
      return false;
    }

    if (!clientName.trim()) {
      toast({
        title: "Missing Information",
        description: "Client name is required.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const { data: updatedProject, error } = await supabase
        .from('projects')
        .update({
          project_name: projectName.trim(),
          client_name: clientName.trim(),
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
              <Select value={status} onValueChange={(value: ProjectStatus) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobType">Job Type</Label>
              <Input
                id="jobType"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                placeholder="e.g., Residential, Commercial"
              />
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