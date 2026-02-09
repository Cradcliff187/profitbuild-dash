import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectEditForm } from "@/components/ProjectEditForm";
import { Project } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrandedLoader } from "@/components/ui/branded-loader";

export default function ProjectEdit() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error("Project Not Found", { description: "The requested project could not be found." });
          navigate('/projects');
          return;
        }
        throw error;
      }

      const formattedProject: Project = {
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
        start_date: data.start_date ? new Date(data.start_date) : undefined,
        end_date: data.end_date ? new Date(data.end_date) : undefined,
      };

      setProject(formattedProject);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error("Failed to load project data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = (updatedProject: Project) => {
    navigate(`/projects/${updatedProject.id}`);
  };

  const handleCancel = () => {
    navigate(`/projects/${projectId}`);
  };

  if (isLoading) {
    return <BrandedLoader message="Loading project..." />;
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Project Not Found</h3>
        <p className="text-muted-foreground mb-6">The requested project could not be found.</p>
        <Button onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Project</h1>
          <p className="text-muted-foreground">
            {project.project_name} • #{project.project_number}
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <ProjectEditForm
        project={project}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}