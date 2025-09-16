import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectEditForm } from "@/components/ProjectEditForm";
import { ProjectsList } from "@/components/ProjectsList";
import { Project } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = 'list' | 'create' | 'edit';

const Projects = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load projects from Supabase
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedProjects = projectsData?.map((project: any) => ({
        id: project.id,
        project_name: project.project_name,
        project_number: project.project_number,
        qb_formatted_number: project.qb_formatted_number,
        client_name: project.client_name,
        address: project.address,
        project_type: project.project_type,
        job_type: project.job_type,
        status: project.status,
        start_date: project.start_date ? new Date(project.start_date) : undefined,
        end_date: project.end_date ? new Date(project.end_date) : undefined,
        company_id: project.company_id,
        quickbooks_job_id: project.quickbooks_job_id,
        sync_status: project.sync_status,
        last_synced_at: project.last_synced_at,
        created_at: new Date(project.created_at),
        updated_at: new Date(project.updated_at)
      })) || [];

      setProjects(formattedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProject = (project: Project) => {
    if (selectedProject) {
      // Editing existing project
      setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    } else {
      // Creating new project
      setProjects(prev => [project, ...prev]);
    }
    setViewMode('list');
    setSelectedProject(null);
    loadProjects(); // Refresh the list
  };

  const handleCreateNew = () => {
    setSelectedProject(null);
    setViewMode('create');
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setViewMode('edit');
  };

  const handleDelete = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedProject(null);
  };

  const handleContinueToEstimate = (project: Project) => {
    // Navigate to estimates page
    toast({
      title: "Project Created",
      description: `Project ${project.project_number} created. You can now create estimates.`
    });
    setViewMode('list');
    setSelectedProject(null);
  };

  const handleContinueToExpenses = (project: Project) => {
    // Navigate to expenses page
    toast({
      title: "Project Created",
      description: `Work order ${project.project_number} created. You can now track expenses.`
    });
    setViewMode('list');
    setSelectedProject(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">
            {viewMode === 'create' ? 'Create a new project' : 
             viewMode === 'edit' ? 'Edit project details' : 
             'Manage your construction projects and work orders'}
          </p>
        </div>
      </div>

      {viewMode === 'list' && (
        <ProjectsList
          projects={projects}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateNew={handleCreateNew}
          onRefresh={loadProjects}
        />
      )}

      {viewMode === 'create' && (
        <ProjectForm
          onSave={handleSaveProject}
          onCancel={handleCancel}
          onContinueToEstimate={handleContinueToEstimate}
          onContinueToExpenses={handleContinueToExpenses}
        />
      )}

      {viewMode === 'edit' && selectedProject && (
        <ProjectEditForm
          project={selectedProject}
          onSave={handleSaveProject}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default Projects;