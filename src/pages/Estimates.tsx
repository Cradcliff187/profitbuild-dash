import { useState, useEffect } from "react";
import { Calculator } from "lucide-react";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectEstimateForm } from "@/components/ProjectEstimateForm";
import { EstimateForm } from "@/components/EstimateForm";
import { EstimatesList } from "@/components/EstimatesList";
import { Estimate } from "@/types/estimate";
import { Project } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = 'list' | 'create-project' | 'create-estimate' | 'create-unified' | 'edit' | 'view';

const Estimates = () => {
  const { toast } = useToast();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Load estimates from Supabase
  useEffect(() => {
    loadEstimates();
  }, []);

  const loadEstimates = async () => {
    try {
      // First get estimates with project data
      const { data: estimatesData, error: estimatesError } = await supabase
        .from('estimates')
        .select(`
          *,
          projects (
            project_name,
            client_name
          )
        `)
        .order('created_at', { ascending: false });

      if (estimatesError) throw estimatesError;

      // Then get quotes for each estimate
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('id, estimate_id, total_amount');

      if (quotesError) throw quotesError;

      // Create a map of quotes by estimate_id
      const quotesByEstimate = (quotesData || []).reduce((acc: any, quote: any) => {
        if (!acc[quote.estimate_id]) {
          acc[quote.estimate_id] = [];
        }
        acc[quote.estimate_id].push(quote);
        return acc;
      }, {});

      const formattedEstimates = estimatesData?.map((est: any) => ({
        id: est.id,
        project_id: est.project_id,
        estimate_number: est.estimate_number,
        date_created: new Date(est.date_created),
        total_amount: est.total_amount,
        status: est.status,
        notes: est.notes,
        valid_until: est.valid_until ? new Date(est.valid_until) : undefined,
        revision_number: est.revision_number,
        contingency_percent: est.contingency_percent || 10.0,
        contingency_amount: est.contingency_amount,
        contingency_used: est.contingency_used || 0,
        version_number: est.version_number || 1,
        parent_estimate_id: est.parent_estimate_id || undefined,
        is_current_version: est.is_current_version ?? true,
        valid_for_days: est.valid_for_days || 30,
        lineItems: [], // Will be loaded separately when needed
        created_at: new Date(est.created_at),
        updated_at: new Date(est.updated_at),
        project_name: est.projects?.project_name,
        client_name: est.projects?.client_name,
        quotes: quotesByEstimate[est.id] || []
      })) || [];

      setEstimates(formattedEstimates);
    } catch (error) {
      console.error('Error loading estimates:', error);
      toast({
        title: "Error",
        description: "Failed to load estimates.",
        variant: "destructive"
      });
    }
  };

  const handleSaveProject = (project: Project) => {
    setCurrentProject(project);
    // Projects are saved in ProjectForm component
  };

  const handleSaveEstimate = (estimate: Estimate) => {
    if (selectedEstimate) {
      // Editing existing estimate
      setEstimates(prev => prev.map(e => e.id === estimate.id ? estimate : e));
    } else {
      // Creating new estimate
      setEstimates(prev => [...prev, estimate]);
    }
    setViewMode('list');
    setSelectedEstimate(null);
    setCurrentProject(null);
    loadEstimates(); // Refresh the list
  };

  const handleCreateNew = () => {
    setSelectedEstimate(null);
    setCurrentProject(null);
    setViewMode('create-unified');
  };

  const handleCreateWithProject = () => {
    setSelectedEstimate(null);
    setCurrentProject(null);
    setViewMode('create-project');
  };

  const handleContinueToEstimate = (project: Project) => {
    setCurrentProject(project);
    setViewMode('create-estimate');
  };

  const handleContinueToExpenses = (project: Project) => {
    // Navigate to expenses page with project context
    toast({
      title: "Project Created",
      description: `Work order ${project.project_number} created. You can now track expenses.`
    });
    setViewMode('list');
    setCurrentProject(null);
  };

  const handleEdit = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setViewMode('edit');
  };

  const handleView = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setViewMode('view');
  };

  const handleDelete = (id: string) => {
    setEstimates(prev => prev.filter(e => e.id !== id));
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedEstimate(null);
    setCurrentProject(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <Calculator className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Estimates</h1>
          <p className="text-muted-foreground">Create and manage project estimates</p>
        </div>
      </div>

      {viewMode === 'list' && (
        <EstimatesList
          estimates={estimates}
          onCreateNew={handleCreateNew}
          onCreateWithProject={handleCreateWithProject}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
        />
      )}

      {viewMode === 'create-unified' && (
        <EstimateForm
          onSave={handleSaveEstimate}
          onCancel={handleCancel}
        />
      )}

      {viewMode === 'edit' && selectedEstimate && (
        <EstimateForm
          initialEstimate={selectedEstimate}
          onSave={handleSaveEstimate}
          onCancel={handleCancel}
        />
      )}

      {viewMode === 'create-project' && (
        <ProjectForm
          onSave={handleSaveProject}
          onCancel={handleCancel}
          onContinueToEstimate={handleContinueToEstimate}
          onContinueToExpenses={handleContinueToExpenses}
        />
      )}

      {viewMode === 'create-estimate' && currentProject && (
        <ProjectEstimateForm
          project={currentProject}
          onSave={handleSaveEstimate}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default Estimates;