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

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const Estimates = () => {
  const { toast } = useToast();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [preselectedProjectId, setPreselectedProjectId] = useState<string | null>(null);

  // Load estimates from Supabase and check URL params
  useEffect(() => {
    loadEstimates();
    
    // Check URL params for preselected project
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    if (projectId) {
      setPreselectedProjectId(projectId);
      setViewMode('create');
    }
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

      // Get line items for all estimates
      const estimateIds = estimatesData?.map(est => est.id) || [];
      const { data: lineItemsData, error: lineItemsError } = await supabase
        .from('estimate_line_items')
        .select('*')
        .in('estimate_id', estimateIds)
        .order('sort_order');

      if (lineItemsError) throw lineItemsError;

      // Then get quotes for each estimate
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('id, estimate_id, total_amount');

      if (quotesError) throw quotesError;

      // Create maps for line items and quotes by estimate_id
      const lineItemsByEstimate = (lineItemsData || []).reduce((acc: any, item: any) => {
        if (!acc[item.estimate_id]) {
          acc[item.estimate_id] = [];
        }
        acc[item.estimate_id].push({
          id: item.id,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          pricePerUnit: item.price_per_unit || item.rate,
          total: item.total,
          unit: item.unit,
          sort_order: item.sort_order,
          costPerUnit: item.cost_per_unit || 0,
          markupPercent: item.markup_percent,
          markupAmount: item.markup_amount,
          totalCost: item.total_cost || (item.quantity * (item.cost_per_unit || 0)),
          totalMarkup: item.total_markup || 0
        });
        return acc;
      }, {});

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
        lineItems: lineItemsByEstimate[est.id] || [],
        created_at: new Date(est.created_at),
        updated_at: new Date(est.updated_at),
        project_name: est.projects?.project_name,
        client_name: est.projects?.client_name,
        quotes: quotesByEstimate[est.id] || [],
        defaultMarkupPercent: 15,
        targetMarginPercent: 20
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
    setPreselectedProjectId(null);
    // Clear URL params
    window.history.replaceState({}, document.title, window.location.pathname);
    loadEstimates(); // Refresh the list
  };

  const handleCreateNew = () => {
    setSelectedEstimate(null);
    setPreselectedProjectId(null);
    setViewMode('create');
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
    setPreselectedProjectId(null);
    // Clear URL params
    window.history.replaceState({}, document.title, window.location.pathname);
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
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
        />
      )}

      {viewMode === 'create' && (
        <EstimateForm
          preselectedProjectId={preselectedProjectId}
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
    </div>
  );
};

export default Estimates;