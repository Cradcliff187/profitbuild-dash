import { useState, useEffect, useMemo } from "react";
import { Building2, Table, Grid, Plus, ArrowUpAZ, ArrowDownZA } from "lucide-react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ProjectFormSimple } from "@/components/ProjectFormSimple";
import { ProjectsList } from "@/components/ProjectsList";
import { ProjectsTableView } from "@/components/ProjectsTableView";
import { ProjectFilters, ProjectSearchFilters } from "@/components/ProjectFilters";
import { Project, ProjectStatus } from "@/types/project";
import { Estimate } from "@/types/estimate";
import { Quote } from "@/types/quote";
import { Expense } from "@/types/expense";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateMultipleProjectFinancials, ProjectWithFinancials } from "@/utils/projectFinancials";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type ViewMode = 'list' | 'create';
type DisplayMode = 'cards' | 'table';

const Projects = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [projects, setProjects] = useState<ProjectWithFinancials[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; client_name: string; }>>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(isMobile ? 'cards' : 'table');
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
      
      // Load all related data (exclude unassigned project)
      const [projectsRes, estimatesRes, quotesRes, expensesRes] = await Promise.all([
        supabase.from('projects').select('*').neq('project_number', 'SYS-000').neq('project_number', '000-UNASSIGNED').order('created_at', { ascending: false }),
        supabase.from('estimates').select('*'),
        supabase.from('quotes').select('*'),
        supabase.from('expenses').select('*')
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (estimatesRes.error) throw estimatesRes.error;
      if (quotesRes.error) throw quotesRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const formattedProjects = projectsRes.data?.map((project: any) => ({
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
        contracted_amount: project.contracted_amount,
        total_accepted_quotes: project.total_accepted_quotes,
        current_margin: project.current_margin,
        margin_percentage: project.margin_percentage,
        contingency_remaining: project.contingency_remaining,
        payment_terms: project.payment_terms,
        minimum_margin_threshold: project.minimum_margin_threshold,
        target_margin: project.target_margin,
        adjusted_est_costs: project.adjusted_est_costs,
        original_est_costs: project.original_est_costs,
        created_at: new Date(project.created_at),
        updated_at: new Date(project.updated_at)
      })) || [];

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
        payee_id: expense.payee_id,
        amount: expense.amount,
        description: expense.description,
        expense_date: new Date(expense.expense_date),
        category: expense.category,
        transaction_type: expense.transaction_type,
        invoice_number: expense.invoice_number,
        account_name: expense.account_name,
        account_full_name: expense.account_full_name,
        is_planned: expense.is_planned,
        attachment_url: expense.attachment_url,
        quickbooks_transaction_id: expense.quickbooks_transaction_id,
        created_at: new Date(expense.created_at),
        updated_at: new Date(expense.updated_at)
      })) || [];

      // Calculate financial data for all projects
      const projectsWithFinancials = await calculateMultipleProjectFinancials(
        formattedProjects,
        formattedEstimates,
        formattedExpenses
      );

      setProjects(projectsWithFinancials);
      setEstimates(formattedEstimates);
      setQuotes(formattedQuotes);
      setExpenses(formattedExpenses);
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
    // Calculate financial data for the saved project
    const projectWithFinancials = await calculateMultipleProjectFinancials(
      [project],
      estimates,
      expenses
    );
    
    // Creating new project - editing is now handled by dedicated edit page
    setProjects(prev => [projectWithFinancials[0], ...prev]);
    setViewMode('list');
    loadProjects(); // Refresh the list
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

  const handleCancel = () => {
    setViewMode('list');
  };

  // Helper function to check if project is at risk
  const isProjectAtRisk = (marginPercentage: number | null | undefined): boolean => {
    if (marginPercentage === null || marginPercentage === undefined) return false;
    return marginPercentage < 10;
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
      // First priority: at-risk projects go to top
      const aIsAtRisk = isProjectAtRisk(a.margin_percentage);
      const bIsAtRisk = isProjectAtRisk(b.margin_percentage);
      
      if (aIsAtRisk && !bIsAtRisk) return -1;
      if (!aIsAtRisk && bIsAtRisk) return 1;
      
      // Secondary sorting by selected criteria
      const modifier = filters.sortOrder === 'asc' ? 1 : -1;
      
      switch (filters.sortBy) {
        case 'name':
          return a.project_name.localeCompare(b.project_name) * modifier;
        case 'date':
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * modifier;
        case 'status':
          return a.status.localeCompare(b.status) * modifier;
        case 'margin':
          const aMarginPct = (a as any).currentContractAmount > 0 
            ? ((a as any).projected_margin / (a as any).currentContractAmount) * 100 
            : -999;
          const bMarginPct = (b as any).currentContractAmount > 0 
            ? ((b as any).projected_margin / (b as any).currentContractAmount) * 100 
            : -999;
          return (aMarginPct - bMarginPct) * modifier;
        default:
          return 0;
      }
    });

    return sorted;
  }, [projects, filters]);

  return (
    <div className="space-y-3">
      {/* Breadcrumb - Desktop only */}
      {!isMobile && viewMode === 'list' && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Projects</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      
      {/* Header - Matches Quotes page format */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">
            {viewMode === 'list' ? 'Projects' : 'Create New Project'}
          </h1>
          <p className="text-muted-foreground">
            {viewMode === 'list' 
              ? 'Manage construction projects and track financials' 
              : 'Fill in the project details below'}
          </p>
        </div>
        
        {viewMode === 'list' && (
          <div className="flex gap-2">
            <Button onClick={handleCreateNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        )}
      </div>

      {viewMode === 'create' && (
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Create New Project</h1>
            <p className="text-sm text-muted-foreground">
              Fill in the project details below
            </p>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {/* Header Skeleton */}
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="h-7 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-9 w-28 bg-muted animate-pulse rounded" />
                </div>
              </div>

              {/* Filters Skeleton */}
              <Card className="compact-card">
                <CardContent className="p-compact">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                  </div>
                </CardContent>
              </Card>

              {/* Table Skeleton */}
              <Card className="compact-card">
                <CardContent className="p-compact">
                  <div className="space-y-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} className="h-9 w-full bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Project Filters */}
              <ProjectFilters
                filters={filters}
                onFiltersChange={setFilters}
                resultCount={filteredAndSortedProjects.length}
                clients={clients}
                leftActions={
                  !isMobile ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDisplayMode('cards')}
                        className="h-6 px-2"
                      >
                        <Grid className={cn("h-3 w-3", displayMode === 'cards' && "text-primary")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDisplayMode('table')}
                        className="h-6 px-2"
                      >
                        <Table className={cn("h-3 w-3", displayMode === 'table' && "text-primary")} />
                      </Button>
                    </>
                  ) : undefined
                }
              />

              {/* Display Projects */}
              {(displayMode === 'cards' || isMobile) ? (
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
                  projects={filteredAndSortedProjects}
                  estimates={estimates}
                  onEdit={handleEdit}
                  onView={handleEdit}
                  onDelete={handleDelete}
                  onCreateNew={handleCreateNew}
                  isLoading={isLoading}
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
    </div>
  );
};

export default Projects;