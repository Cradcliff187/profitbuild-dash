import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EstimatesList } from "@/components/EstimatesList";
import { EstimateForm } from "@/components/EstimateForm";
import { EstimateSearchFilters, type SearchFilters } from "@/components/EstimateSearchFilters";
import { EstimateExportModal } from "@/components/EstimateExportModal";
import { EstimateFamilyAnalyticsDashboard } from "@/components/EstimateFamilyAnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Estimate } from "@/types/estimate";
import { Plus, BarChart3, Download } from "lucide-react";

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const EstimatesPage = () => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [filteredEstimates, setFilteredEstimates] = useState<Estimate[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<Array<{ id: string; client_name: string; }>>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    searchText: '',
    status: [],
    projectType: '',
    clientName: '',
    dateRange: { start: null, end: null },
    amountRange: { min: null, max: null },
    hasVersions: null
  });

  // Get preselected project ID from URL params
  const preselectedProjectId = searchParams.get('projectId');

  useEffect(() => {
    loadEstimates();
    loadClients();
    
    // Check for preselected project from URL params
    if (preselectedProjectId && viewMode === 'list') {
      setViewMode('create');
    }
  }, [preselectedProjectId]);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, client_name')
      .eq('is_active', true)
      .order('client_name', { ascending: true });
    
    if (error) {
      console.error('Error loading clients:', error);
      return;
    }
    
    setClients(data || []);
  };

  // Apply filters when estimates or filters change
  useEffect(() => {
    applyFilters();
  }, [estimates, searchFilters]);

  const applyFilters = () => {
    let filtered = [...estimates];

    // Text search
    if (searchFilters.searchText) {
      const searchText = searchFilters.searchText.toLowerCase();
      filtered = filtered.filter(estimate => 
        estimate.estimate_number.toLowerCase().includes(searchText) ||
        estimate.project_name?.toLowerCase().includes(searchText) ||
        estimate.client_name?.toLowerCase().includes(searchText) ||
        estimate.notes?.toLowerCase().includes(searchText)
      );
    }

    // Status filter
    if (searchFilters.status.length > 0) {
      filtered = filtered.filter(estimate => 
        searchFilters.status.includes(estimate.status)
      );
    }

    // Client name filter
    if (searchFilters.clientName) {
      const clientName = searchFilters.clientName.toLowerCase();
      filtered = filtered.filter(estimate => 
        estimate.client_name?.toLowerCase().includes(clientName)
      );
    }

    // Date range filter
    if (searchFilters.dateRange.start) {
      filtered = filtered.filter(estimate => 
        new Date(estimate.date_created) >= searchFilters.dateRange.start!
      );
    }
    if (searchFilters.dateRange.end) {
      filtered = filtered.filter(estimate => 
        new Date(estimate.date_created) <= searchFilters.dateRange.end!
      );
    }

    // Amount range filter
    if (searchFilters.amountRange.min !== null) {
      filtered = filtered.filter(estimate => 
        estimate.total_amount >= searchFilters.amountRange.min!
      );
    }
    if (searchFilters.amountRange.max !== null) {
      filtered = filtered.filter(estimate => 
        estimate.total_amount <= searchFilters.amountRange.max!
      );
    }

    // Has versions filter
    if (searchFilters.hasVersions !== null) {
      const estimatesByFamily = new Map<string, number>();
      estimates.forEach(estimate => {
        const familyId = estimate.parent_estimate_id || estimate.id;
        estimatesByFamily.set(familyId, (estimatesByFamily.get(familyId) || 0) + 1);
      });

      filtered = filtered.filter(estimate => {
        const familyId = estimate.parent_estimate_id || estimate.id;
        const versionCount = estimatesByFamily.get(familyId) || 1;
        return searchFilters.hasVersions ? versionCount > 1 : versionCount === 1;
      });
    }

    setFilteredEstimates(filtered);
  };

  const handleSearch = () => {
    applyFilters();
  };

  const resetFilters = () => {
    setSearchFilters({
      searchText: '',
      status: [],
      projectType: '',
      clientName: '',
      dateRange: { start: null, end: null },
      amountRange: { min: null, max: null },
      hasVersions: null
    });
  };

  const loadEstimates = async () => {
    try {
      setLoading(true);
      
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
        .select('id, estimate_id, total_amount, status');

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
        targetMarginPercent: 20,
        is_draft: false
      })) || [];

      setEstimates(formattedEstimates);
    } catch (error) {
      console.error('Error loading estimates:', error);
      toast({
        title: "Error",
        description: "Failed to load estimates.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
    setSelectedEstimate(undefined);
    // Clear URL params
    setSearchParams({});
    loadEstimates(); // Refresh the list
  };

  const handleCreateNew = () => {
    setSelectedEstimate(undefined);
    setViewMode('create');
  };

  // Context-aware button logic
  const getCreateButtonText = () => {
    if (estimates.length === 0) return "Create First Estimate";
    if (preselectedProjectId) return "Create New Version";
    return "Create New Estimate";
  };

  const handleEdit = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setViewMode('edit');
  };

  const handleView = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setViewMode('view');
  };

  const handleDelete = async (id: string) => {
    try {
      // Delete estimate line items first
      const { error: lineItemsError } = await supabase
        .from('estimate_line_items')
        .delete()
        .eq('estimate_id', id);
      
      if (lineItemsError) throw lineItemsError;

      // Delete quotes related to this estimate
      const { error: quotesError } = await supabase
        .from('quotes')
        .delete()
        .eq('estimate_id', id);
      
      if (quotesError) throw quotesError;

      // Finally delete the estimate
      const { error: estimateError } = await supabase
        .from('estimates')
        .delete()
        .eq('id', id);
      
      if (estimateError) throw estimateError;

      // Remove from local state
      setEstimates(prev => prev.filter(e => e.id !== id));
      
      toast({
        title: "Estimate Deleted",
        description: "The estimate and all related data have been successfully deleted."
      });
    } catch (error) {
      console.error('Error deleting estimate:', error);
      toast({
        title: "Error",
        description: "Failed to delete estimate. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedEstimate(undefined);
    // Clear URL params
    setSearchParams({});
  };

  if (loading) {
    return (
      <LoadingSpinner 
        variant="spinner" 
        size="full" 
        message="Loading estimates..." 
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Estimates</h1>
          <p className="text-muted-foreground">
            Manage project estimates, versions, and approvals
          </p>
        </div>
        
        {viewMode === 'list' && (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowExportModal(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleCreateNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {getCreateButtonText()}
            </Button>
          </div>
        )}
      </div>

      {viewMode === 'list' ? (
        <Tabs defaultValue="estimates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="estimates">Estimates</TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="estimates" className="space-y-4">
            <EstimateSearchFilters
              filters={searchFilters}
              onFiltersChange={setSearchFilters}
              onSearch={handleSearch}
              onReset={resetFilters}
              resultCount={filteredEstimates.length}
              clients={clients}
            />
            <EstimatesList
              estimates={filteredEstimates}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              onCreateNew={handleCreateNew}
            />
          </TabsContent>
          
          <TabsContent value="analytics">
            <EstimateFamilyAnalyticsDashboard />
          </TabsContent>
        </Tabs>
      ) : (
        <EstimateForm
          initialEstimate={selectedEstimate}
          preselectedProjectId={preselectedProjectId}
          onSave={handleSaveEstimate}
          onCancel={handleCancel}
        />
      )}

      <EstimateExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        filters={searchFilters}
      />
    </div>
  );
};

export default EstimatesPage;