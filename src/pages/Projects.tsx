import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { ProjectFormSimple } from "@/components/ProjectFormSimple";
import { ProjectsList } from "@/components/ProjectsList";
import { ProjectsTableView } from "@/components/ProjectsTableView";
import { ProjectFilters, ProjectSearchFilters } from "@/components/ProjectFilters";
import { ProjectExportModal } from "@/components/ProjectExportModal";
import { ProjectBulkActions } from "@/components/ProjectBulkActions";
import { Project, ProjectStatus, PROJECT_STATUSES } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Quote } from "@/types/quote";
import { Expense } from "@/types/expense";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProjectWithFinancials, calculateMultipleProjectFinancials } from "@/utils/projectFinancials";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { parseDateOnly } from "@/utils/dateUtils";
import { usePagination } from "@/hooks/usePagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ViewMode = 'list' | 'create';

const Projects = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<ProjectWithFinancials[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; client_name: string; }>>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filters, setFilters] = useState<ProjectSearchFilters>({
    searchText: "",
    status: [],
    jobType: [],
    clientName: [],
    dateRange: { start: null, end: null },
    budgetRange: { min: null, max: null },
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [pageSize, setPageSize] = useState(25);

  // Apply URL parameters to filters on mount
  useEffect(() => {
    const statusParam = searchParams.get('status');
    
    if (statusParam) {
      setFilters(prev => ({
        ...prev,
        status: [statusParam as ProjectStatus]
      }));
    }
  }, [searchParams]);

  // Load projects and clients from Supabase
  useEffect(() => {
    loadProjects();
    loadClients();
  }, []);

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

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      
      // Load all related data (exclude unassigned project and work orders)
      const [projectsRes, estimatesRes, quotesRes, expensesRes, changeOrdersRes] = await Promise.all([
        supabase.from('projects').select('*').eq('category', 'construction').or('project_type.eq.construction_project,project_type.is.null').order('created_at', { ascending: false }),
        supabase.from('estimates').select('*'),
        supabase.from('quotes').select('*'),
        supabase.from('expenses').select(`
          *,
          projects (project_number)
        `),
        supabase.from('change_orders').select('project_id, client_amount, cost_impact, status').eq('status', 'approved')
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (estimatesRes.error) throw estimatesRes.error;
      if (quotesRes.error) throw quotesRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (changeOrdersRes.error) throw changeOrdersRes.error;

      const formattedProjects = projectsRes.data?.map((project: any) => {
        // Calculate change order aggregates for this project
        const projectChangeOrders = (changeOrdersRes.data || []).filter(co => co.project_id === project.id);
        const changeOrderCount = projectChangeOrders.length;
        const changeOrderRevenue = projectChangeOrders.reduce((sum, co) => sum + (co.client_amount || 0), 0);
        const changeOrderCosts = projectChangeOrders.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
        
        // Get original contract amount (estimate total before change orders)
        const approvedEstimate = estimatesRes.data?.find(e => 
          e.project_id === project.id && e.status === 'approved'
        );
        const originalContractAmount = approvedEstimate?.total_amount || 0;

        return {
          ...project, // Keep all database fields including calculated financials
          start_date: project.start_date ? new Date(project.start_date) : undefined,
          end_date: project.end_date ? new Date(project.end_date) : undefined,
          created_at: new Date(project.created_at),
          updated_at: new Date(project.updated_at),
          
          // Map database fields to ProjectWithFinancials interface
          originalContractAmount,
          changeOrderRevenue,
          changeOrderCount,
          changeOrderCosts,
          changeOrderNetMargin: changeOrderRevenue - changeOrderCosts,
          originalEstimatedCosts: project.original_est_costs || 0,
          adjustedEstCosts: project.adjusted_est_costs || 0,
          costVariance: (project.adjusted_est_costs || 0) - (project.original_est_costs || 0),
        };
      }) || [];

      const formattedEstimates = estimatesRes.data?.map((estimate: any) => ({
        id: estimate.id,
        project_id: estimate.project_id,
        estimate_number: estimate.estimate_number,
        revision_number: estimate.revision_number,
        date_created: new Date(estimate.date_created),
        valid_until: estimate.valid_until ? new Date(estimate.valid_until) : undefined,
        status: estimate.status,
        total_amount: estimate.total_amount,
        notes: estimate.notes,
        created_by: estimate.created_by,
        contingency_percent: estimate.contingency_percent ?? 10.0,
        contingency_amount: estimate.contingency_amount,
        contingency_used: estimate.contingency_used || 0,
        version_number: estimate.version_number || 1,
        parent_estimate_id: estimate.parent_estimate_id || undefined,
        is_current_version: estimate.is_current_version ?? true,
        valid_for_days: estimate.valid_for_days || 30,
        created_at: new Date(estimate.created_at),
        updated_at: new Date(estimate.updated_at),
        project_name: formattedProjects.find(p => p.id === estimate.project_id)?.project_name,
        client_name: formattedProjects.find(p => p.id === estimate.project_id)?.client_name,
        lineItems: [], // Add empty array for required property
        defaultMarkupPercent: 25,
        targetMarginPercent: 20
      })) || [];

      const formattedQuotes = quotesRes.data?.map((quote: any) => ({
        id: quote.id,
        project_id: quote.project_id,
        estimate_id: quote.estimate_id,
        payee_id: quote.payee_id,
        quoteNumber: quote.quote_number, // Map to correct property name
        total: quote.total_amount,
        date_received: new Date(quote.date_received),
        date_expires: quote.date_expires ? new Date(quote.date_expires) : undefined,
        status: quote.status,
        notes: quote.notes,
        attachment_url: quote.attachment_url,
        created_at: new Date(quote.created_at),
        updated_at: new Date(quote.updated_at),
        // Add required properties from Quote interface
        projectName: formattedProjects.find(p => p.id === quote.project_id)?.project_name || '',
        client: formattedProjects.find(p => p.id === quote.project_id)?.client_name || '',
        quotedBy: 'Unknown', // Default value
        dateReceived: new Date(quote.date_received),
        includes_materials: quote.includes_materials ?? true,
        includes_labor: quote.includes_labor ?? true,
        lineItems: [], // Empty array for line items
        subtotals: {
          labor: 0,
          subcontractors: 0,
          materials: 0,
          equipment: 0,
          other: 0
        },
        createdAt: new Date(quote.created_at)
      })) || [];

      const formattedExpenses = expensesRes.data?.map((expense: any) => ({
        id: expense.id,
        project_id: expense.project_id,
        project_number: expense.projects?.project_number,
        payee_id: expense.payee_id,
        amount: expense.amount,
        description: expense.description,
        expense_date: parseDateOnly(expense.expense_date),
        category: expense.category,
        transaction_type: expense.transaction_type,
        invoice_number: expense.invoice_number,
        account_name: expense.account_name,
        account_full_name: expense.account_full_name,
        is_planned: expense.is_planned,
        is_split: expense.is_split,
        attachment_url: expense.attachment_url,
        quickbooks_transaction_id: expense.quickbooks_transaction_id,
        created_at: new Date(expense.created_at),
        updated_at: new Date(expense.updated_at)
      })) || [];

      // Filter out all split parent expenses (defensive)
      const displayableExpenses = formattedExpenses.filter(expense => {
        const isSplitParent = expense.is_split === true;
        return !isSplitParent;
      });

      // Enrich projects with line item counts (estimate + change order line items)
      const enrichedProjects = await calculateMultipleProjectFinancials(
        formattedProjects as any[],
        formattedEstimates,
        displayableExpenses
      );

      setProjects(enrichedProjects);
      setEstimates(formattedEstimates);
      setQuotes(formattedQuotes);
      setExpenses(displayableExpenses);
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

  const handleSaveProject = async (project: Project) => {
    // Creating new project - editing is now handled by dedicated edit page
    setProjects(prev => [project as ProjectWithFinancials, ...prev]);
    setViewMode('list');
    loadProjects(); // Refresh the list to get DB-calculated financials
  };

  const handleCreateNew = () => {
    setViewMode('create');
  };

  const handleEdit = (project: Project) => {
    // Navigate to the dedicated edit page
    window.location.href = `/projects/${project.id}/edit`;
  };

  const handleDelete = async (projectId: string) => {
    try {
      console.log('Deleting project:', projectId);
      
      // Use the secure RPC function for atomic deletion
      const { error } = await supabase.rpc('delete_project_cascade', {
        p_project_id: projectId
      });

      if (error) {
        console.error('Error deleting project:', error);
        throw error;
      }

      // Update local state
      setProjects(prevProjects => 
        prevProjects.filter(p => p.id !== projectId)
      );

      toast({
        title: "Success",
        description: "Project and all related data deleted successfully",
      });
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedProjects.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    }
  };

  const handleBulkStatusUpdate = async (status: ProjectStatus) => {
    if (selectedIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status })
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedIds.length} ${selectedIds.length === 1 ? 'project' : 'projects'} updated to ${PROJECT_STATUSES.find(s => s.value === status)?.label || status}`,
      });

      setSelectedIds([]);
      loadProjects();
    } catch (error: any) {
      console.error('Error updating project status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update project status",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      // Use the secure RPC function for atomic deletion
      for (const projectId of selectedIds) {
        const { error } = await supabase.rpc('delete_project_cascade', {
          p_project_id: projectId
        });
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `${selectedIds.length} ${selectedIds.length === 1 ? 'project' : 'projects'} deleted successfully`,
      });

      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);
      loadProjects();
    } catch (error: any) {
      console.error('Error deleting projects:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete projects",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setViewMode('list');
  };

  // Filter and sort projects based on search criteria
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesSearch = 
          project.project_name.toLowerCase().includes(searchLower) ||
          project.client_name.toLowerCase().includes(searchLower) ||
          (project.address && project.address.toLowerCase().includes(searchLower)) ||
          project.project_number.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(project.status)) {
        return false;
      }

      // Job type filter
      if (filters.jobType.length > 0 && !filters.jobType.includes(project.job_type || '')) {
        return false;
      }

      // Client name filter
      if (filters.clientName.length > 0) {
        const matchesClient = filters.clientName.some(client =>
          project.client_name.toLowerCase().includes(client.toLowerCase())
        );
        if (!matchesClient) return false;
      }

      // Date range filter
      if (filters.dateRange.start && project.start_date) {
        if (project.start_date < filters.dateRange.start) return false;
      }
      if (filters.dateRange.end && project.start_date) {
        if (project.start_date > filters.dateRange.end) return false;
      }

      // Budget range filter
      if (filters.budgetRange.min !== null && project.contracted_amount) {
        if (project.contracted_amount < filters.budgetRange.min) return false;
      }
      if (filters.budgetRange.max !== null && project.contracted_amount) {
        if (project.contracted_amount > filters.budgetRange.max) return false;
      }

      return true;
    });

    // Sort the filtered projects
    const sorted = [...filtered].sort((a, b) => {
      const modifier = filters.sortOrder === 'asc' ? 1 : -1;
      
      switch (filters.sortBy) {
        case 'name':
          return a.project_name.localeCompare(b.project_name) * modifier;
        case 'date':
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * modifier;
        case 'status':
          return a.status.localeCompare(b.status) * modifier;
        case 'margin':
          const aMarginPct = a.margin_percentage ?? -999;
          const bMarginPct = b.margin_percentage ?? -999;
          return (aMarginPct - bMarginPct) * modifier;
        default:
          return 0;
      }
    });

    return sorted;
  }, [projects, filters]);

  // Pagination
  const pagination = usePagination({
    totalItems: filteredAndSortedProjects.length,
    pageSize,
    initialPage: 1,
  });

  // Get paginated projects
  const paginatedProjects = useMemo(() => {
    const start = pagination.startIndex;
    const end = pagination.endIndex;
    return filteredAndSortedProjects.slice(start, end);
  }, [filteredAndSortedProjects, pagination.startIndex, pagination.endIndex]);

  return (
    <MobilePageWrapper onRefresh={loadProjects} enablePullToRefresh>
      <PageHeader
        icon={Building2}
        title="Projects"
        description="Manage construction projects and track financials"
        actions={
          viewMode === 'list' ? (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowExportModal(true)}
                className="hidden sm:flex"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleCreateNew} size="sm" className="hidden sm:flex">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </>
          ) : undefined
        }
      />


      {viewMode === 'list' && (
        <>
          {isLoading ? (
            <BrandedLoader message="Loading projects..." />
          ) : (
            <div className="space-y-2">
              {/* Project Filters */}
              <ProjectFilters
                filters={filters}
                onFiltersChange={setFilters}
                resultCount={filteredAndSortedProjects.length}
                clients={clients}
              />

              {/* Bulk Actions */}
              <ProjectBulkActions
                selectedCount={selectedIds.length}
                onStatusUpdate={(status) => handleBulkStatusUpdate(status)}
                onDelete={() => setBulkDeleteDialogOpen(true)}
                onCancel={() => setSelectedIds([])}
              />

              {/* Display Projects */}
              {isMobile ? (
                <ProjectsList
                  projects={filteredAndSortedProjects}
                  estimates={estimates}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCreateNew={handleCreateNew}
                  onRefresh={loadProjects}
                />
              ) : (
                <ProjectsTableView
                  projects={paginatedProjects}
                  estimates={estimates}
                  onEdit={handleEdit}
                  onView={handleEdit}
                  onDelete={handleDelete}
                  onCreateNew={handleCreateNew}
                  isLoading={isLoading}
                  selectedIds={selectedIds}
                  onSelectAll={handleSelectAll}
                  onSelectOne={handleSelectOne}
                  totalCount={filteredAndSortedProjects.length}
                  pageSize={pageSize}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    pagination.goToPage(1);
                  }}
                  currentPage={pagination.currentPage}
                  totalPages={Math.ceil(filteredAndSortedProjects.length / pageSize)}
                  onPageChange={pagination.goToPage}
                />
              )}
              
              {/* Mobile FAB */}
              {isMobile && (
                <Button
                  variant="default"
                  onClick={handleCreateNew}
                  size="icon"
                  className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
                >
                  <Plus className="h-6 w-6 !text-white" />
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {viewMode === 'create' && (
        <ProjectFormSimple
          onSave={handleSaveProject}
          onCancel={handleCancel}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Projects</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} {selectedIds.length === 1 ? 'project' : 'projects'}? 
              This action cannot be undone and will also delete all associated estimates, expenses, and change orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProjectExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        filters={filters}
      />
    </MobilePageWrapper>
  );
};

export default Projects;